import { useEffect, useState, useRef } from "react";
import { db, DEFAULT_KANBAN_COLUMNS, normalizeKanbanStatus } from "../../services/supabase";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  defaultDropAnimationSideEffects,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import html2pdf from "html2pdf.js";
import { format } from "date-fns";
import {
  Wrench,
  Search,
  Plus,
  X,
  Pencil,
  Check,
  GripVertical,
  MessageSquare,
  Calendar,
  User,
  Laptop,
  Printer,
  Trash2,
  Volume2,
  VolumeX,
  Clock,
  FileCheck,
  AlertTriangle,
  Sparkles,
  Tag,
} from "lucide-react";
import {
  playPickupSound,
  playHoverTickSound,
  playDropSound,
  playSuccessChime,
  isKanbanAudioMuted,
  toggleKanbanAudioMute,
} from "../../utils/kanbanAudio";

const PRIORIDADES = [
  { id: "Baixa", label: "Baixa", badge: "bg-[#5483B3]/25 text-[#C1E8FF] border-[#7DA0CA]/35" },
  { id: "Média", label: "Média", badge: "bg-sky-500/20 text-sky-300 border-sky-400/35" },
  { id: "Alta", label: "Alta", badge: "bg-amber-500/20 text-amber-300 border-amber-400/40" },
  { id: "Urgente", label: "Urgente", badge: "bg-rose-500/25 text-rose-300 border-rose-400/50 animate-pulse" },
];

function getPriorityStyle(prioridade) {
  return PRIORIDADES.find((p) => p.id === prioridade)?.badge || PRIORIDADES[1].badge;
}

