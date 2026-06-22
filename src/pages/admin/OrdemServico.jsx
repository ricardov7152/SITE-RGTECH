import { useEffect, useState } from "react";
import { db } from "../../services/supabase";
import { 
  Wrench, 
  Search, 
  Trash2, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  FileText, 
  Laptop, 
  Calendar, 
  Plus, 
  Info,
  CalendarDays,
  FileCheck
} from "lucide-react";
import { format } from "date-fns";

export default function OrdemServico() {
  const [ordens, setOrdens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterAtrasadas, setFilterAtrasadas] = useState(false);
  const [loading, setLoading] = useState(true);

  // Drawer / Detalhes da OS
  const [fichaOpen, setFichaOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState(null);
  const [osItens, setOsItens] = useState([]);

  // Campos Editáveis da OS (no Drawer)
  const [eqpTipo, setEqpTipo] = useState("");
  const [eqpMarca, setEqpMarca] = useState("");
  const [eqpModelo, setEqpModelo] = useState("");
  const [eqpSerie, setEqpSerie] = useState("");
  const [acessorios, setAcessorios] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [statusOS, setStatusOS] = useState("");
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [obsInternas, setObsInternas] = useState("");

  // Adição de Item Extra na OS
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemQtd, setItemQtd] = useState(1);
  const [itemPreco, setItemPreco] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: osData } = await db.ordem_servico.list();
      const { data: cliData } = await db.clientes.list();
      const { data: prodData } = await db.produtos.list();
      setOrdens(osData || []);
      setClientes(cliData || []);
      setProdutos(prodData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenFicha = async (os) => {
    setLoading(true);
    try {
      const { data } = await db.ordem_servico.get(os.id);
      if (data) {
        setSelectedOS(data);
        setOsItens(data.itens || []);
        
        // Inicializar campos do form
        setEqpTipo(data.equipamento_tipo || "");
        setEqpMarca(data.equipamento_marca || "");
        setEqpModelo(data.equipamento_modelo || "");
        setEqpSerie(data.equipamento_numero_serie || "");
        setAcessorios(data.acessorios_entregues || "");
        setTecnico(data.tecnico_responsavel || "");
        setStatusOS(data.status || "recebido");
        setMotivoCancelamento(data.motivo_cancelamento || "");
        setObsInternas(data.observacoes_internas || "");
        
        setShowAddItem(false);
        setSelectedItemId("");
        setItemQtd(1);
        setItemPreco(0);
        
        setFichaOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar detalhes da Ordem de Serviço.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOS = async (e) => {
    e.preventDefault();
    if (!selectedOS) return;

    if (statusOS === "cancelado" && !motivoCancelamento.trim()) {
      alert("Por favor, informe o motivo do cancelamento da OS.");
      return;
    }

    const payload = {
      equipamento_tipo: eqpTipo,
      equipamento_marca: eqpMarca,
      equipamento_modelo: eqpModelo,
      equipamento_numero_serie: eqpSerie,
      acessorios_entregues: acessorios,
      tecnico_responsavel: tecnico,
      observacoes_internas: obsInternas
    };

    try {
      // 1. Atualizar campos cadastrais
      await db.ordem_servico.update(selectedOS.id, payload);
      
      // 2. Se status mudou, rodar lógica de status (incluindo gatilhos de baixa, conciliação e garantia)
      if (statusOS !== selectedOS.status) {
        await db.ordem_servico.updateStatus(selectedOS.id, statusOS, motivoCancelamento);
      }

      setFichaOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar alterações da OS.");
    }
  };

  // Adicionar item extra
  const handleAddItemExtra = async () => {
    if (!selectedItemId) return;
    const prod = produtos.find(p => p.id === selectedItemId);
    if (!prod) return;

    // Calcular dias garantia
    let garantiaDias = 30;
    if (prod.garantia_valor && prod.garantia_unidade) {
      const valor = Number(prod.garantia_valor);
      if (prod.garantia_unidade === "Anos") garantiaDias = valor * 365;
      else if (prod.garantia_unidade === "Meses") garantiaDias = valor * 30;
      else garantiaDias = valor;
    }

    const newItem = {
      os_id: selectedOS.id,
      item_catalogo_id: prod.id,
      tipo: prod.tipo,
      quantidade: Number(itemQtd),
      valor_unitario: Number(itemPreco),
      garantia_dias: garantiaDias,
      status_garantia: 'ativa'
    };

    try {
      const { data } = await db.os_itens.insert(newItem);
      if (data) {
        setOsItens([...osItens, data]);
        setShowAddItem(false);
        setSelectedItemId("");
        setItemQtd(1);
        setItemPreco(0);
        
        // Se status da OS atual for 'em_execucao' ou 'entregue', dar baixa imediata de estoque do item extra
        if (selectedOS.status === "em_execucao" || selectedOS.status === "entregue") {
          if (prod.tipo === "Peça") {
            const novaQtd = Math.max(0, (prod.estoque_atual || 0) - Number(itemQtd));
            await db.produtos.update(prod.id, { estoque_atual: novaQtd });
            // Recarregar lista de produtos para atualizar estado
            const { data: updatedProds } = await db.produtos.list();
            setProdutos(updatedProds || []);
          }
        }
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao adicionar item à OS.");
    }
  };

  const handleRemoveItem = async (itemId, itemType, itemCatId, itemQtd) => {
    if (!window.confirm("Deseja realmente remover este item da OS?")) return;
    try {
      await db.os_itens.delete(itemId);
      setOsItens(osItens.filter(oi => oi.id !== itemId));

      // Estornar estoque se a OS já estiver 'em_execucao' ou 'entregue'
      if (selectedOS.status === "em_execucao" || selectedOS.status === "entregue") {
        if (itemType === "Peça" && itemCatId) {
          const prod = produtos.find(p => p.id === itemCatId);
          if (prod) {
            const novaQtd = (prod.estoque_atual || 0) + Number(itemQtd);
            await db.produtos.update(prod.id, { estoque_atual: novaQtd });
            const { data: updatedProds } = await db.produtos.list();
            setProdutos(updatedProds || []);
          }
        }
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao remover item.");
    }
  };

  // Filtragem e pesquisa
  const filteredOS = ordens.filter(os => {
    const client = clientes.find(c => c.id === os.cliente_id);
    const clientName = client ? client.nome_completo : "";
    
    const matchesSearch = 
      os.numero_os.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase()) ||
      (os.equipamento_tipo && os.equipamento_tipo.toLowerCase().includes(search.toLowerCase())) ||
      (os.equipamento_marca && os.equipamento_marca.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = filterStatus === "Todos" || os.status === filterStatus;

    // Filtro atrasado: data_entrega_prevista < hoje E status ≠ entregue E status ≠ cancelado
    const hoje = new Date().toISOString().split("T")[0];
    const isAtrasada = os.data_entrega_prevista < hoje && os.status !== "entregue" && os.status !== "cancelado";
    const matchesAtrasadas = !filterAtrasadas || isAtrasada;

    return matchesSearch && matchesStatus && matchesAtrasadas;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "recebido":
      case "em_diagnostico":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/25";
      case "aguardando_peca":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/25";
      case "em_execucao":
        return "bg-[#4A47FF]/10 text-blue-300 border border-[#4A47FF]/25";
      case "pronto_retirada":
        return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25";
      case "entregue":
        return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
      case "cancelado":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/25";
      default:
        return "bg-slate-500/10 text-slate-400 border border-slate-500/25";
    }
  };

  const formatStatusText = (status) => {
    switch (status) {
      case "recebido": return "Recebido";
      case "em_diagnostico": return "Em Diagnóstico";
      case "aguardando_peca": return "Aguardando Peça";
      case "em_execucao": return "Em Execução";
      case "pronto_retirada": return "Pronto p/ Retirada";
      case "entregue": return "Entregue / Fechado";
      case "cancelado": return "Cancelado";
      default: return status;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Wrench size={28} className="text-[#4A47FF]" /> Ordens de Serviço
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gerenciamento e execução física de manutenções e reparos</p>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
        {/* Filtros e Busca */}
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por nº da OS, cliente ou equipamento..."
              className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center">
            <select 
              className="bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="Todos">Todos os Status</option>
              <option value="recebido">Recebido</option>
              <option value="em_diagnostico">Em Diagnóstico</option>
              <option value="aguardando_peca">Aguardando Peça</option>
              <option value="em_execucao">Em Execução</option>
              <option value="pronto_retirada">Pronto para Retirada</option>
              <option value="entregue">Entregue</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <label className="flex items-center gap-2 cursor-pointer bg-white/2 hover:bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white transition-all select-none">
              <input 
                type="checkbox"
                checked={filterAtrasadas}
                onChange={(e) => setFilterAtrasadas(e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-[#0d0d0d] text-[#4a47ff] focus:ring-[#4a47ff]"
              />
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-tight">
                <Clock size={14} /> Atrasadas
              </span>
            </label>
          </div>
        </div>

        {/* Tabela de OS */}
        {loading ? (
          <div className="text-center text-slate-500 py-12">Carregando ordens de serviço...</div>
        ) : filteredOS.length === 0 ? (
          <div className="text-center text-slate-500 py-12">Nenhuma Ordem de Serviço encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 font-bold uppercase">
                  <th className="pb-3 pt-1">Número OS</th>
                  <th className="pb-3 pt-1">Cliente</th>
                  <th className="pb-3 pt-1">Equipamento</th>
                  <th className="pb-3 pt-1">Status</th>
                  <th className="pb-3 pt-1">Abertura</th>
                  <th className="pb-3 pt-1">Previsão de Entrega</th>
                  <th className="pb-3 pt-1 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOS.map((os) => {
                  const client = clientes.find(c => c.id === os.cliente_id);
                  const hoje = new Date().toISOString().split("T")[0];
                  const atrasada = os.data_entrega_prevista < hoje && os.status !== "entregue" && os.status !== "cancelado";

                  return (
                    <tr key={os.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3.5 font-bold text-white tracking-wider text-xs">
                        {os.numero_os}
                      </td>
                      <td className="py-3.5">
                        <span className="font-semibold text-slate-200">{client ? client.nome_completo : "Cliente Indefinido"}</span>
                      </td>
                      <td className="py-3.5 text-xs">
                        <span className="text-slate-300 font-medium">{os.equipamento_tipo}</span>
                        <span className="text-slate-500 block">{os.equipamento_marca} {os.equipamento_modelo}</span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(os.status)}`}>
                          {formatStatusText(os.status)}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-slate-400">
                        {os.data_abertura ? format(new Date(os.data_abertura + "T00:00:00"), "dd/MM/yyyy") : "-"}
                      </td>
                      <td className="py-3.5 text-xs">
                        <span className={`flex items-center gap-1.5 ${atrasada ? "text-rose-400 font-bold animate-pulse" : "text-slate-300"}`}>
                          <Calendar size={13} />
                          {os.data_entrega_prevista ? format(new Date(os.data_entrega_prevista + "T00:00:00"), "dd/MM/yyyy") : "-"}
                          {atrasada && <span className="text-[9px] uppercase tracking-tighter bg-rose-500/10 px-1 border border-rose-500/25 rounded">Atrasado</span>}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button 
                          onClick={() => handleOpenFicha(os)}
                          className="px-3.5 py-1.5 bg-[#2d2b7a]/40 hover:bg-[#4a47ff] border border-[#4a47ff]/20 hover:border-[#4a47ff]/50 rounded-xl text-xs font-bold text-white transition-all shadow-md"
                        >
                          Ver Detalhes / Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SLIDING DRAWER / DETALHES & EDIÇÃO DA OS ── */}
      {fichaOpen && selectedOS && (() => {
        const client = clientes.find(c => c.id === selectedOS.cliente_id);
        const subtotal = osItens.reduce((sum, item) => sum + (Number(item.valor_unitario) * Number(item.quantidade)), 0);

        return (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-fadeIn">
            {/* Backdrop click to close */}
            <div className="absolute inset-0 -z-10" onClick={() => setFichaOpen(false)} />
            
            {/* Panel */}
            <div className="glass w-full max-w-2xl h-full shadow-2xl flex flex-col bg-[#0D0D0D] border-l border-white/5 animate-slideLeft overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#070707]/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2D2B7A]/50 border border-[#4A47FF]/20 flex items-center justify-center">
                    <Wrench className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-wide">{selectedOS.numero_os}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Ordem de Serviço (Execução de Reparo)</p>
                  </div>
                </div>
                <button 
                  onClick={() => setFichaOpen(false)}
                  className="text-slate-400 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveOS} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. Identificação */}
                <div className="bg-white/2 p-4 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                    <User className="text-[#4A47FF]" size={16} />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Identificação</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500 text-xs font-semibold block">Cliente</span>
                      <span className="text-slate-200 font-semibold">{client ? client.nome_completo : "Indefinido"}</span>
                      {client?.telefone && <span className="text-xs text-slate-400 block mt-0.5">{client.telefone}</span>}
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs font-semibold block">Orçamento Vinculado</span>
                      {selectedOS.orcamento_id ? (
                        <span className="text-slate-300 font-semibold text-xs block mt-1">
                          <FileText size={12} className="inline mr-1" /> {selectedOS.orcamento_id}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Sem orçamento vinculado</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Equipamento */}
                <div className="bg-white/2 p-4 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                    <Laptop className="text-blue-400" size={16} />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Equipamento</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Tipo *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4A47FF]"
                        value={eqpTipo}
                        onChange={(e) => setEqpTipo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Marca *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4A47FF]"
                        value={eqpMarca}
                        onChange={(e) => setEqpMarca(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Modelo</label>
                      <input 
                        type="text"
                        className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4A47FF]"
                        value={eqpModelo}
                        onChange={(e) => setEqpModelo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Nº de Série</label>
                      <input 
                        type="text"
                        className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4A47FF]"
                        value={eqpSerie}
                        onChange={(e) => setEqpSerie(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Acessórios Entregues (Carregador, mouse, capinhas, etc.)</label>
                    <textarea 
                      rows="2"
                      placeholder="Ex: Fonte/Carregador Dell original e mouse sem fio."
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#4A47FF] resize-vertical"
                      value={acessorios}
                      onChange={(e) => setAcessorios(e.target.value)}
                    />
                  </div>
                </div>

                {/* 3. Status Atual */}
                <div className="bg-white/2 p-4 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                    <Clock className="text-amber-400" size={16} />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Status & Execução</h4>
                  </div>
                  
                  {/* Stepper Progress Visual */}
                  <div className="flex justify-between items-center px-2 py-1 relative">
                    <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/5 -translate-y-1/2 -z-10" />
                    {["recebido", "em_diagnostico", "em_execucao", "pronto_retirada", "entregue"].map((step, idx) => {
                      const stepsOrder = ["recebido", "em_diagnostico", "aguardando_peca", "em_execucao", "pronto_retirada", "entregue"];
                      const currentIdx = stepsOrder.indexOf(statusOS);
                      const stepIdx = stepsOrder.indexOf(step);
                      const active = stepIdx <= currentIdx && statusOS !== "cancelado";
                      
                      return (
                        <div key={step} className="flex flex-col items-center gap-1.5 z-10">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border ${
                            active 
                              ? "bg-[#2D2B7A] text-white border-blue-400 shadow-md shadow-blue-500/20" 
                              : "bg-[#0D0D0D] text-slate-600 border-white/10"
                          }`}>
                            {idx + 1}
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${
                            active ? "text-blue-400" : "text-slate-600"
                          }`}>
                            {step === "recebido" ? "Rec." : step === "em_diagnostico" ? "Diag." : step === "em_execucao" ? "Exec." : step === "pronto_retirada" ? "Pronto" : "Entr."}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Alterar Status</label>
                      <select 
                        className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4A47FF]"
                        value={statusOS}
                        onChange={(e) => setStatusOS(e.target.value)}
                      >
                        <option value="recebido">1. Recebido (Entrada)</option>
                        <option value="em_diagnostico">2. Em Diagnóstico</option>
                        <option value="aguardando_peca">3. Aguardando Peça</option>
                        <option value="em_execucao">4. Em Execução</option>
                        <option value="pronto_retirada">5. Pronto para Retirada</option>
                        <option value="entregue">6. Entregue / Fechado</option>
                        <option value="cancelado">❌ Cancelado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Técnico Responsável</label>
                      <input 
                        type="text" 
                        placeholder="Nome do técnico..."
                        className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        value={tecnico}
                        onChange={(e) => setTecnico(e.target.value)}
                      />
                    </div>
                  </div>

                  {statusOS === "cancelado" && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl space-y-2 animate-fadeIn">
                      <label className="block text-[10px] text-rose-400 font-bold uppercase flex items-center gap-1">
                        <AlertTriangle size={12} /> Motivo do Cancelamento *
                      </label>
                      <textarea 
                        rows="2" 
                        required
                        placeholder="Escreva por que a OS foi cancelada (Ex: Cliente recusou custo da placa de vídeo)."
                        className="w-full bg-black/40 border border-rose-500/20 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                        value={motivoCancelamento}
                        onChange={(e) => setMotivoCancelamento(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* 4. Itens da OS */}
                <div className="bg-white/2 p-4 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileCheck className="text-emerald-400" size={16} />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Peças e Serviços Utilizados</h4>
                    </div>
                    {statusOS !== "entregue" && statusOS !== "cancelado" && (
                      <button 
                        type="button"
                        onClick={() => {
                          setShowAddItem(!showAddItem);
                          setSelectedItemId("");
                          setItemQtd(1);
                          setItemPreco(0);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-[10px] font-bold text-slate-300 transition-all uppercase tracking-wider"
                      >
                        <Plus size={12} /> Extra
                      </button>
                    )}
                  </div>

                  {/* Form de Item Extra */}
                  {showAddItem && (
                    <div className="p-4 bg-white/2 rounded-xl border border-white/5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end animate-fadeIn">
                      <div className="md:col-span-2">
                        <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Item do Catálogo</label>
                        <select 
                          className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                          value={selectedItemId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedItemId(val);
                            const p = produtos.find(item => item.id === val);
                            if (p) setItemPreco(p.preco || 0);
                          }}
                        >
                          <option value="">Selecione...</option>
                          {produtos.map(p => (
                            <option key={p.id} value={p.id}>
                              [{p.tipo}] {p.nome} - R$ {Number(p.preco || 0).toFixed(2)} {p.tipo === "Peça" ? `(Estoque: ${p.estoque_atual || 0})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Quantidade</label>
                        <input 
                          type="number" 
                          className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                          min="1"
                          value={itemQtd}
                          onChange={(e) => setItemQtd(e.target.value)}
                        />
                      </div>
                      <div>
                        <button 
                          type="button"
                          onClick={handleAddItemExtra}
                          disabled={!selectedItemId}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all shadow-md"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de Itens */}
                  {osItens.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2 italic text-center">Nenhum item adicionado a esta Ordem de Serviço.</p>
                  ) : (
                    <div className="space-y-2">
                      {osItens.map((item, idx) => (
                        <div key={item.id || idx} className="flex justify-between items-center p-3 bg-white/2 hover:bg-white/4 border border-white/5 rounded-xl transition-all">
                          <div className="flex-1 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">{item.nome || (produtos.find(p => p.id === item.item_catalogo_id)?.nome || "Item Extra")}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                item.tipo === "Serviço" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                              }`}>{item.tipo}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {item.quantidade} un x R$ {Number(item.valor_unitario || 0).toFixed(2)} | Garantia: {item.garantia_dias || 0} dias
                              {item.data_inicio_garantia && (
                                <span className="text-emerald-400 block font-semibold mt-0.5">
                                  Garantia: {format(new Date(item.data_inicio_garantia + "T00:00:00"), "dd/MM/yyyy")} a {item.data_fim_garantia ? format(new Date(item.data_fim_garantia + "T00:00:00"), "dd/MM/yyyy") : "-"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-xs text-slate-300">R$ {(Number(item.valor_unitario || 0) * Number(item.quantidade || 0)).toFixed(2)}</span>
                            {statusOS !== "entregue" && statusOS !== "cancelado" && (
                              <button 
                                type="button"
                                onClick={() => handleRemoveItem(item.id, item.tipo, item.item_catalogo_id, item.quantidade)}
                                className="text-red-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Total */}
                      <div className="flex justify-between items-center border-t border-white/5 pt-3.5 px-1.5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subtotal Executado</span>
                        <span className="text-sm font-extrabold text-white">R$ {subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Garantia */}
                {statusOS === "entregue" && (
                  <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 space-y-3">
                    <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-2">
                      <CalendarDays className="text-emerald-400" size={16} />
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Termo de Garantia da OS</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-slate-300">
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase text-[9px]">Data de Entrega / Início</span>
                        <span className="font-bold text-slate-200">
                          {selectedOS.data_entrega_real ? format(new Date(selectedOS.data_entrega_real + "T00:00:00"), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase text-[9px]">Status Garantia</span>
                        <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] uppercase inline-block">
                          Ativa
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 italic leading-relaxed">
                      A garantia entra em vigência automática na entrega física do equipamento. O prazo de garantia é calculado individualmente por item inserido na OS.
                    </p>
                  </div>
                )}

                {/* 6. Observações Internas */}
                <div className="bg-white/2 p-4 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                    <Info className="text-slate-400" size={16} />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Observações do Serviço</h4>
                  </div>
                  <textarea 
                    rows="3" 
                    placeholder="Notas técnicas detalhadas, diagnósticos internos, testes de estresse..."
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#4A47FF] resize-vertical"
                    value={obsInternas}
                    onChange={(e) => setObsInternas(e.target.value)}
                  />
                </div>

                {/* Drawer Footer Actions */}
                <div className="flex justify-end gap-3 border-t border-white/5 pt-4 bg-[#070707]/30">
                  <button 
                    type="button" 
                    onClick={() => setFichaOpen(false)}
                    className="px-5 py-2.5 border border-white/10 text-slate-300 font-semibold text-xs rounded-xl hover:bg-white/5 transition-all uppercase tracking-wider"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-[#2D2B7A] hover:bg-[#4A47FF] text-white font-bold text-xs rounded-xl shadow-lg transition-all uppercase tracking-wider"
                  >
                    Salvar OS
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
