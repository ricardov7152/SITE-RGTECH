import { useEffect, useState } from "react";
import { db } from "../../services/supabase";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  UserCheck, 
  Users, 
  PackageCheck,
  ShoppingBag,
  Wrench,
  Percent,
  Calendar
} from "lucide-react";

export default function Dashboard() {
  const [financeiro, setFinanceiro] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [itensDeOrcamento, setItensDeOrcamento] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: finData } = await db.financeiro.list();
        const { data: orcData } = await db.orcamentos.list();
        const { data: cliData } = await db.clientes.list();
        const { data: itemsData } = await db.orcamento_itens.list();
        
        setFinanceiro(finData || []);
        setOrcamentos(orcData || []);
        setClientes(cliData || []);
        setItensDeOrcamento(itemsData || []);
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

  // --- CÁLCULOS FINANCEIROS BÁSICOS ---
  const receitasRecebidas = financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago")
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const receitasPendentes = financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pendente")
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const receitaTotal = receitasRecebidas + receitasPendentes;

  const despesasPagas = financeiro
    .filter(f => f.tipo === "Despesa" && f.status === "Pago")
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const saldoLiquido = receitasRecebidas - despesasPagas;

  // --- TICKET MÉDIO ---
  // Baseado na Receita Realizada (Compensada) dividida pelo total de orçamentos/vendas pagas correspondentes
  const totalVendasPagas = financeiro.filter(f => f.tipo === "Receita" && f.status === "Pago").length;
  const ticketMedio = totalVendasPagas > 0 ? receitasRecebidas / totalVendasPagas : 0;

  // --- VENDAS DE PRODUTOS E SERVIÇOS ---
  let totalVendasProdutos = 0;
  let totalVendasServicos = 0;
  const vendasMensaisProdServ = {};
  const vendasAnuaisProdServ = {};

  itensDeOrcamento.forEach(item => {
    const parentOrc = orcamentos.find(o => o.id === item.orcamento_id);
    // Considerar apenas itens de orçamentos aprovados ou concluídos
    if (parentOrc && (parentOrc.status === "Aprovado" || parentOrc.status === "Concluído")) {
      const valor = Number(item.total || 0);
      const isPeca = item.tipo === "Peça";

      if (isPeca) {
        totalVendasProdutos += valor;
      } else {
        totalVendasServicos += valor;
      }

      const data = parentOrc.data_emissao; // YYYY-MM-DD
      if (data) {
        const anoMes = data.substring(0, 7); // YYYY-MM
        const ano = data.substring(0, 4); // YYYY

        if (!vendasMensaisProdServ[anoMes]) vendasMensaisProdServ[anoMes] = { produtos: 0, servicos: 0 };
        if (!vendasAnuaisProdServ[ano]) vendasAnuaisProdServ[ano] = { produtos: 0, servicos: 0 };

        if (isPeca) {
          vendasMensaisProdServ[anoMes].produtos += valor;
          vendasAnuaisProdServ[ano].produtos += valor;
        } else {
          vendasMensaisProdServ[anoMes].servicos += valor;
          vendasAnuaisProdServ[ano].servicos += valor;
        }
      }
    }
  });

  // --- GRÁFICO DE RECEITAS POR MÊS ---
  const receitasPorMes = {};
  const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const anoAtual = new Date().getFullYear();

  // Inicializar todos os meses do ano atual com valor zero
  mesesNomes.forEach((_, idx) => {
    const mesStr = String(idx + 1).padStart(2, "0");
    receitasPorMes[`${anoAtual}-${mesStr}`] = 0;
  });

  financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago" && (f.data_pagamento || f.data_vencimento))
    .forEach(f => {
      const data = f.data_pagamento || f.data_vencimento;
      const anoMes = data.substring(0, 7); // YYYY-MM
      if (receitasPorMes[anoMes] !== undefined) {
        receitasPorMes[anoMes] += Number(f.valor);
      }
    });

  const chartDataReceitas = Object.entries(receitasPorMes)
    .map(([anoMes, valor]) => {
      const mesIdx = Number(anoMes.substring(5, 7)) - 1;
      return {
        label: mesesNomes[mesIdx],
        mesAno: anoMes,
        valor
      };
    })
    .sort((a, b) => a.mesAno.localeCompare(b.mesAno));

  const maxReceitaMes = Math.max(...chartDataReceitas.map(d => d.valor), 1);

  // --- CRESCIMENTO MENSAL (%) ---
  const hoje = new Date();
  const mesAtualStr = String(hoje.getMonth() + 1).padStart(2, "0");
  const anoAtualStr = String(hoje.getFullYear());
  const chaveMesAtual = `${anoAtualStr}-${mesAtualStr}`;

  const mesAnteriorIdx = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1;
  const anoAnteriorNum = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
  const mesAnteriorStr = String(mesAnteriorIdx + 1).padStart(2, "0");
  const chaveMesAnterior = `${anoAnteriorNum}-${mesAnteriorStr}`;

  const receitaMesAtual = financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago" && (f.data_pagamento || f.data_vencimento)?.startsWith(chaveMesAtual))
    .reduce((sum, f) => sum + Number(f.valor), 0);

  const receitaMesAnterior = financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago" && (f.data_pagamento || f.data_vencimento)?.startsWith(chaveMesAnterior))
    .reduce((sum, f) => sum + Number(f.valor), 0);

  let crescimentoPercentual = 0;
  if (receitaMesAnterior > 0) {
    crescimentoPercentual = ((receitaMesAtual - receitaMesAnterior) / receitaMesAnterior) * 100;
  } else if (receitaMesAtual > 0) {
    crescimentoPercentual = 100;
  }

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
  const serviceCount = {};
  itensDeOrcamento.forEach(item => {
    serviceCount[item.nome] = (serviceCount[item.nome] || 0) + item.quantidade;
  });

  const popularServices = Object.entries(serviceCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // --- ORIGENS DE CLIENTES (CRM) ---
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
        {/* Faturamento Pago / Recebido */}
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

        {/* Receita Total (Pago + A Conferir) */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Receita Total Projetada</span>
            <span className="text-2xl font-bold text-[#c2c1ff] block">R$ {receitaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-500 block">Pago: R$ {receitasRecebidas.toFixed(0)} | Pendente: R$ {receitasPendentes.toFixed(0)}</span>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500/30"></div>
        </div>

        {/* Ticket Médio */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ticket Médio</span>
            <span className="text-2xl font-bold text-sky-400 block">R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-500 block">Média por faturamento</span>
          </div>
          <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-sky-500/30"></div>
        </div>

        {/* Crescimento Mensal (%) */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Crescimento Mensal</span>
            <span className={`text-2xl font-bold block ${crescimentoPercentual >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
              {crescimentoPercentual >= 0 ? "+" : ""}{crescimentoPercentual.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 block">Este mês vs. mês anterior</span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            crescimentoPercentual >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
          }`}>
            <Percent size={22} />
          </div>
          <div className={`absolute bottom-0 left-0 w-full h-1 ${crescimentoPercentual >= 0 ? "bg-emerald-500/30" : "bg-rose-500/30"}`}></div>
        </div>
      </div>

      {/* ── Nova Linha: Gráfico de Receitas e Divisão Peças/Serviços ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras de Receitas por Mês */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="space-y-0.5">
              <h3 className="font-bold text-white text-base">Faturamento Mensal ({anoAtual})</h3>
              <p className="text-slate-500 text-xs">Receitas compensadas mês a mês</p>
            </div>
            <Calendar size={18} className="text-slate-400" />
          </div>

          <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
            {chartDataReceitas.map((data, idx) => {
              const heightPercent = Math.max(5, (data.valor / maxReceitaMes) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                  {/* Tooltip valor */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/10 px-2 py-1 rounded text-[10px] text-white font-bold whitespace-nowrap absolute mb-14 shadow-lg">
                    R$ {data.valor.toFixed(0)}
                  </span>
                  
                  {/* Barra */}
                  <div 
                    className="w-full bg-[#2D2B7A]/50 hover:bg-[#4A47FF] transition-all rounded-t-lg relative border-t border-white/10 shadow-[0_0_10px_rgba(45,43,122,0.1)]"
                    style={{ height: `${heightPercent}%` }}
                  />
                  {/* Label */}
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{data.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumo Peças vs Serviços */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-5 lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="font-bold text-white text-base">Divisão de Faturamento</h3>
              <PackageCheck size={18} className="text-slate-400" />
            </div>

            <div className="space-y-4 pt-2">
              {/* Vendas de Serviços */}
              <div className="bg-white/2 p-4 rounded-xl flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
                    <Wrench size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Serviços Executados</span>
                    <span className="text-base font-bold text-white">R$ {totalVendasServicos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Vendas de Peças (Produtos) */}
              <div className="bg-white/2 p-4 rounded-xl flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center">
                    <ShoppingBag size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Peças / Produtos</span>
                    <span className="text-base font-bold text-white">R$ {totalVendasProdutos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparação básica em barra progresso */}
          <div className="space-y-1 pt-4">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
              <span>Serviços ({Math.round(totalVendasServicos / (totalVendasServicos + totalVendasProdutos || 1) * 100)}%)</span>
              <span>Peças ({Math.round(totalVendasProdutos / (totalVendasServicos + totalVendasProdutos || 1) * 100)}%)</span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full flex overflow-hidden">
              <div 
                className="bg-emerald-500 h-full" 
                style={{ width: `${(totalVendasServicos / (totalVendasServicos + totalVendasProdutos || 1)) * 100}%` }}
              />
              <div 
                className="bg-blue-500 h-full" 
                style={{ width: `${(totalVendasProdutos / (totalVendasServicos + totalVendasProdutos || 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Rankings, Funil e Serviços Populares ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ranking de Clientes */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-bold text-white text-base">Clientes Top Faturamento</h3>
            <UserCheck size={18} className="text-slate-400" />
          </div>
          {rankedClients.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Nenhum faturamento compensado ainda.</p>
          ) : (
            <div className="space-y-4">
              {rankedClients.map((client, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/2 p-3 rounded-xl border border-white/2">
                  <div className="space-y-0.5">
                    <span className="text-xs text-[#c2c1ff] font-bold">#{idx + 1}</span>
                    <p className="text-sm font-semibold text-white tracking-tight leading-tight">{client.name}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">R$ {client.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Serviços mais realizados */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-5">
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

        {/* Funil / Origem do Cliente (CRM) */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-5">
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

      {/* ── Históricos Recentes (Últimos Orçamentos e Lançamentos) ── */}
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
                {orcamentos.slice(0, 5).map(o => (
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
                {financeiro.slice(0, 5).map(f => (
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
