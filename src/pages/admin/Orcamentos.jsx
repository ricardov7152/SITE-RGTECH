import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../../services/supabase";
import { 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  MessageSquare, 
  Printer, 
  Copy, 
  CheckSquare, 
  XOctagon 
} from "lucide-react";
import { format } from "date-fns";

export default function Orcamentos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: orcData } = await db.orcamentos.list();
      const { data: cliData } = await db.clientes.list();
      setOrcamentos(orcData || []);
      setClientes(cliData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setFilterStatus(statusParam);
    }
  }, [searchParams]);

  const handleUpdateStatus = async (id, status) => {
    let motivo = null;
    if (status === "Recusado") {
      motivo = window.prompt("Deseja informar o motivo da recusa? (Opcional):");
      if (motivo === null) return; // cancelado
    } else {
      const confirmation = window.confirm(`Deseja alterar o status deste orçamento para "${status}"?` + 
        (status === "Aprovado" ? " Isso gerará automaticamente um lançamento no Módulo Financeiro." : ""));
      if (!confirmation) return;
    }

    try {
      await db.orcamentos.updateStatus(id, status, motivo);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar status.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este orçamento?")) return;
    try {
      await db.orcamentos.delete(id);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir orçamento.");
    }
  };

  const handleDuplicate = async (orc) => {
    if (!window.confirm("Deseja duplicar este orçamento?")) return;
    try {
      const { data: fullOrc } = await db.orcamentos.get(orc.id);
      if (fullOrc) {
        const { id, created_at, status, ...rest } = fullOrc;
        const newOrc = {
          ...rest,
          status: 'Em aberto',
          data_emissao: new Date().toISOString().split('T')[0]
        };
        const cleanItens = fullOrc.itens.map(item => {
          const { id: itemId, orcamento_id, ...itemRest } = item;
          return itemRest;
        });
        await db.orcamentos.insert(newOrc, cleanItens);
        loadData();
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao duplicar orçamento.");
    }
  };

  const handleWhatsApp = (orc) => {
    const client = clientes.find(c => c.id === orc.cliente_id);
    if (!client || !client.telefone) {
      alert("Cliente sem telefone cadastrado!");
      return;
    }
    const cleanPhone = client.telefone.replace(/\D/g, "");
    
    // Construir mensagem personalizada
    const msg = `Olá, ${client.nome_completo}! Aqui é o técnico da *RG TECH Computadores*.\n\n` +
                `Geramos o orçamento *#${orc.id}* para o seu equipamento (*${orc.eqp_tipo || "Equipamento"} ${orc.eqp_marca || ""} ${orc.eqp_modelo || ""}*).\n` +
                `*Problema relatado:* ${orc.problema_relatado || "Manutenção"}\n` +
                `*Valor Total:* R$ ${Number(orc.total).toFixed(2)}\n\n` +
                `Podemos seguir com o reparo? Se quiser, posso te enviar o PDF com a discriminação completa do orçamento.`;

    const encodedMsg = encodeURIComponent(msg);
    const link = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodedMsg}`;
    window.open(link, "_blank");
  };

  const getBudgetState = (orc) => {
    if (orc.status !== "Em aberto") return orc.status;
    
    const hoje = new Date();
    const dataEmissao = new Date(orc.data_emissao + "T00:00:00");
    const validadeDias = orc.validade_dias || 7;
    const dataVencimento = new Date(dataEmissao);
    dataVencimento.setDate(dataVencimento.getDate() + validadeDias);
    
    return hoje > dataVencimento ? "Vencido" : "Pendente";
  };

  const getStatusStyle = (displayStatus) => {
    switch (displayStatus) {
      case "Aprovado":
        return "bg-emerald-500/10 text-emerald-400";
      case "Recusado":
        return "bg-rose-500/10 text-rose-400";
      case "Concluído":
        return "bg-blue-500/10 text-blue-400";
      case "Vencido":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      default: // Pendente
        return "bg-amber-500/10 text-amber-400";
    }
  };

  // Filtragem
  const filteredOrcamentos = orcamentos.filter(o => {
    const matchesSearch = o.cliente_nome.toLowerCase().includes(search.toLowerCase()) || 
                          o.id.toLowerCase().includes(search.toLowerCase());
    const displayStatus = getBudgetState(o);
    const matchesStatus = filterStatus === "Todos" || 
                          (filterStatus === "Em aberto" && o.status === "Em aberto") ||
                          displayStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Orçamentos</h1>
          <p className="text-slate-400 text-sm mt-1">Geração de propostas de serviço e emissão de orçamentos</p>
        </div>
        <button 
          onClick={() => navigate("/admin/orcamentos/novo")}
          className="flex items-center gap-2 bg-[#2D2B7A] hover:bg-[#4A47FF] px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all"
        >
          <Plus size={16} /> Novo Orçamento
        </button>
      </div>

      {/* Listagem */}
      <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por número do orçamento ou nome do cliente..."
              className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="Todos">Todos os Status</option>
            <option value="Pendente">Pendente (Em aberto)</option>
            <option value="Vencido">Vencido (Expirado)</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Recusado">Recusado</option>
            <option value="Concluído">Concluído</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-10">Carregando orçamentos...</div>
        ) : filteredOrcamentos.length === 0 ? (
          <div className="text-center text-slate-500 py-10">Nenhum orçamento encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 font-bold uppercase">
                  <th className="pb-3 pt-1">Número</th>
                  <th className="pb-3 pt-1">Cliente</th>
                  <th className="pb-3 pt-1">Equipamento</th>
                  <th className="pb-3 pt-1">Data Emissão</th>
                  <th className="pb-3 pt-1">Total</th>
                  <th className="pb-3 pt-1">Status</th>
                  <th className="pb-3 pt-1 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrcamentos.map((o) => (
                  <tr key={o.id} className="hover:bg-white/2">
                    <td className="py-3.5 font-semibold text-white">{o.id}</td>
                    <td className="py-3.5 text-white font-medium">{o.cliente_nome}</td>
                    <td className="py-3.5 text-xs">
                      {o.eqp_tipo ? `${o.eqp_tipo} ${o.eqp_marca || ""} ${o.eqp_modelo || ""}` : "N/D"}
                    </td>
                    <td className="py-3.5">
                      {o.data_emissao ? format(new Date(o.data_emissao + "T00:00:00"), "dd/MM/yyyy") : "N/D"}
                    </td>
                    <td className="py-3.5 font-bold text-white">R$ {Number(o.total).toFixed(2)}</td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusStyle(getBudgetState(o))}`}>
                        {getBudgetState(o)}
                      </span>
                      {o.status === "Recusado" && o.motivo_recusa && (
                        <span className="block text-[10px] text-slate-500 mt-1 italic max-w-[150px] truncate" title={o.motivo_recusa}>
                          Motivo: {o.motivo_recusa}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-right space-x-1 whitespace-nowrap">
                      {/* Enviar WhatsApp */}
                      <button 
                        onClick={() => handleWhatsApp(o)}
                        className="text-emerald-500 hover:text-emerald-400 p-1 hover:bg-emerald-500/5 rounded-lg transition-all"
                        title="Enviar por WhatsApp"
                      >
                        <MessageSquare size={16} />
                      </button>

                      {/* Editar/Ver */}
                      <button 
                        onClick={() => navigate(`/admin/orcamentos/editar/${o.id}`)}
                        className="text-blue-400 hover:text-blue-300 p-1 hover:bg-blue-500/5 rounded-lg transition-all"
                        title="Editar/Ver Detalhes"
                      >
                        <FileText size={16} />
                      </button>

                      {/* Duplicar */}
                      <button 
                        onClick={() => handleDuplicate(o)}
                        className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all"
                        title="Duplicar Orçamento"
                      >
                        <Copy size={16} />
                      </button>

                      {/* Ações de Status Rápido */}
                      {o.status === "Em aberto" && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(o.id, "Aprovado")}
                            className="text-emerald-500 hover:text-emerald-400 p-1 hover:bg-emerald-500/5 rounded-lg transition-all"
                            title="Aprovar e Faturar"
                          >
                            <CheckSquare size={16} />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(o.id, "Recusado")}
                            className="text-rose-500 hover:text-rose-400 p-1 hover:bg-rose-500/5 rounded-lg transition-all"
                            title="Recusar"
                          >
                            <XOctagon size={16} />
                          </button>
                        </>
                      )}

                      {/* Excluir */}
                      <button 
                        onClick={() => handleDelete(o.id)}
                        className="text-red-500 hover:text-red-400 p-1 hover:bg-red-500/5 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