function formatDateBR(dateStr) {
  if (!dateStr) return "-";
  try {
    const clean = dateStr.split("T")[0].split(" ")[0];
    return format(new Date(clean + "T00:00:00"), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
}

// ── Componente do Cartão Individual (Usado tanto na lista quanto no DragOverlay) ──
function KanbanCardView({
  card,
  client,
  columnTitle,
  totalValue,
  isOverlay = false,
  onClick,
  onWhatsApp,
  dragHandleProps = {},
}) {
  const hoje = new Date().toISOString().split("T")[0];
  const normStatus = normalizeKanbanStatus(card.status);
  const atrasada =
    card.data_entrega_prevista &&
    card.data_entrega_prevista < hoje &&
    normStatus !== "finalizado";

  const tituloPrincipal =
    card.titulo && card.titulo !== "Manutenção de Equipamento"
      ? card.titulo
      : `${card.equipamento_tipo || "Equipamento"} ${card.equipamento_marca || ""} ${card.equipamento_modelo || ""}`.trim();

  const subtituloEqp = `${card.equipamento_tipo || "Hardware"} • ${card.equipamento_marca || "Marca N/D"} ${card.equipamento_modelo || ""}`.trim();

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl p-4 transition-all duration-200 select-none cursor-pointer ${
        isOverlay
          ? "bg-gradient-to-br from-[#052659] via-[#052659] to-[#021024] border-2 border-[#C1E8FF] shadow-[0_24px_50px_rgba(2,16,36,0.9),0_0_25px_rgba(193,232,255,0.45)] scale-105 rotate-2 z-50 kanban-card-box"
          : "bg-gradient-to-br from-[#052659]/85 via-[#021024]/90 to-[#021024] border border-[#7DA0CA]/25 hover:border-[#C1E8FF]/60 hover:shadow-[0_10px_28px_rgba(5,38,89,0.65)] hover:-translate-y-0.5 kanban-card-box"
      }`}
    >
      {/* Topo do Card: Número OS + Prioridade + Handle */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#021024]/90 text-[#C1E8FF] border border-[#5483B3]/40 kanban-card-badge-os">
            {card.numero_os}
          </span>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getPriorityStyle(
              card.prioridade || "Média"
            )}`}
          >
            {card.prioridade || "Média"}
          </span>
        </div>

        <div
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          className="text-[#7DA0CA]/60 hover:text-[#C1E8FF] p-1 rounded-lg hover:bg-[#5483B3]/20 cursor-grab active:cursor-grabbing transition-colors"
          title="Arrastar cartão"
        >
          <GripVertical size={15} />
        </div>
      </div>

      {/* Título principal do Cartão */}
      <h4 className="text-sm font-bold text-white leading-snug mb-1 group-hover:text-[#C1E8FF] transition-colors line-clamp-2 kanban-card-title">
        {tituloPrincipal}
      </h4>

      {/* Subtítulo Equipamento */}
      <p className="text-[11px] text-[#7DA0CA] flex items-center gap-1.5 mb-2.5 truncate kanban-card-subtitle">
        <Laptop size={12} className="shrink-0 text-[#5483B3]" />
        <span className="truncate">{subtituloEqp}</span>
      </p>

      {/* Problema relatado resumido se houver */}
      {card.problema_relatado && (
        <p className="text-[11px] text-[#C1E8FF]/70 bg-[#021024]/60 border border-[#5483B3]/20 rounded-lg px-2.5 py-1.5 mb-3 line-clamp-2">
          {card.problema_relatado}
        </p>
      )}

      {/* Cliente + Botão WhatsApp direto */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#7DA0CA]/15">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#052659] to-[#5483B3] border border-[#C1E8FF]/30 flex items-center justify-center text-[10px] font-bold text-[#C1E8FF] shrink-0 kanban-card-client-avatar">
            {client?.nome_completo ? client.nome_completo[0].toUpperCase() : <User size={11} />}
          </div>
          <span className="text-xs font-semibold text-[#C1E8FF]/90 truncate kanban-card-client-name">
            {client ? client.nome_completo : "Sem cliente vinculado"}
          </span>
        </div>

        {client && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWhatsApp && onWhatsApp(card, client, columnTitle);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold transition-all shrink-0"
            title={`Conversar no WhatsApp com ${client.nome_completo}`}
          >
            <MessageSquare size={12} />
            <span>WhatsApp</span>
          </button>
        )}
      </div>

      {/* Rodapé do Card: Status Atual + Data Prevista + Valor */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-[#7DA0CA]/10 text-[10px]">
        <span
          className={`flex items-center gap-1 ${
            atrasada ? "text-rose-400 font-bold" : "text-[#7DA0CA]"
          }`}
        >
          <Calendar size={11} />
          {formatDateBR(card.data_entrega_prevista)}
          {atrasada && (
            <span className="bg-rose-500/20 border border-rose-400/40 text-rose-300 px-1 rounded text-[9px] uppercase">
              Atraso
            </span>
          )}
        </span>

        {totalValue > 0 ? (
          <span className="font-extrabold text-[#C1E8FF] bg-[#052659]/80 border border-[#7DA0CA]/30 px-2 py-0.5 rounded-md kanban-card-price">
            R$ {Number(totalValue).toFixed(2)}
          </span>
        ) : (
          <span className="text-[#7DA0CA]/70 italic truncate max-w-[110px]">
            {columnTitle}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Wrapper Sortable para cada Cartão ──
function SortableKanbanCard({ card, client, columnTitle, totalValue, onClick, onWhatsApp }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "Card",
      card,
      columnId: normalizeKanbanStatus(card.status),
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || "transform 220ms cubic-bezier(0.2, 0, 0, 1)",
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-[148px] rounded-2xl border-2 border-dashed border-[#C1E8FF]/50 bg-[#052659]/25 backdrop-blur-xs transition-all"
      />
    );
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
    >
      <KanbanCardView
        card={card}
        client={client}
        columnTitle={columnTitle}
        totalValue={totalValue}
        onClick={() => onClick(card)}
        onWhatsApp={onWhatsApp}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </motion.div>
  );
}

// ── Componente de Coluna (Raia) do Kanban ──
function KanbanColumn({
  column,
  cards,
  clientes,
  cardTotals,
  onCardClick,
  onWhatsApp,
  onQuickCreate,
  onRenameColumn,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
  });

  // Estado de edição do título da coluna
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(column.title);

  // Estado de criação rápida de cartão no topo da coluna (estilo Trello / image2.png)
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState("Média");
  const [quickClientId, setQuickClientId] = useState("");
  const [submittingQuick, setSubmittingQuick] = useState(false);

  const handleSaveTitle = () => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== column.title) {
      onRenameColumn(column.id, trimmed);
    } else {
      setTitleInput(column.title);
    }
    setIsEditingTitle(false);
  };

  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim() || submittingQuick) return;
    setSubmittingQuick(true);
    try {
      await onQuickCreate({
        status: column.id,
        titulo: quickTitle.trim(),
        prioridade: quickPriority,
        cliente_id: quickClientId || null,
      });
      setQuickTitle("");
      setQuickPriority("Média");
      setQuickClientId("");
      setIsAddingCard(false);
    } finally {
      setSubmittingQuick(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`w-[275px] shrink-0 flex flex-col max-h-[calc(100vh-16rem)] min-h-[480px] rounded-2xl transition-all duration-200 ${
        isOver
          ? "bg-gradient-to-b from-[#052659]/90 via-[#5483B3]/35 to-[#021024]/95 border-2 border-[#C1E8FF] shadow-[0_0_30px_rgba(193,232,255,0.25)]"
          : "bg-gradient-to-b from-[#052659]/60 via-[#021024]/85 to-[#021024]/95 border border-[#7DA0CA]/25"
      } backdrop-blur-xl kanban-col-container`}
    >
      {/* ── Cabeçalho da Coluna ── */}
      <div className="p-3.5 border-b border-[#7DA0CA]/20 flex items-center justify-between gap-2 kanban-col-header">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: column.color || "#C1E8FF" }}
          />

          {isEditingTitle ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="text"
                autoFocus
                className="w-full bg-[#021024] border border-[#C1E8FF]/60 rounded-lg px-2 py-1 text-xs font-bold text-white focus:outline-none"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") {
                    setTitleInput(column.title);
                    setIsEditingTitle(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded-lg"
                title="Salvar nome da coluna"
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0 flex-1 group/title">
              <h3
                onClick={() => {
                  setTitleInput(column.title);
                  setIsEditingTitle(true);
                }}
                className="text-xs font-extrabold uppercase tracking-wider text-white truncate cursor-pointer hover:text-[#C1E8FF] transition-colors"
                title="Clique para editar o nome da coluna"
              >
                {column.title}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setTitleInput(column.title);
                  setIsEditingTitle(true);
                }}
                className="opacity-0 group-hover/title:opacity-100 text-[#7DA0CA] hover:text-[#C1E8FF] p-0.5 rounded transition-opacity"
                title="Renomear coluna"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-[#021024]/90 text-[#C1E8FF] border border-[#7DA0CA]/30 kanban-count-pill">
            {cards.length}
          </span>
          <button
            type="button"
            onClick={() => setIsAddingCard((prev) => !prev)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-[#052659] to-[#5483B3] hover:from-[#5483B3] hover:to-[#7DA0CA] text-white text-[11px] font-bold border border-[#C1E8FF]/30 transition-all shadow-sm"
            title="Adicionar cartão no topo desta coluna"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* ── Criação Rápida no Topo da Coluna (conforme referência Trello / image2.png) ── */}
      <AnimatePresence>
        {isAddingCard && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleQuickAddSubmit}
            className="p-3 bg-[#021024]/90 border-b border-[#7DA0CA]/25 space-y-2.5 overflow-hidden"
          >
            <textarea
              rows={2}
              autoFocus
              placeholder="Título do cartão... (Ex: Notebook Dell Inspiron - Não liga)"
              className="w-full bg-[#052659]/45 border border-[#7DA0CA]/40 rounded-xl px-3 py-2 text-xs text-white placeholder-[#7DA0CA]/60 focus:outline-none focus:border-[#C1E8FF] resize-none"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuickAddSubmit(e);
                }
              }}
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                className="bg-[#021024] border border-[#7DA0CA]/30 rounded-lg px-2 py-1.5 text-[11px] text-[#C1E8FF] focus:outline-none focus:border-[#C1E8FF]"
                value={quickPriority}
                onChange={(e) => setQuickPriority(e.target.value)}
              >
                {PRIORIDADES.map((p) => (
                  <option key={p.id} value={p.id}>
                    Prioridade: {p.label}
                  </option>
                ))}
              </select>

              <select
                className="bg-[#021024] border border-[#7DA0CA]/30 rounded-lg px-2 py-1.5 text-[11px] text-[#C1E8FF] focus:outline-none focus:border-[#C1E8FF]"
                value={quickClientId}
                onChange={(e) => setQuickClientId(e.target.value)}
              >
                <option value="">Cliente (Opcional)</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_completo}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={submittingQuick || !quickTitle.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#5483B3] to-[#7DA0CA] hover:from-[#7DA0CA] hover:to-[#C1E8FF] text-[#021024] font-extrabold text-xs transition-all disabled:opacity-50 shadow-md"
              >
                {submittingQuick ? "Criando..." : "Adicionar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCard(false);
                  setQuickTitle("");
                }}
                className="p-1.5 text-[#7DA0CA] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Cancelar"
              >
                <X size={16} />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Botão rápido discreto caso o box esteja fechado */}
      {!isAddingCard && (
        <div className="px-3 pt-2.5">
          <button
            type="button"
            onClick={() => setIsAddingCard(true)}
            className="w-full py-1.5 px-3 rounded-xl border border-dashed border-[#7DA0CA]/30 hover:border-[#C1E8FF]/60 bg-[#021024]/40 hover:bg-[#052659]/50 text-[#7DA0CA] hover:text-[#C1E8FF] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all kanban-quick-add-btn"
          >
            <Plus size={14} /> Adicionar cartão
          </button>
        </div>
      )}

      {/* ── Lista de Cartões da Coluna ── */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 kanban-scrollbar min-h-[140px]">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.length === 0 ? (
            <div className="h-32 rounded-xl border border-dashed border-[#7DA0CA]/20 flex flex-col items-center justify-center text-center p-4 text-[#7DA0CA]/50 text-xs kanban-empty-dropzone">
              <span>Arraste um cartão para cá ou clique em &ldquo;+ Adicionar cartão&rdquo;</span>
            </div>
          ) : (
            cards.map((card) => {
              const client = clientes.find((c) => c.id === card.cliente_id);
              const totalValue = cardTotals[card.id] ?? Number(card.valor_total || 0);
              return (
                <SortableKanbanCard
                  key={card.id}
                  card={card}
                  client={client}
                  columnTitle={column.title}
                  totalValue={totalValue}
                  onClick={onCardClick}
                  onWhatsApp={onWhatsApp}
                />
              );
            })
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function OrdemServico() {
  const [ordens, setOrdens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [allOsItens, setAllOsItens] = useState([]);
  const [columns, setColumns] = useState(DEFAULT_KANBAN_COLUMNS);
  const [erpConfig, setErpConfig] = useState({});
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("Todas");
  const [filterAtrasadas, setFilterAtrasadas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [audioMuted, setAudioMuted] = useState(() => isKanbanAudioMuted());

  // Estado do Drag and Drop
  const [activeCard, setActiveCard] = useState(null);
  const lastOverIdRef = useRef(null);

  // Modal Completo do Cartão (Estilo Trello + PDF Embutido)
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState(null);
  const [osItens, setOsItens] = useState([]);
  const pdfRef = useRef(null);

  // Campos editáveis do Modal
  const [cardTitulo, setCardTitulo] = useState("");
  const [cardPrioridade, setCardPrioridade] = useState("Média");
  const [cardClienteId, setCardClienteId] = useState("");
  const [statusOS, setStatusOS] = useState("recebido");
  const [dataPrevista, setDataPrevista] = useState("");
  const [eqpTipo, setEqpTipo] = useState("");
  const [eqpMarca, setEqpMarca] = useState("");
  const [eqpModelo, setEqpModelo] = useState("");
  const [eqpSerie, setEqpSerie] = useState("");
  const [acessorios, setAcessorios] = useState("");
  const [problemaRelatado, setProblemaRelatado] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [obsInternas, setObsInternas] = useState("");
  const [descontoOS, setDescontoOS] = useState(0);
  const [condicoesPagamento, setCondicoesPagamento] = useState("PIX ou Cartão");

  // Adição de Peça / Serviço no Card
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [customItemNome, setCustomItemNome] = useState("");
  const [customItemTipo, setCustomItemTipo] = useState("Serviço");
  const [itemQtd, setItemQtd] = useState(1);
  const [itemPreco, setItemPreco] = useState(0);
  const [itemGarantiaDias] = useState(90);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [osRes, cliRes, prodRes, itensRes, cfgRes] = await Promise.all([
        db.ordem_servico.list(),
        db.clientes.list(),
        db.produtos.list(),
        db.os_itens.listAll(),
        db.configuracoes.get(),
      ]);

      setOrdens(osRes.data || []);
      setClientes(cliRes.data || []);
      setProdutos(prodRes.data || []);
      setAllOsItens(itensRes.data || []);

      if (cfgRes.data) {
        setErpConfig(cfgRes.data);
        if (Array.isArray(cfgRes.data.kanban_colunas) && cfgRes.data.kanban_colunas.length > 0) {
          // Mesclar mantendo os IDs padrão e aplicando títulos customizados
          const savedCols = cfgRes.data.kanban_colunas;
          const merged = DEFAULT_KANBAN_COLUMNS.map((defCol) => {
            const found = savedCols.find((c) => c.id === defCol.id);
            return found ? { ...defCol, title: found.title || defCol.title } : defCol;
          });
          setColumns(merged);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar quadro de Manutenção:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mapa de totais calculados por cartão (soma de os_itens - desconto)
  const cardTotals = {};
  for (const os of ordens) {
    const itemsForCard = allOsItens.filter((i) => i.os_id === os.id);
    const sub = itemsForCard.reduce(
      (acc, item) => acc + Number(item.valor_unitario || 0) * Number(item.quantidade || 1),
      0
    );
    const total = Math.max(0, sub - Number(os.desconto || 0));
    cardTotals[os.id] = total > 0 ? total : Number(os.valor_total || 0);
  }

  // Salvar renomeação de coluna no Supabase
  const handleRenameColumn = async (columnId, newTitle) => {
    const updatedCols = columns.map((col) =>
      col.id === columnId ? { ...col, title: newTitle } : col
    );
    setColumns(updatedCols);
    try {
      const nextCfg = { ...erpConfig, kanban_colunas: updatedCols };
      setErpConfig(nextCfg);
      await db.configuracoes.upsert(nextCfg);
    } catch (err) {
      console.error("Erro ao salvar título da coluna:", err);
    }
  };

  // Criar cartão rápido no topo da coluna
  const handleQuickCreateCard = async ({ status, titulo, prioridade, cliente_id }) => {
    try {
      const cardsInCol = ordens.filter((o) => normalizeKanbanStatus(o.status) === status);
      const minPos = cardsInCol.reduce((min, c) => Math.min(min, Number(c.posicao ?? 0)), 0);
      const { data: created } = await db.ordem_servico.createCard({
        status,
        titulo,
        prioridade,
        cliente_id,
        posicao: minPos - 1,
        equipamento_tipo: titulo,
        equipamento_marca: "A definir",
      });
      if (created) {
        playDropSound();
        setOrdens((prev) => [created, ...prev]);
      }
    } catch (err) {
      console.error(err);
      alert("Não foi possível criar o cartão de manutenção.");
    }
  };

  // Disparo de Confete ao concluir manutenção
  const triggerFinalizadoCelebration = () => {
    playSuccessChime();
    try {
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.65 },
        colors: ["#021024", "#052659", "#5483B3", "#7DA0CA", "#C1E8FF"],
      });
    } catch {
      // ignore confetti errors
    }
  };

  // ── Eventos do Drag & Drop (@dnd-kit) ──
  const handleDragStart = (event) => {
    const { active } = event;
    const found = ordens.find((o) => o.id === active.id);
    if (found) {
      setActiveCard(found);
      lastOverIdRef.current = found.id;
      playPickupSound();
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    if (lastOverIdRef.current !== overId) {
      lastOverIdRef.current = overId;
      playHoverTickSound();
    }

    const activeIndex = ordens.findIndex((o) => o.id === activeId);
    if (activeIndex === -1) return;

    const activeItem = ordens[activeIndex];
    const activeCol = normalizeKanbanStatus(activeItem.status);

    // Verificar se estamos sobre uma coluna vazia/cabeçalho ou sobre outro card
    const isOverColumn = columns.some((c) => c.id === overId);
    const overIndex = ordens.findIndex((o) => o.id === overId);
    const overCol = isOverColumn
      ? overId
      : overIndex !== -1
      ? normalizeKanbanStatus(ordens[overIndex].status)
      : null;

    if (!overCol || activeCol === overCol) return;

    // Mover otimisticamente entre colunas durante o arraste
    setOrdens((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((o) => o.id === activeId);
      if (idx === -1) return prev;
      updated[idx] = { ...updated[idx], status: overCol };
      return updated;
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    const draggedOriginal = activeCard;
    setActiveCard(null);
    lastOverIdRef.current = null;

    if (!over || !draggedOriginal) return;

    const activeId = active.id;
    const overId = over.id;

    const currentItem = ordens.find((o) => o.id === activeId);
    if (!currentItem) return;

    const isOverColumn = columns.some((c) => c.id === overId);
    const overCard = ordens.find((o) => o.id === overId);
    const targetColumnId = isOverColumn
      ? overId
      : overCard
      ? normalizeKanbanStatus(overCard.status)
      : normalizeKanbanStatus(currentItem.status);

    // Reordenar cards dentro da coluna destino
    const columnCards = ordens
      .filter((o) => normalizeKanbanStatus(o.status) === targetColumnId)
      .sort((a, b) => Number(a.posicao ?? 0) - Number(b.posicao ?? 0));

    const oldIdxInCol = columnCards.findIndex((c) => c.id === activeId);
    const newIdxInCol = overCard
      ? columnCards.findIndex((c) => c.id === overId)
      : columnCards.length - 1;

    let reorderedColCards = columnCards;
    if (oldIdxInCol !== -1 && newIdxInCol !== -1 && oldIdxInCol !== newIdxInCol) {
      reorderedColCards = arrayMove(columnCards, oldIdxInCol, newIdxInCol);
    }

    // Atualizar posições locais
    const posMap = {};
    reorderedColCards.forEach((c, idx) => {
      posMap[c.id] = idx;
    });

    setOrdens((prev) => {
      return prev.map((o) => {
        if (o.id === activeId) {
          return {
            ...o,
            status: targetColumnId,
            posicao: posMap[o.id] !== undefined ? posMap[o.id] : 0,
          };
        }
        if (posMap[o.id] !== undefined) {
          return { ...o, posicao: posMap[o.id] };
        }
        return o;
      });
    });

    const previousColumnId = normalizeKanbanStatus(draggedOriginal.status);
    if (targetColumnId === "finalizado" && previousColumnId !== "finalizado") {
      triggerFinalizadoCelebration();
    } else {
      playDropSound();
    }

    try {
      if (previousColumnId !== targetColumnId) {
        await db.ordem_servico.updateStatus(activeId, targetColumnId, null, posMap[activeId] ?? 0);
      }
      await db.ordem_servico.updatePositions(
        reorderedColCards.map((c, idx) => ({ id: c.id, status: targetColumnId, posicao: idx }))
      );
    } catch (err) {
      console.error("Erro ao sincronizar movimento do cartão:", err);
      loadData();
    }
  };

  // Enviar WhatsApp direto para o cliente do cartão
  const handleWhatsAppClient = (card, client, colTitle) => {
    if (!client || !client.telefone) {
      alert("Este cliente não possui número de WhatsApp cadastrado.");
      return;
    }
    const cleanPhone = client.telefone.replace(/\D/g, "");
    const totalVal = cardTotals[card.id] ?? Number(card.valor_total || 0);
    const titulo =
      card.titulo && card.titulo !== "Manutenção de Equipamento"
        ? card.titulo
        : `${card.equipamento_tipo || "Equipamento"} ${card.equipamento_marca || ""}`.trim();

    const msg =
      `Olá, *${client.nome_completo}*! Aqui é a equipe da *RG TECH Computadores*.\n\n` +
      `Informamos sobre a manutenção *#${card.numero_os}* (*${titulo}*):\n` +
      `📌 *Etapa atual:* ${colTitle}\n` +
      (totalVal > 0 ? `💰 *Valor Total:* R$ ${Number(totalVal).toFixed(2)}\n` : "") +
      `\nQualquer dúvida estamos à disposição!`;

    const url = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Abrir Modal Completo ao Clicar no Cartão
  const handleOpenCardModal = async (osCard) => {
    try {
      const { data } = await db.ordem_servico.get(osCard.id);
      const fullOS = data || osCard;
      const itens = fullOS.itens || allOsItens.filter((i) => i.os_id === osCard.id);

      setSelectedOS(fullOS);
      setOsItens(itens);
      setCardTitulo(
        fullOS.titulo ||
          `${fullOS.equipamento_tipo || "Equipamento"} ${fullOS.equipamento_marca || ""}`.trim()
      );
      setCardPrioridade(fullOS.prioridade || "Média");
      setCardClienteId(fullOS.cliente_id || "");
      setStatusOS(normalizeKanbanStatus(fullOS.status));
      setDataPrevista(fullOS.data_entrega_prevista || new Date().toISOString().split("T")[0]);
      setEqpTipo(fullOS.equipamento_tipo || "");
      setEqpMarca(fullOS.equipamento_marca || "");
      setEqpModelo(fullOS.equipamento_modelo || "");
      setEqpSerie(fullOS.equipamento_numero_serie || "");
      setAcessorios(fullOS.acessorios_entregues || "");
      setProblemaRelatado(fullOS.problema_relatado || "");
      setTecnico(fullOS.tecnico_responsavel || "Técnico RG TECH");
      setObsInternas(fullOS.observacoes_internas || "");
      setDescontoOS(Number(fullOS.desconto || 0));
      setCondicoesPagamento(fullOS.condicoes_pagamento || "PIX ou Cartão");

      setSelectedCatalogId("");
      setCustomItemNome("");
      setItemQtd(1);
      setItemPreco(0);
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao abrir detalhes do cartão.");
    }
  };

  // Adicionar item de catálogo ou avulso dentro do cartão
  const handleAddItemToCard = async () => {
    if (!selectedOS) return;

    let nome = customItemNome.trim();
    let tipo = customItemTipo;
    let catalogoId = null;
    let garantiaDias = Number(itemGarantiaDias || 90);

    if (selectedCatalogId) {
      const prod = produtos.find((p) => p.id === selectedCatalogId);
      if (prod) {
        nome = prod.nome;
        tipo = prod.tipo;
        catalogoId = prod.id;
        if (prod.garantia_valor && prod.garantia_unidade) {
          const v = Number(prod.garantia_valor);
          if (prod.garantia_unidade === "Anos") garantiaDias = v * 365;
          else if (prod.garantia_unidade === "Meses") garantiaDias = v * 30;
          else garantiaDias = v;
        }
      }
    }

    if (!nome) {
      alert("Selecione um item do catálogo ou digite a descrição do serviço/peça.");
      return;
    }

    const payload = {
      os_id: selectedOS.id,
      item_catalogo_id: catalogoId,
      nome,
      tipo,
      quantidade: Number(itemQtd || 1),
      valor_unitario: Number(itemPreco || 0),
      garantia_dias: garantiaDias,
      status_garantia: "ativa",
    };

    try {
      const { data } = await db.os_itens.insert(payload);
      if (data) {
        const nextItens = [...osItens, data];
        setOsItens(nextItens);
        setAllOsItens((prev) => [...prev, data]);
        setSelectedCatalogId("");
        setCustomItemNome("");
        setItemQtd(1);
        setItemPreco(0);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar item ao cartão.");
    }
  };

  const handleRemoveItemFromCard = async (itemId) => {
    try {
      await db.os_itens.delete(itemId);
      setOsItens((prev) => prev.filter((i) => i.id !== itemId));
      setAllOsItens((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error(err);
      alert("Erro ao remover item.");
    }
  };

  // Salvar todas as edições do Cartão
  const handleSaveCardModal = async (e) => {
    e.preventDefault();
    if (!selectedOS) return;

    const subtotal = osItens.reduce(
      (acc, i) => acc + Number(i.valor_unitario || 0) * Number(i.quantidade || 1),
      0
    );
    const valorTotal = Math.max(0, subtotal - Number(descontoOS || 0));

    const updates = {
      titulo: cardTitulo.trim() || `${eqpTipo} ${eqpMarca}`.trim(),
      prioridade: cardPrioridade,
      cliente_id: cardClienteId || null,
      data_entrega_prevista: dataPrevista,
      equipamento_tipo: eqpTipo || cardTitulo || "Equipamento",
      equipamento_marca: eqpMarca || "A definir",
      equipamento_modelo: eqpModelo,
      equipamento_numero_serie: eqpSerie,
      acessorios_entregues: acessorios,
      problema_relatado: problemaRelatado,
      tecnico_responsavel: tecnico,
      observacoes_internas: obsInternas,
      desconto: Number(descontoOS || 0),
      valor_total: valorTotal,
      condicoes_pagamento: condicoesPagamento,
    };

    try {
      await db.ordem_servico.update(selectedOS.id, updates);
      const prevStatusNorm = normalizeKanbanStatus(selectedOS.status);
      if (statusOS !== prevStatusNorm) {
        await db.ordem_servico.updateStatus(selectedOS.id, statusOS);
        if (statusOS === "finalizado") {
          triggerFinalizadoCelebration();
        }
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar alterações do cartão.");
    }
  };

  const handleDeleteCard = async () => {
    if (!selectedOS) return;
    if (!window.confirm(`Deseja realmente excluir o cartão ${selectedOS.numero_os}?`)) return;
    try {
      await db.ordem_servico.delete(selectedOS.id);
      setModalOpen(false);
      setOrdens((prev) => prev.filter((o) => o.id !== selectedOS.id));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir cartão.");
    }
  };

  // Gerar PDF A4 (Orçamento / Ordem de Serviço de Manutenção) direto de dentro do Card
  const handleGenerateCardPDF = () => {
    if (!selectedOS || !pdfRef.current) return;
    const cli = clientes.find((c) => c.id === cardClienteId);
    const safeName = (cli?.nome_completo || cardTitulo || "Cliente").replace(/\s+/g, "_");

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Manutencao_${selectedOS.numero_os}_${safeName}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2.5, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().from(pdfRef.current).set(opt).save();
  };

  // Filtragem de cartões
  const filteredOrdens = ordens.filter((os) => {
    const client = clientes.find((c) => c.id === os.cliente_id);
    const clientName = client ? client.nome_completo.toLowerCase() : "";
    const term = search.toLowerCase();

    const matchesSearch =
      !term ||
      (os.numero_os && os.numero_os.toLowerCase().includes(term)) ||
      (os.titulo && os.titulo.toLowerCase().includes(term)) ||
      clientName.includes(term) ||
      (os.equipamento_tipo && os.equipamento_tipo.toLowerCase().includes(term)) ||
      (os.equipamento_marca && os.equipamento_marca.toLowerCase().includes(term)) ||
      (os.equipamento_modelo && os.equipamento_modelo.toLowerCase().includes(term));

    const matchesPriority =
      filterPriority === "Todas" || (os.prioridade || "Média") === filterPriority;

    const hoje = new Date().toISOString().split("T")[0];
    const normStatus = normalizeKanbanStatus(os.status);
    const isAtrasada =
      os.data_entrega_prevista &&
      os.data_entrega_prevista < hoje &&
      normStatus !== "finalizado";

    const matchesAtrasadas = !filterAtrasadas || isAtrasada;
    return matchesSearch && matchesPriority && matchesAtrasadas;
  });

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: { opacity: "0.4" },
      },
    }),
  };

  const modalSubtotal = osItens.reduce(
    (acc, item) => acc + Number(item.valor_unitario || 0) * Number(item.quantidade || 1),
    0
  );
  const modalTotalFinal = Math.max(0, modalSubtotal - Number(descontoOS || 0));
  const modalClient = clientes.find((c) => c.id === cardClienteId);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ── Barra Superior do Quadro Kanban de Manutenção ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass p-5 rounded-2xl border border-[#7DA0CA]/25">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#052659] via-[#5483B3] to-[#7DA0CA] border border-[#C1E8FF]/40 flex items-center justify-center shadow-lg">
              <Wrench size={22} className="text-[#C1E8FF]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Manutenção
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#052659] text-[#C1E8FF] border border-[#7DA0CA]/30">
                  Kanban Interativo
                </span>
              </h1>
              <p className="text-[#7DA0CA] text-xs md:text-sm">
                Arraste os cartões entre as colunas para atualizar o status automaticamente. Clique no título da coluna para renomear.
              </p>
            </div>
          </div>
        </div>

        {/* Busca, Filtro de Prioridade, Atrasadas e Som */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[230px] flex-1 sm:flex-initial">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7DA0CA]" />
            <input
              type="text"
              placeholder="Buscar cartão, cliente, OS..."
              className="w-full bg-[#021024]/80 border border-[#7DA0CA]/30 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#7DA0CA]/60 focus:outline-none focus:border-[#C1E8FF] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="bg-[#021024]/90 border border-[#7DA0CA]/30 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#C1E8FF] focus:outline-none focus:border-[#C1E8FF]"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="Todas">Todas Prioridades</option>
            {PRIORIDADES.map((p) => (
              <option key={p.id} value={p.id}>
                Prioridade {p.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer bg-[#021024]/80 hover:bg-[#052659]/60 border border-[#7DA0CA]/30 rounded-xl px-3.5 py-2.5 text-xs text-white transition-all select-none">
            <input
              type="checkbox"
              checked={filterAtrasadas}
              onChange={(e) => setFilterAtrasadas(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[#7DA0CA]/40 bg-[#021024] text-[#5483B3]"
            />
            <span className="flex items-center gap-1 font-bold text-rose-300 uppercase tracking-tight">
              <Clock size={13} /> Atrasadas
            </span>
          </label>

          <button
            type="button"
            onClick={() => setAudioMuted(toggleKanbanAudioMute())}
            className={`p-2.5 rounded-xl border transition-all ${
              audioMuted
                ? "bg-[#021024]/80 border-[#7DA0CA]/20 text-[#7DA0CA]/60"
                : "bg-gradient-to-r from-[#052659] to-[#5483B3]/70 border-[#C1E8FF]/40 text-[#C1E8FF]"
            }`}
            title={audioMuted ? "Ativar sons do Kanban" : "Silenciar sons do Kanban"}
          >
            {audioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* ── Quadro Kanban Horizontal (6 Colunas) ── */}
      {loading ? (
        <div className="glass p-12 rounded-2xl text-center text-[#C1E8FF] flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-[#5483B3] border-t-[#C1E8FF] rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest font-bold text-[#7DA0CA]">
            Carregando quadro de manutenção...
          </span>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4 pt-1 kanban-scrollbar items-start w-full">
            {columns.map((col) => {
              const colCards = filteredOrdens
                .filter((o) => normalizeKanbanStatus(o.status) === col.id)
                .sort((a, b) => Number(a.posicao ?? 0) - Number(b.posicao ?? 0));

              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  cards={colCards}
                  clientes={clientes}
                  cardTotals={cardTotals}
                  onCardClick={handleOpenCardModal}
                  onWhatsApp={handleWhatsAppClient}
                  onQuickCreate={handleQuickCreateCard}
                  onRenameColumn={handleRenameColumn}
                />
              );
            })}
          </div>

          <DragOverlay dropAnimation={dropAnimation}>
            {activeCard ? (
              <div className="w-[275px]">
                <KanbanCardView
                  card={activeCard}
                  client={clientes.find((c) => c.id === activeCard.cliente_id)}
                  columnTitle={
                    columns.find((c) => c.id === normalizeKanbanStatus(activeCard.status))?.title ||
                    ""
                  }
                  totalValue={cardTotals[activeCard.id] ?? Number(activeCard.valor_total || 0)}
                  isOverlay
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── MODAL COMPLETO ESTILO TRELLO + GERADOR DE PDF EMBUTIDO ── */}
      {modalOpen && selectedOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#021024]/80 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setModalOpen(false)}
          />

          <div className="w-full max-w-4xl max-h-[92vh] rounded-3xl bg-gradient-to-b from-[#052659] via-[#021024] to-[#021024] border border-[#7DA0CA]/35 shadow-[0_25px_70px_rgba(2,16,36,0.95)] flex flex-col overflow-hidden">
            {/* Cabeçalho do Modal */}
            <div className="p-6 border-b border-[#7DA0CA]/20 flex flex-wrap items-center justify-between gap-4 bg-[#021024]/60">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#052659] to-[#5483B3] border border-[#C1E8FF]/40 flex items-center justify-center shrink-0">
                  <Wrench className="text-[#C1E8FF]" size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-[#052659] text-[#C1E8FF] border border-[#7DA0CA]/30">
                      {selectedOS.numero_os}
                    </span>
                    <span className="text-xs text-[#7DA0CA]">
                      Aberto em {formatDateBR(selectedOS.data_abertura)}
                    </span>
                  </div>
                  <input
                    type="text"
                    className="w-full mt-1 bg-transparent text-lg md:text-xl font-extrabold text-white border-b border-transparent focus:border-[#C1E8FF] focus:outline-none"
                    value={cardTitulo}
                    onChange={(e) => setCardTitulo(e.target.value)}
                    placeholder="Título do cartão de manutenção..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateCardPDF}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#052659] via-[#5483B3] to-[#7DA0CA] hover:from-[#5483B3] hover:to-[#C1E8FF] hover:text-[#021024] text-white font-bold text-xs border border-[#C1E8FF]/40 shadow-lg transition-all"
                >
                  <Printer size={15} /> Gerar PDF (Orçamento / OS)
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCard}
                  className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 transition-all"
                  title="Excluir cartão"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#C1E8FF] transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Corpo do Modal */}
            <form onSubmit={handleSaveCardModal} className="flex-1 overflow-y-auto p-6 space-y-6 kanban-scrollbar">
              {/* Linha 1: Status (Coluna), Prioridade, Cliente e Previsão */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#052659]/30 p-4 rounded-2xl border border-[#7DA0CA]/20">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7DA0CA] mb-1">
                    Coluna / Status Atual
                  </label>
                  <select
                    className="w-full bg-[#021024] border border-[#7DA0CA]/35 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#C1E8FF]"
                    value={statusOS}
                    onChange={(e) => setStatusOS(e.target.value)}
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7DA0CA] mb-1">
                    Prioridade
                  </label>
                  <select
                    className="w-full bg-[#021024] border border-[#7DA0CA]/35 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#C1E8FF]"
                    value={cardPrioridade}
                    onChange={(e) => setCardPrioridade(e.target.value)}
                  >
                    {PRIORIDADES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7DA0CA] mb-1">
                    Cliente Vinculado
                  </label>
                  <select
                    className="w-full bg-[#021024] border border-[#7DA0CA]/35 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#C1E8FF]"
                    value={cardClienteId}
                    onChange={(e) => setCardClienteId(e.target.value)}
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome_completo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7DA0CA] mb-1">
                    Previsão de Entrega
                  </label>
                  <input
                    type="date"
                    className="w-full bg-[#021024] border border-[#7DA0CA]/35 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#C1E8FF]"
                    value={dataPrevista}
                    onChange={(e) => setDataPrevista(e.target.value)}
                  />
                </div>
              </div>

              {/* Atalho WhatsApp do Cliente dentro do Modal */}
              {modalClient && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#052659]/40 border border-[#7DA0CA]/25">
                  <div className="text-xs text-[#C1E8FF] space-x-3">
                    <span>
                      <strong>Cliente:</strong> {modalClient.nome_completo}
                    </span>
                    <span>
                      <strong>Tel:</strong> {modalClient.telefone || "N/D"}
                    </span>
                    <span>
                      <strong>CPF/CNPJ:</strong> {modalClient.cpf_cnpj || "N/D"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleWhatsAppClient(
                        { ...selectedOS, titulo: cardTitulo, valor_total: modalTotalFinal },
                        modalClient,
                        columns.find((c) => c.id === statusOS)?.title || statusOS
                      )
                    }
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-300 text-xs font-bold transition-all"
                  >
                    <MessageSquare size={14} /> Chamar Cliente no WhatsApp
                  </button>
                </div>
              )}

              {/* Linha 2: Dados do Equipamento & Problema/Diagnóstico */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#052659]/25 p-5 rounded-2xl border border-[#7DA0CA]/20 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#C1E8FF] flex items-center gap-2 border-b border-[#7DA0CA]/15 pb-2">
                    <Laptop size={15} /> Dados do Equipamento
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                        Tipo (Notebook, PC Gamer...)
                      </label>
                      <input
                        type="text"
                        className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1E8FF]"
                        value={eqpTipo}
                        onChange={(e) => setEqpTipo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1E8FF]"
                        value={eqpMarca}
                        onChange={(e) => setEqpMarca(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                        Modelo
                      </label>
                      <input
                        type="text"
                        className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1E8FF]"
                        value={eqpModelo}
                        onChange={(e) => setEqpModelo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                        Nº de Série
                      </label>
                      <input
                        type="text"
                        className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1E8FF]"
                        value={eqpSerie}
                        onChange={(e) => setEqpSerie(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                      Acessórios Entregues (Fonte, cabo, mochila...)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1E8FF]"
                      value={acessorios}
                      onChange={(e) => setAcessorios(e.target.value)}
                      placeholder="Ex: Carregador original"
                    />
                  </div>
                </div>

                <div className="bg-[#052659]/25 p-5 rounded-2xl border border-[#7DA0CA]/20 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#C1E8FF] flex items-center gap-2 border-b border-[#7DA0CA]/15 pb-2">
                    <Sparkles size={15} /> Defeito Relatado & Laudo Técnico
                  </h4>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                      Problema Relatado / Diagnóstico (Sai no PDF)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1E8FF]"
                      placeholder="Descreva o sintoma relatado pelo cliente e o diagnóstico técnico..."
                      value={problemaRelatado}
                      onChange={(e) => setProblemaRelatado(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                        Técnico Responsável
                      </label>
                      <input
                        type="text"
                        className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1E8FF]"
                        value={tecnico}
                        onChange={(e) => setTecnico(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                        Condições de Pagamento
                      </label>
                      <input
                        type="text"
                        className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1E8FF]"
                        value={condicoesPagamento}
                        onChange={(e) => setCondicoesPagamento(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                      Anotações Internas de Bancada
                    </label>
                    <textarea
                      rows={2}
                      className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1E8FF]"
                      placeholder="Observações internas do laboratório..."
                      value={obsInternas}
                      onChange={(e) => setObsInternas(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Linha 3: Peças & Serviços do Orçamento/Manutenção */}
              <div className="bg-[#052659]/25 p-5 rounded-2xl border border-[#7DA0CA]/20 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#7DA0CA]/15 pb-2.5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#C1E8FF] flex items-center gap-2">
                    <FileCheck size={16} /> Peças e Serviços da Manutenção / Orçamento
                  </h4>
                  <span className="text-[11px] text-[#7DA0CA]">
                    Estes itens compõem o valor do cartão e o documento PDF
                  </span>
                </div>

                {/* Barra de Adição de Item */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end bg-[#021024]/70 p-3.5 rounded-xl border border-[#7DA0CA]/20">
                  <div className="md:col-span-4">
                    <label className="block text-[9px] font-bold uppercase text-[#7DA0CA] mb-1">
                      1. Escolher do Catálogo (Opcional)
                    </label>
                    <select
                      className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-lg px-2.5 py-2 text-xs text-white"
                      value={selectedCatalogId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCatalogId(val);
                        const p = produtos.find((item) => item.id === val);
                        if (p) {
                          setCustomItemNome(p.nome);
                          setCustomItemTipo(p.tipo);
                          setItemPreco(Number(p.preco || 0));
                        }
                      }}
                    >
                      <option value="">-- Item Manual / Avulso --</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.tipo}] {p.nome} - R$ {Number(p.preco || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[9px] font-bold uppercase text-[#7DA0CA] mb-1">
                      Descrição do Serviço / Peça
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Formatação + Backup"
                      className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-lg px-2.5 py-2 text-xs text-white"
                      value={customItemNome}
                      onChange={(e) => setCustomItemNome(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[9px] font-bold uppercase text-[#7DA0CA] mb-1">
                      Qtd
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-lg px-2 py-2 text-xs text-white"
                      value={itemQtd}
                      onChange={(e) => setItemQtd(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-bold uppercase text-[#7DA0CA] mb-1">
                      Valor Unit. (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-[#021024] border border-[#7DA0CA]/30 rounded-lg px-2.5 py-2 text-xs text-white"
                      value={itemPreco}
                      onChange={(e) => setItemPreco(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItemToCard}
                      className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#5483B3] to-[#7DA0CA] hover:from-[#7DA0CA] hover:to-[#C1E8FF] text-[#021024] font-extrabold text-xs transition-all"
                    >
                      + Incluir Item
                    </button>
                  </div>
                </div>

                {/* Lista de Itens Inclusos */}
                {osItens.length === 0 ? (
                  <p className="text-xs text-[#7DA0CA]/60 italic text-center py-4">
                    Nenhuma peça ou serviço adicionado a este cartão ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {osItens.map((item, idx) => {
                      const nomeExibicao =
                        item.nome ||
                        produtos.find((p) => p.id === item.item_catalogo_id)?.nome ||
                        "Serviço / Peça";
                      const subItem = Number(item.valor_unitario || 0) * Number(item.quantidade || 1);

                      return (
                        <div
                          key={item.id || idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#021024]/70 border border-[#7DA0CA]/20"
                        >
                          <div>
                            <span className="text-xs font-bold text-white">{nomeExibicao}</span>
                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-[#052659] text-[#C1E8FF] border border-[#7DA0CA]/30">
                              {item.tipo}
                            </span>
                            <p className="text-[11px] text-[#7DA0CA] mt-0.5">
                              {item.quantidade}x R$ {Number(item.valor_unitario || 0).toFixed(2)} • Garantia:{" "}
                              {item.garantia_dias || 90} dias
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-extrabold text-[#C1E8FF]">
                              R$ {subItem.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromCard(item.id)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/15 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Resumo Financeiro do Cartão */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4 pt-3 border-t border-[#7DA0CA]/20">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-[#7DA0CA]">Desconto (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-28 bg-[#021024] border border-[#7DA0CA]/30 rounded-lg px-3 py-1.5 text-xs text-white text-right"
                      value={descontoOS}
                      onChange={(e) => setDescontoOS(e.target.value)}
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#7DA0CA] mr-3">
                      Subtotal: R$ {modalSubtotal.toFixed(2)}
                    </span>
                    <span className="text-base font-extrabold text-[#C1E8FF]">
                      Total Final: R$ {modalTotalFinal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rodapé do Modal */}
              <div className="flex justify-end gap-3 pt-2 border-t border-[#7DA0CA]/20">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#7DA0CA]/30 text-[#C1E8FF] text-xs font-bold hover:bg-white/5"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#052659] via-[#5483B3] to-[#7DA0CA] hover:from-[#5483B3] hover:to-[#C1E8FF] hover:text-[#021024] text-white font-extrabold text-xs border border-[#C1E8FF]/40 shadow-lg transition-all"
                >
                  Salvar Cartão de Manutenção
                </button>
              </div>
            </form>
          </div>

          {/* ── TEMPLATE A4 OCULTO PARA IMPRESSÃO / PDF DO CARTÃO DE MANUTENÇÃO ── */}
          <div
            style={{
              position: "absolute",
              top: "-9999px",
              left: "-9999px",
              width: "794px",
              backgroundColor: "#ffffff",
              color: "#000000",
            }}
          >
            <div
              ref={pdfRef}
              style={{
                padding: "30px 40px",
                fontFamily: "Arial, sans-serif",
                fontSize: "11.5px",
                lineHeight: "1.6",
                color: "#1e293b",
              }}
            >
              {/* Cabeçalho PDF */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "3px solid #052659",
                  paddingBottom: "12px",
                  marginBottom: "20px",
                }}
              >
                <img
                  src="/logo_dark.png"
                  alt="RG TECH"
                  style={{ maxHeight: "75px", maxWidth: "220px", objectFit: "contain" }}
                />
                <div style={{ textAlign: "right", fontSize: "11px" }}>
                  <h2 style={{ margin: 0, color: "#052659", fontSize: "16px", fontWeight: "bold" }}>
                    RG TECH Computadores
                  </h2>
                  <p style={{ margin: "3px 0 0 0", color: "#5483B3", fontWeight: "bold" }}>
                    ⚡ Assistência Técnica & Soluções em TI
                  </p>
                  <p style={{ margin: "2px 0 0 0" }}>
                    <strong>WhatsApp:</strong> (66) 9 9929-8666
                  </p>
                  <p style={{ margin: "1px 0 0 0" }}>
                    <strong>E-mail:</strong> rgtechpc@gmail.com
                  </p>
                </div>
              </div>

              {/* Título Documento */}
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "17px",
                    color: "#021024",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Orçamento / Ordem de Manutenção #{selectedOS.numero_os}
                </h1>
                <p style={{ margin: "4px 0 0 0", color: "#475569", fontSize: "11.5px" }}>
                  <strong>Etapa:</strong>{" "}
                  {columns.find((c) => c.id === statusOS)?.title || statusOS} |{" "}
                  <strong>Abertura:</strong> {formatDateBR(selectedOS.data_abertura)} |{" "}
                  <strong>Previsão:</strong> {formatDateBR(dataPrevista)}
                </p>
              </div>

              {/* Cliente e Equipamento */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 6px 0",
                      fontSize: "12px",
                      color: "#052659",
                      borderBottom: "1px solid #cbd5e1",
                      paddingBottom: "4px",
                      fontWeight: "bold",
                    }}
                  >
                    Dados do Cliente
                  </h3>
                  <p style={{ margin: "0 0 4px 0" }}>
                    <strong>Nome:</strong> {modalClient?.nome_completo || "Não informado"}
                  </p>
                  <p style={{ margin: "0 0 4px 0" }}>
                    <strong>CPF/CNPJ:</strong> {modalClient?.cpf_cnpj || "N/A"}
                  </p>
                  <p style={{ margin: "0 0 4px 0" }}>
                    <strong>WhatsApp:</strong> {modalClient?.telefone || "N/A"}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Endereço:</strong>{" "}
                    {[modalClient?.endereco, modalClient?.bairro, modalClient?.cidade]
                      .filter(Boolean)
                      .join(", ") || "N/A"}
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 6px 0",
                      fontSize: "12px",
                      color: "#052659",
                      borderBottom: "1px solid #cbd5e1",
                      paddingBottom: "4px",
                      fontWeight: "bold",
                    }}
                  >
                    Equipamento & Diagnóstico
                  </h3>
                  <p style={{ margin: "0 0 4px 0" }}>
                    <strong>Identificação:</strong> {cardTitulo}
                  </p>
                  <p style={{ margin: "0 0 4px 0" }}>
                    <strong>Marca / Modelo:</strong> {eqpMarca} {eqpModelo} (S/N: {eqpSerie || "N/A"})
                  </p>
                  <p style={{ margin: "0 0 4px 0" }}>
                    <strong>Acessórios:</strong> {acessorios || "Nenhum"}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Diagnóstico / Defeito:</strong> {problemaRelatado || "Em avaliação técnica"}
                  </p>
                </div>
              </div>

              {/* Tabela de Itens */}
              <h3 style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#052659", fontWeight: "bold" }}>
                Peças e Serviços Discriminados
              </h3>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: "20px",
                  fontSize: "11px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#052659", color: "#ffffff" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", border: "1px solid #cbd5e1" }}>
                      Descrição da Peça ou Serviço
                    </th>
                    <th style={{ padding: "8px 12px", textAlign: "center", width: "55px", border: "1px solid #cbd5e1" }}>
                      Qtd
                    </th>
                    <th style={{ padding: "8px 12px", textAlign: "right", width: "105px", border: "1px solid #cbd5e1" }}>
                      Valor Unit.
                    </th>
                    <th style={{ padding: "8px 12px", textAlign: "right", width: "90px", border: "1px solid #cbd5e1" }}>
                      Garantia
                    </th>
                    <th style={{ padding: "8px 12px", textAlign: "right", width: "105px", border: "1px solid #cbd5e1" }}>
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {osItens.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "12px", textAlign: "center", border: "1px solid #cbd5e1" }}>
                        Serviço em fase de diagnóstico / sem itens lançados.
                      </td>
                    </tr>
                  ) : (
                    osItens.map((item, idx) => {
                      const nomeExib =
                        item.nome ||
                        produtos.find((p) => p.id === item.item_catalogo_id)?.nome ||
                        "Serviço / Peça";
                      const sub = Number(item.valor_unitario || 0) * Number(item.quantidade || 1);
                      return (
                        <tr
                          key={idx}
                          style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}
                        >
                          <td style={{ padding: "8px 12px", border: "1px solid #cbd5e1" }}>{nomeExib}</td>
                          <td style={{ padding: "8px 12px", textAlign: "center", border: "1px solid #cbd5e1" }}>
                            {item.quantidade}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", border: "1px solid #cbd5e1" }}>
                            R$ {Number(item.valor_unitario || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", border: "1px solid #cbd5e1" }}>
                            {item.garantia_dias || 90} dias
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              textAlign: "right",
                              border: "1px solid #cbd5e1",
                              fontWeight: "bold",
                            }}
                          >
                            R$ {sub.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Totais */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
                <table style={{ width: "250px", borderCollapse: "collapse", fontSize: "11px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: "bold" }}>Subtotal:</td>
                      <td style={{ padding: "5px 8px", textAlign: "right" }}>R$ {modalSubtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: "bold", color: "#059669" }}>
                        Desconto:
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right", color: "#059669", fontWeight: "bold" }}>
                        - R$ {Number(descontoOS || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: "#052659", color: "#ffffff" }}>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "bold", fontSize: "12px" }}>
                        Valor Total:
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "bold", fontSize: "12px" }}>
                        R$ {modalTotalFinal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Condições e Assinaturas */}
              <div style={{ borderTop: "2px solid #052659", paddingTop: "12px", fontSize: "10.5px" }}>
                <p style={{ margin: "0 0 6px 0" }}>
                  <strong>Forma de Pagamento:</strong> {condicoesPagamento} |{" "}
                  <strong>Técnico Responsável:</strong> {tecnico}
                </p>
                <p style={{ margin: 0, fontSize: "9.5px", color: "#475569", textAlign: "justify" }}>
                  Serviços prestados contam com garantia legal a partir da entrega do equipamento. Ao aprovar este orçamento (presencialmente ou via WhatsApp), o cliente autoriza a execução dos serviços acima discriminados.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "45px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    width: "240px",
                    borderTop: "1px solid #94a3b8",
                    textAlign: "center",
                    paddingTop: "6px",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "10px", fontWeight: "bold" }}>RG TECH Computadores</p>
                  <p style={{ margin: "2px 0 0 0", fontSize: "9px", color: "#64748b" }}>Responsável Técnico</p>
                </div>
                <div
                  style={{
                    width: "240px",
                    borderTop: "1px solid #94a3b8",
                    textAlign: "center",
                    paddingTop: "6px",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "10px", fontWeight: "bold" }}>
                    {modalClient?.nome_completo || "Assinatura do Cliente"}
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontSize: "9px", color: "#64748b" }}>Cliente / Aprovação</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
