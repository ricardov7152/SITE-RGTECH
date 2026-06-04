import { useEffect, useState } from "react";
import { db } from "../../services/supabase";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck, 
  Users, 
  PackageCheck 
} from "lucide-react";

export default function Dashboard() {
  const [financeiro, setFinanceiro] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: finData } = await db.financeiro.list();
        const { data: orcData } = await db.orcamentos.list();
        const { data: cliData } = await db.clientes.list();
        
        setFinanceiro(finData || []);
        setOrcamentos(orcData || []);
        setClientes(cliData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <span className="ml-3">Carregando dados do painel...</span>
      </div>
    );
  }

  // --- CÁLCULOS FINANCEIROS ---
  const receitasTotais = financeiro
    .filter(f => f.tipo === "Receita")
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const receitasRecebidas = financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago")
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const despesasPagas = financeiro
    .filter(f => f.tipo === "Despesa" && f.status === "Pago")
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const receitasPendentes = financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pendente")
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const saldoLiquido = receitasRecebidas - despesasPagas;

  // --- RANKING DE CLIENTES ---
  const clientRevenue = {};
  financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago" && f.cliente_id)
    .forEach(f => {
      const clientName = orcamentos.find(o => o.id === f.orcamento_id)?.cliente_nome || 
                         clientes.find(c => c.id === f.cliente_id)?.nome_completo || 
                         "Cliente não identificado";
      clientRevenue[clientName] = (clientRevenue[clientName] || 0) + Number(f.valor);
    });

  const rankedClients = Object.entries(clientRevenue)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // --- SERVIÇOS MAIS REQUISITADOS ---
  // Mock ou cálculo se tivéssemos os itens de orçamento associados carregados
  // Para fins do dashboard, vamos calcular a partir dos itens mock/locais salvos
  const itensDeOrcamento = JSON.parse(localStorage.getItem("rg_local_orcamento_itens") || "[]");
  const serviceCount = {};
  itensDeOrcamento.forEach(item => {
    serviceCount[item.nome] = (serviceCount[item.nome] || 0) + item.quantidade;
  });

  const popularServices = Object.entries(serviceCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // --- ORIGENS DE CLIENTES (CRM LEAD SOURCE) ---
  const leadSource = { "Google": 0, "Instagram": 0, "Site": 0, "Indicação": 0, "Outros": 0 };
  clientes.forEach(c => {
    if (c.origem && leadSource[c.origem] !== undefined) {
      leadSource[c.origem]++;
    } else {
      leadSource["Outros"]++;
    }
  });

  const leadSourcePercentage = Object.entries(leadSource).map(([source, count]) => ({
    source,
    count,
    percent: clientes.length > 0 ? Math.round((count / clientes.length) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Geral</h1>
        <p className="text-slate-400 text-sm mt-1">Resumo operacional, financeiro e CRM da RG TECH Computadores</p>
      </div>

      {/* ── KPIs Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Faturamento Pago */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Faturamento Realizado</span>
            <span className="text-2xl font-bold text-white block">R$ {receitasRecebidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-500 block">Lançamentos compensados</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/30"></div>
        </div>

        {/* KPI 2: A Conferir */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">A Conferir (Pendente)</span>
            <span className="text-2xl font-bold text-amber-400 block">R$ {receitasPendentes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-500 block">Aguardando conciliação</span>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500/30"></div>
        </div>

        {/* KPI 3: Despesas Pagas */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Despesas Pagas</span>
            <span className="text-2xl font-bold text-rose-500 block">R$ {despesasPagas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-500 block">Saídas compensadas</span>
          </div>
          <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center shrink-0">
            <TrendingDown size={24} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500/30"></div>
        </div>

        {/* KPI 4: Saldo Líquido */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Saldo Líquido</span>
            <span className={`text-2xl font-bold block ${saldoLiquido >= 0 ? "text-[#c2c1ff]" : "text-red-400"}`}>
              R$ {saldoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-500 block">Receitas - Despesas</span>
          </div>
          <div className="w-12 h-12 bg-[#2D2B7A]/30 text-[#c2c1ff] rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-[#2D2B7A]"></div>
        </div>
      </div>

      {/* ── Segunda Linha: Rankings e Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bloco 1: Ranking de Clientes */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-5 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-bold text-white text-base">Clientes Top Faturamento</h3>
            <UserCheck size={18} className="text-slate-400" />
          </div>
          {rankedClients.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Nenhum faturamento compensado ainda.</p>
          ) : (
            <div className="space-y-4">
              {rankedClients.map((client, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/2 p-3 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-500 font-bold">#{idx + 1}</span>
                    <p className="text-sm font-semibold text-white tracking-tight leading-tight">{client.name}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">R$ {client.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bloco 2: Serviços mais realizados */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-5 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-bold text-white text-base">Serviços / Peças Populares</h3>
            <PackageCheck size={18} className="text-slate-400" />
          </div>
          {popularServices.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Nenhum item faturado no momento.</p>
          ) : (
            <div className="space-y-4">
              {popularServices.map((service, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                    <span className="truncate max-w-[200px] text-white">{service.name}</span>
                    <span>{service.count} unidades</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#2D2B7A] h-full rounded-full" 
                      style={{ width: `${Math.min(100, (service.count / popularServices[0].count) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bloco 3: Funil / Origem do Cliente (CRM) */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-5 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-bold text-white text-base">Origem de Clientes (CRM)</h3>
            <Users size={18} className="text-slate-400" />
          </div>
          {clientes.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Nenhum cliente cadastrado.</p>
          ) : (
            <div className="space-y-4">
              {leadSourcePercentage.map((source, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                    <span className="text-white">{source.source}</span>
                    <span>{source.count} ({source.percent}%)</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#4A47FF] h-full rounded-full" 
                      style={{ width: `${source.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Terceira Linha: Atividades Recentes (Últimos Orçamentos e Lançamentos) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Últimos Orçamentos */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="font-bold text-white text-base border-b border-white/5 pb-4">Últimos Orçamentos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 font-bold uppercase">
                  <th className="py-2.5">ID</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.slice(0, 4).map(o => (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="py-3 font-semibold text-white">{o.id}</td>
                    <td>{o.cliente_nome}</td>
                    <td className="font-semibold text-white">R$ {Number(o.total).toFixed(2)}</td>
                    <td className="text-right">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        o.status === "Aprovado" ? "bg-emerald-500/10 text-emerald-400" :
                        o.status === "Concluído" ? "bg-blue-500/10 text-blue-400" :
                        o.status === "Recusado" ? "bg-rose-500/10 text-rose-400" :
                        "bg-amber-500/10 text-amber-400"
                      }`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Últimas Transações */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="font-bold text-white text-base border-b border-white/5 pb-4">Atividade Financeira Recente</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 font-bold uppercase">
                  <th className="py-2.5">Descrição</th>
                  <th>Valor</th>
                  <th>Meio</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {financeiro.slice(0, 4).map(f => (
                  <tr key={f.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="py-3 font-semibold text-white max-w-[200px] truncate">{f.descricao}</td>
                    <td className={f.tipo === "Receita" ? "text-emerald-400 font-semibold" : "text-rose-500 font-semibold"}>
                      {f.tipo === "Receita" ? "+" : "-"} R$ {Number(f.valor).toFixed(2)}
                    </td>
                    <td>{f.meio_pagamento || "N/A"}</td>
                    <td className="text-right">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        f.status === "Pago" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                      }`}>{f.status === "Pago" ? "Compensado" : "A Conferir"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
