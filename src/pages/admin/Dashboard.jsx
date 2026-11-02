import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, DEFAULT_KANBAN_COLUMNS, normalizeKanbanStatus } from "../../services/supabase";
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
  Calendar,
  Target,
  Edit2,
  Check,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  FileText
} from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();
  const [financeiro, setFinanceiro] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [itensDeOrcamento, setItensDeOrcamento] = useState([]);
  const [itensDeOS, setItensDeOS] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);

  // Seletor de Período
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${month}`;
  });

  // Configurações
  const [configs, setConfigs] = useState({
    metas: {},
    dias_alerta_followup: 3,
    kanban_colunas: DEFAULT_KANBAN_COLUMNS,
  });
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [tempMeta, setTempMeta] = useState(5000);

  const metaFaturamento = configs.metas?.[selectedPeriod] || 5000;

  // Gerar opções de período dinamicamente (de 2026-01 até o mês/ano atual)
  const getPeriodOptions = () => {
    const startYear = 2026;
    const startMonth = 0; // Janeiro
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    const options = [];
    const monthsNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    
    let year = startYear;
    let month = startMonth;
    
    while (year < currentYear || (year === currentYear && month <= currentMonth)) {
      const monthStr = String(month + 1).padStart(2, "0");
      const value = `${year}-${monthStr}`;
      const label = `${monthsNames[month]} de ${year}`;
      options.push({ value, label });
      
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    
    return options.reverse();
  };

  const periodOptions = getPeriodOptions();

  // Atualiza a meta temporária ao carregar as configurações ou mudar o período selecionado
  useEffect(() => {
    setTempMeta(configs.metas?.[selectedPeriod] || 5000);
  }, [selectedPeriod, configs.metas]);

  useEffect(() => {
    async function loadData() {
      try {
        const [finRes, orcRes, cliRes, itemsRes, osItemsRes, ordensRes, cfgRes] = await Promise.all([
          db.financeiro.list(),
          db.orcamentos.list(),
          db.clientes.list(),
          db.orcamento_itens.list(),
          db.os_itens.listAll(),
          db.ordem_servico.list(),
          db.configuracoes.get(),
        ]);
        
        setFinanceiro(finRes.data || []);
        setOrcamentos(orcRes.data || []);
        setClientes(cliRes.data || []);
        setItensDeOrcamento(itemsRes.data || []);
        setItensDeOS(osItemsRes.data || []);
        setOrdens(ordensRes.data || []);

        if (cfgRes.data) {
          setConfigs({
            metas: cfgRes.data.metas || {},
            dias_alerta_followup: cfgRes.data.dias_alerta_followup ?? 3,
            kanban_colunas: cfgRes.data.kanban_colunas || DEFAULT_KANBAN_COLUMNS,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleSaveMeta = async () => {
    const value = Number(tempMeta);
    if (isNaN(value) || value <= 0) {
      alert("Por favor, insira um valor válido para a meta.");
      return;
    }
    const newConfigs = {
      ...configs,
      metas: {
        ...(configs.metas || {}),
        [selectedPeriod]: value
      }
    };
    try {
      setConfigs(newConfigs);
      await db.configuracoes.upsert(newConfigs);
      setIsEditingMeta(false);
    } catch (e) {
      console.error("Erro ao salvar meta no banco:", e);
      alert("Erro ao salvar meta no banco de dados.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-[#C1E8FF]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#5483B3] border-t-[#C1E8FF]"></div>
        <span className="ml-3">Carregando dados do painel...</span>
      </div>
    );
  }

  // --- CÁLCULOS FINANCEIROS FILTRADOS POR PERÍODO ---
  const receitasRecebidas = financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago" && (f.data_pagamento || f.data_vencimento)?.startsWith(selectedPeriod))
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  // --- TICKET MÉDIO NO PERÍODO ---
  const totalVendasPagas = financeiro.filter(f => f.tipo === "Receita" && f.status === "Pago" && (f.data_pagamento || f.data_vencimento)?.startsWith(selectedPeriod)).length;
  const ticketMedio = totalVendasPagas > 0 ? receitasRecebidas / totalVendasPagas : 0;

  // --- PROGRESSO DA META NO PERÍODO ---
  const percentMeta = Math.min(100, Math.round((receitasRecebidas / metaFaturamento) * 100));

  // --- CLASSIFICAÇÃO E CONTAGEM DE ORÇAMENTOS NO PERÍODO ---
  const hoje = new Date();
  let aprovadosCount = 0;
  let recusadosCount = 0;
  let concluidosCount = 0;
  let pendentesCount = 0; // Em aberto (dentro da validade)
  let vencidosCount = 0;   // Em aberto (vencidos)

  const orcamentosFiltrados = orcamentos.filter(o => o.data_emissao?.startsWith(selectedPeriod));

  orcamentosFiltrados.forEach(o => {
    if (o.status === "Aprovado") aprovadosCount++;
    else if (o.status === "Recusado") recusadosCount++;
    else if (o.status === "Concluído") concluidosCount++;
    else if (o.status === "Em aberto") {
      const dataEmissao = new Date(o.data_emissao + "T00:00:00");
      const validadeDias = o.validade_dias || 7;
      const dataVencimento = new Date(dataEmissao);
      dataVencimento.setDate(dataVencimento.getDate() + validadeDias);

      if (hoje > dataVencimento) {
        vencidosCount++;
      } else {
        pendentesCount++;
      }
    }
  });

  const totalOrcamentos = orcamentosFiltrados.length;
  const taxaConversao = totalOrcamentos > 0 ? ((aprovadosCount + concluidosCount) / totalOrcamentos) * 100 : 0;

  // --- ALERTA: ORÇAMENTOS DO PERÍODO SEM RESPOSTA HÁ X DIAS ---
  const alertasOrcamentos = orcamentosFiltrados.filter(o => {
    if (o.status !== "Em aberto") return false;
    const dataEmissao = new Date(o.data_emissao + "T00:00:00");
    const diffTime = Math.abs(hoje - dataEmissao);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= configs.dias_alerta_followup;
  });

  // --- VENDAS DE PRODUTOS E SERVIÇOS NO PERÍODO (Orçamentos + Manutenção) ---
  let totalVendasProdutos = 0;
  let totalVendasServicos = 0;
  
  itensDeOrcamento.forEach(item => {
    const parentOrc = orcamentos.find(o => o.id === item.orcamento_id);
    if (parentOrc && parentOrc.data_emissao?.startsWith(selectedPeriod) && (parentOrc.status === "Aprovado" || parentOrc.status === "Concluído")) {
      const valor = Number(item.total || 0);
      if (item.tipo === "Peça") totalVendasProdutos += valor;
      else totalVendasServicos += valor;
    }
  });

  itensDeOS.forEach(item => {
    const parentOS = ordens.find(os => os.id === item.os_id);
    const normSt = parentOS ? normalizeKanbanStatus(parentOS.status) : "";
    if (parentOS && parentOS.data_abertura?.startsWith(selectedPeriod) && (normSt === "aprovado_execucao" || normSt === "finalizado")) {
      const valor = Number(item.valor_unitario || 0) * Number(item.quantidade || 1);
      if (item.tipo === "Peça") totalVendasProdutos += valor;
      else totalVendasServicos += valor;
    }
  });

  // --- GRÁFICO DE RECEITAS POR MÊS (ANUAL) ---
  const receitasPorMes = {};
  const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const anoFoco = Number(selectedPeriod.substring(0, 4));

  mesesNomes.forEach((_, idx) => {
    const mesStr = String(idx + 1).padStart(2, "0");
    receitasPorMes[`${anoFoco}-${mesStr}`] = 0;
  });

  financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago" && (f.data_pagamento || f.data_vencimento))
    .forEach(f => {
      const data = f.data_pagamento || f.data_vencimento;
      const anoMes = data.substring(0, 7);
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

  // --- CRESCIMENTO MENSAL (%) COMPARADO AO MÊS ANTERIOR DO PERÍODO SELECIONADO ---
  const [selAno, selMes] = selectedPeriod.split("-").map(Number);
  const prevMonthIdx = selMes === 1 ? 12 : selMes - 1;
  const prevYear = selMes === 1 ? selAno - 1 : selAno;
  const prevPeriodKey = `${prevYear}-${String(prevMonthIdx).padStart(2, "0")}`;

  const faturamentoPeriodoAnterior = financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago" && (f.data_pagamento || f.data_vencimento)?.startsWith(prevPeriodKey))
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  let crescimentoPercentual = 0;
  let temComparativo = false;
  if (faturamentoPeriodoAnterior > 0) {
    crescimentoPercentual = ((receitasRecebidas - faturamentoPeriodoAnterior) / faturamentoPeriodoAnterior) * 100;
    temComparativo = true;
  }

  // --- RANKING DE CLIENTES NO PERÍODO ---
  const clientRevenue = {};
  financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago" && f.cliente_id && (f.data_pagamento || f.data_vencimento)?.startsWith(selectedPeriod))
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

  // --- SERVIÇOS MAIS REQUISITADOS NO PERÍODO ---
  const serviceCount = {};
  itensDeOrcamento.forEach(item => {
    const parentOrc = orcamentos.find(o => o.id === item.orcamento_id);
    if (parentOrc && parentOrc.data_emissao?.startsWith(selectedPeriod)) {
      serviceCount[item.nome] = (serviceCount[item.nome] || 0) + item.quantidade;
    }
  });
  itensDeOS.forEach(item => {
    const parentOS = ordens.find(os => os.id === item.os_id);
    if (parentOS && parentOS.data_abertura?.startsWith(selectedPeriod) && item.nome) {
      serviceCount[item.nome] = (serviceCount[item.nome] || 0) + Number(item.quantidade || 1);
    }
  });

  const popularServices = Object.entries(serviceCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // --- ORIGENS DE CLIENTES NO PERÍODO (CRM) ---
  const leadSource = { "Google": 0, "Instagram": 0, "Site": 0, "WhatsApp": 0, "Indicação": 0, "Outros": 0 };
  const clientesDoPeriodo = clientes.filter(c => c.data_cadastro?.startsWith(selectedPeriod) || c.created_at?.startsWith(selectedPeriod));
  
  clientesDoPeriodo.forEach(c => {
    if (c.origem && leadSource[c.origem] !== undefined) {
      leadSource[c.origem]++;
    } else {
      leadSource["Outros"]++;
    }
  });

  const leadSourcePercentage = Object.entries(leadSource).map(([source, count]) => ({
    source,
    count,
    percent: clientesDoPeriodo.length > 0 ? Math.round((count / clientesDoPeriodo.length) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // --- CÁLCULOS DO QUADRO KANBAN DE MANUTENÇÃO NO PERÍODO ---
  const kanbanCounts = {
    recebido: 0,
    em_analise: 0,
    orcamento_enviado: 0,
    aprovado_execucao: 0,
    finalizado: 0,
    aguardando_peca: 0,
  };
  let osAtrasadas = 0;

  const hojeStr = new Date().toISOString().split("T")[0];
  const ordensDoPeriodo = ordens.filter(os => !os.data_abertura || os.data_abertura?.startsWith(selectedPeriod));

  ordensDoPeriodo.forEach(os => {
    const normStatus = normalizeKanbanStatus(os.status);
    if (kanbanCounts[normStatus] !== undefined) {
      kanbanCounts[normStatus]++;
    }
    if (normStatus !== "finalizado" && os.data_entrega_prevista && os.data_entrega_prevista < hojeStr) {
      osAtrasadas++;
    }
  });

  const totalOSAndamento =
    kanbanCounts.recebido +
    kanbanCounts.em_analise +
    kanbanCounts.orcamento_enviado +
    kanbanCounts.aprovado_execucao +
    kanbanCounts.aguardando_peca;

  const handleWhatsAppAlert = (orc) => {
    const client = clientes.find(c => c.id === orc.cliente_id);
    if (!client || !client.telefone) {
      alert("Cliente sem telefone cadastrado!");
      return;
    }
    const cleanPhone = client.telefone.replace(/\D/g, "");
    const msg = `Olá, ${client.nome_completo}! Aqui é o técnico da *RG TECH Computadores*.\n\n` +
                `Gostaria de dar um retorno sobre o orçamento *#${orc.id}* enviado para o seu *${orc.eqp_tipo || "equipamento"}*.\n` +
                `Ficou com alguma dúvida ou gostaria de aprovar o início do reparo?`;
    window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Geral</h1>
          <p className="text-[#7DA0CA] text-sm mt-1">Resumo operacional, Kanban de Manutenção, financeiro e CRM da RG TECH</p>
        </div>
        
        {/* Seletor de Período */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[#7DA0CA] uppercase tracking-wider">Período:</label>
          <select
            className="bg-[#021024] border border-[#7DA0CA]/30 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#C1E8FF] focus:outline-none focus:border-[#C1E8FF] transition-all cursor-pointer shadow-lg"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            {periodOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── KPIs Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Faturamento Pago / Realizado */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#7DA0CA] uppercase tracking-wider block">Faturamento Realizado</span>
            <span className="text-2xl font-bold text-white block">R$ {receitasRecebidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-[#7DA0CA]/70 block">Lançamentos compensados</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/40"></div>
        </div>

        {/* Meta de Faturamento do Mês */}
        <div className="glass p-6 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#7DA0CA] uppercase tracking-wider block">Meta Mensal</span>
              {isEditingMeta ? (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-sm font-bold text-[#7DA0CA]">R$</span>
                  <input 
                    type="number" 
                    className="bg-[#021024] border border-[#7DA0CA]/40 rounded-lg px-2 py-0.5 text-sm font-bold text-white w-24 focus:outline-none"
                    value={tempMeta}
                    onChange={(e) => setTempMeta(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveMeta()}
                  />
                  <button onClick={handleSaveMeta} className="text-emerald-400 hover:text-white p-1 hover:bg-emerald-500/10 rounded-lg">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">R$ {metaFaturamento.toLocaleString("pt-BR")}</span>
                  <button onClick={() => setIsEditingMeta(true)} className="text-[#7DA0CA] hover:text-white p-1 hover:bg-white/5 rounded-lg">
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-[#052659] to-[#5483B3] text-[#C1E8FF] border border-[#C1E8FF]/30 rounded-xl flex items-center justify-center shrink-0">
              <Target size={20} />
            </div>
          </div>
          
          <div className="mt-3.5 space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-[#7DA0CA] uppercase">
              <span>Progresso</span>
              <span>{percentMeta}%</span>
            </div>
            <div className="w-full bg-[#021024]/70 h-2 rounded-full overflow-hidden border border-[#7DA0CA]/20">
              <div 
                className="bg-gradient-to-r from-[#052659] via-[#5483B3] to-[#C1E8FF] h-full rounded-full transition-all duration-500" 
                style={{ width: `${percentMeta}%` }}
              />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#052659] to-[#C1E8FF]"></div>
        </div>

        {/* Ticket Médio */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#7DA0CA] uppercase tracking-wider block">Ticket Médio</span>
            <span className="text-2xl font-bold text-[#C1E8FF] block">R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-[#7DA0CA]/70 block">Média por faturamento</span>
          </div>
          <div className="w-12 h-12 bg-[#5483B3]/20 text-[#C1E8FF] border border-[#7DA0CA]/30 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-[#7DA0CA]/50"></div>
        </div>

        {/* Crescimento Mensal (%) */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#7DA0CA] uppercase tracking-wider block">Crescimento Mensal</span>
            {temComparativo ? (
              <>
                <span className={`text-2xl font-bold block ${crescimentoPercentual >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                  {crescimentoPercentual >= 0 ? "+" : ""}{crescimentoPercentual.toFixed(1)}%
                </span>
                <span className="text-xs text-[#7DA0CA]/70 block">Este mês vs. mês anterior</span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-[#C1E8FF] block py-1">Sem comparativo</span>
                <span className="text-xs text-[#7DA0CA]/70 block">Primeiro mês de operação</span>
              </>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            !temComparativo ? "bg-[#052659] text-[#7DA0CA]" : (crescimentoPercentual >= 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300")
          }`}>
            <Percent size={22} />
          </div>
          <div className={`absolute bottom-0 left-0 w-full h-1 ${
            !temComparativo ? "bg-[#5483B3]/40" : (crescimentoPercentual >= 0 ? "bg-emerald-500/40" : "bg-rose-500/40")
          }`}></div>
        </div>
      </div>

      {/* ── Seção Quadro Kanban de Manutenção ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Card: Manutenções por Etapa do Kanban */}
        <div className="glass p-6 rounded-2xl shadow-xl lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b border-[#7DA0CA]/15 pb-3">
            <div className="flex items-center gap-2.5">
              <Wrench className="text-[#C1E8FF]" size={20} />
              <h3 className="font-bold text-white text-base">
                Manutenções no Quadro Kanban ({totalOSAndamento} em andamento)
              </h3>
            </div>
            <button
              onClick={() => navigate("/admin/ordens-servico")}
              className="text-xs font-bold text-[#C1E8FF] hover:underline"
            >
              Abrir Kanban →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { id: "recebido", label: "Recebidos", val: kanbanCounts.recebido, color: "text-[#C1E8FF]" },
              { id: "em_analise", label: "Em Análise", val: kanbanCounts.em_analise, color: "text-[#7DA0CA]" },
              { id: "orcamento_enviado", label: "Orç. Enviado", val: kanbanCounts.orcamento_enviado, color: "text-sky-300" },
              { id: "aprovado_execucao", label: "Em Execução", val: kanbanCounts.aprovado_execucao, color: "text-blue-300" },
              { id: "aguardando_peca", label: "Aguard. Peças", val: kanbanCounts.aguardando_peca, color: "text-amber-300" },
              { id: "finalizado", label: "Finalizados", val: kanbanCounts.finalizado, color: "text-emerald-300" },
            ].map((st) => (
              <div
                key={st.id}
                onClick={() => navigate("/admin/ordens-servico")}
                className="bg-[#021024]/60 hover:bg-[#052659]/70 p-3.5 rounded-xl border border-[#7DA0CA]/20 text-center space-y-1 cursor-pointer transition-all"
              >
                <span className="text-[#7DA0CA] text-[10px] font-bold uppercase tracking-wider block truncate">
                  {st.label}
                </span>
                <span className={`text-xl font-extrabold block ${st.color}`}>{st.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card: Manutenções Atrasadas */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#7DA0CA] uppercase tracking-wider block">Manutenções Atrasadas</span>
            <span className={`text-3xl font-extrabold block ${osAtrasadas > 0 ? "text-rose-400 animate-pulse" : "text-[#C1E8FF]"}`}>
              {osAtrasadas}
            </span>
            <span className="text-xs text-[#7DA0CA]/80 block">
              {osAtrasadas > 0 ? "Requer atenção imediata" : "Todas dentro do prazo"}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            osAtrasadas > 0 ? "bg-rose-500/20 text-rose-300 border border-rose-400/40" : "bg-[#052659] text-[#C1E8FF] border border-[#7DA0CA]/30"
          }`}>
            <Clock size={24} />
          </div>
          <div className={`absolute bottom-0 left-0 w-full h-1 ${osAtrasadas > 0 ? "bg-rose-500/50" : "bg-[#5483B3]/40"}`}></div>
        </div>
      </div>

      {/* ── Gráfico de Receitas e Divisão Peças/Serviços ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras de Receitas por Mês */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#7DA0CA]/15 pb-4">
            <div className="space-y-0.5">
              <h3 className="font-bold text-white text-base">Faturamento Mensal ({anoFoco})</h3>
              <p className="text-[#7DA0CA] text-xs">Receitas compensadas mês a mês</p>
            </div>
            <Calendar size={18} className="text-[#C1E8FF]" />
          </div>

          <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
            {chartDataReceitas.map((data, idx) => {
              const heightPercent = Math.max(5, (data.valor / maxReceitaMes) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer relative">
                  <div 
                    className="w-full bg-gradient-to-t from-[#052659] via-[#5483B3] to-[#7DA0CA] hover:to-[#C1E8FF] transition-all rounded-t-lg relative border-t border-[#C1E8FF]/30 shadow-[0_0_14px_rgba(84,131,179,0.25)]"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#021024] border border-[#7DA0CA]/40 px-2.5 py-1.5 rounded-lg text-[10px] text-[#C1E8FF] font-bold whitespace-nowrap absolute bottom-full left-1/2 -translate-x-1/2 mb-2 shadow-2xl z-10 pointer-events-none">
                      R$ {data.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#7DA0CA] uppercase tracking-tight">{data.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumo Peças vs Serviços */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-5 lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#7DA0CA]/15 pb-4">
              <h3 className="font-bold text-white text-base">Divisão de Faturamento</h3>
              <PackageCheck size={18} className="text-[#C1E8FF]" />
            </div>

            <div className="space-y-4 pt-2">
              <div className="bg-[#021024]/60 p-4 rounded-xl flex items-center justify-between border border-[#7DA0CA]/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500/15 text-emerald-300 rounded-lg flex items-center justify-center">
                    <Wrench size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#7DA0CA] uppercase tracking-wider block">Serviços Executados</span>
                    <span className="text-base font-bold text-white">R$ {totalVendasServicos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#021024]/60 p-4 rounded-xl flex items-center justify-between border border-[#7DA0CA]/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#5483B3]/25 text-[#C1E8FF] rounded-lg flex items-center justify-center">
                    <ShoppingBag size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#7DA0CA] uppercase tracking-wider block">Peças / Produtos</span>
                    <span className="text-base font-bold text-white">R$ {totalVendasProdutos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-4">
            <div className="flex justify-between text-[10px] font-bold text-[#7DA0CA] uppercase">
              <span>Serviços ({Math.round(totalVendasServicos / (totalVendasServicos + totalVendasProdutos || 1) * 100)}%)</span>
              <span>Peças ({Math.round(totalVendasProdutos / (totalVendasServicos + totalVendasProdutos || 1) * 100)}%)</span>
            </div>
            <div className="w-full bg-[#021024] h-2 rounded-full flex overflow-hidden">
              <div 
                className="bg-emerald-400 h-full" 
                style={{ width: `${(totalVendasServicos / (totalVendasServicos + totalVendasProdutos || 1)) * 100}%` }}
              />
              <div 
                className="bg-[#5483B3] h-full" 
                style={{ width: `${(totalVendasProdutos / (totalVendasServicos + totalVendasProdutos || 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Conversão e Status de Orçamentos Avulsos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#7DA0CA]/15 pb-4">
            <h3 className="font-bold text-white text-base">Conversão de Orçamentos</h3>
            <Percent size={18} className="text-[#C1E8FF]" />
          </div>

          <div className="flex flex-col items-center py-6">
            <div className="relative flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-8 border-[#5483B3]/35 flex items-center justify-center">
                <span className="text-2xl font-bold text-[#C1E8FF]">{taxaConversao.toFixed(0)}%</span>
              </div>
            </div>
            <p className="text-xs text-[#7DA0CA] text-center mt-4 max-w-[200px]">
              Proporção de orçamentos aprovados/concluídos sobre o total emitido
            </p>
          </div>

          <div className="border-t border-[#7DA0CA]/15 pt-3 flex justify-between text-xs text-[#7DA0CA] font-semibold">
            <span>Emitidos: {totalOrcamentos}</span>
            <span>Ganhos: {aprovadosCount + concluidosCount}</span>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#7DA0CA]/15 pb-4">
            <h3 className="font-bold text-white text-base">Status de Orçamentos</h3>
            <Clock size={18} className="text-[#C1E8FF]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div 
              onClick={() => navigate("/admin/orcamentos?status=Pendente")}
              className="bg-[#021024]/60 p-3 rounded-xl border border-[#7DA0CA]/20 flex items-center gap-2 cursor-pointer hover:bg-[#052659]/60 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <div className="text-xs">
                <span className="font-bold text-white block">{pendentesCount}</span>
                <span className="text-[#7DA0CA] block uppercase text-[9px] font-bold">Pendentes</span>
              </div>
            </div>
            <div 
              onClick={() => navigate("/admin/orcamentos?status=Aprovado")}
              className="bg-[#021024]/60 p-3 rounded-xl border border-[#7DA0CA]/20 flex items-center gap-2 cursor-pointer hover:bg-[#052659]/60 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <div className="text-xs">
                <span className="font-bold text-white block">{aprovadosCount}</span>
                <span className="text-[#7DA0CA] block uppercase text-[9px] font-bold">Aprovados</span>
              </div>
            </div>
            <div 
              onClick={() => navigate("/admin/orcamentos?status=Recusado")}
              className="bg-[#021024]/60 p-3 rounded-xl border border-[#7DA0CA]/20 flex items-center gap-2 cursor-pointer hover:bg-[#052659]/60 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <div className="text-xs">
                <span className="font-bold text-white block">{recusadosCount}</span>
                <span className="text-[#7DA0CA] block uppercase text-[9px] font-bold">Recusados</span>
              </div>
            </div>
            <div 
              onClick={() => navigate("/admin/orcamentos?status=Concluído")}
              className="bg-[#021024]/60 p-3 rounded-xl border border-[#7DA0CA]/20 flex items-center gap-2 cursor-pointer hover:bg-[#052659]/60 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-[#C1E8FF]"></span>
              <div className="text-xs">
                <span className="font-bold text-white block">{concluidosCount}</span>
                <span className="text-[#7DA0CA] block uppercase text-[9px] font-bold">Concluídos</span>
              </div>
            </div>
            <div 
              onClick={() => navigate("/admin/orcamentos?status=Vencido")}
              className="bg-rose-500/15 p-3 rounded-xl border border-rose-500/25 flex items-center gap-2 col-span-2 cursor-pointer hover:bg-rose-500/25 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
              <div className="text-xs flex justify-between items-center w-full">
                <span className="text-rose-200 block text-[9px] font-bold uppercase">Aguardando Resposta (Vencidos)</span>
                <span className="font-bold text-rose-300">{vencidosCount} orçamentos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl shadow-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#7DA0CA]/15 pb-4">
              <h3 className="font-bold text-white text-base">⚠️ Alertas de Follow-up</h3>
              <span className="bg-amber-500/15 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{configs.dias_alerta_followup}+ dias parados</span>
            </div>

            {alertasOrcamentos.length === 0 ? (
              <p className="text-xs text-[#7DA0CA] text-center py-6">Nenhum orçamento pendente há mais de {configs.dias_alerta_followup} dias.</p>
            ) : (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {alertasOrcamentos.slice(0, 3).map(o => (
                  <div key={o.id} className="flex justify-between items-center bg-[#021024]/60 p-2.5 rounded-xl border border-[#7DA0CA]/20">
                    <div className="text-xs">
                      <span className="font-bold text-white block">{o.id} - {o.cliente_nome}</span>
                      <span className="text-[#7DA0CA] block">Emitido em {format(new Date(o.data_emissao + "T00:00:00"), "dd/MM/yy")}</span>
                    </div>
                    <button 
                      onClick={() => handleWhatsAppAlert(o)}
                      className="text-emerald-400 hover:text-white hover:bg-emerald-500/20 p-1.5 rounded-lg transition-all"
                      title="Nudge por WhatsApp"
                    >
                      <MessageSquare size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {alertasOrcamentos.length > 3 && (
            <p className="text-[10px] text-[#7DA0CA] text-right mt-1">+ {alertasOrcamentos.length - 3} alertas ocultados</p>
          )}
        </div>
      </div>

      {/* ── Rankings, Funil e Serviços Populares ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#7DA0CA]/15 pb-4">
            <h3 className="font-bold text-white text-base">Clientes Top Faturamento</h3>
            <UserCheck size={18} className="text-[#C1E8FF]" />
          </div>
          {rankedClients.length === 0 ? (
            <p className="text-sm text-[#7DA0CA] text-center py-6">Nenhum faturamento compensado ainda.</p>
          ) : (
            <div className="space-y-4">
              {rankedClients.map((client, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[#021024]/60 p-3 rounded-xl border border-[#7DA0CA]/20">
                  <div className="space-y-0.5">
                    <span className="text-xs text-[#C1E8FF] font-bold">#{idx + 1}</span>
                    <p className="text-sm font-semibold text-white tracking-tight leading-tight">{client.name}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">R$ {client.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-6 rounded-2xl shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#7DA0CA]/15 pb-4">
            <h3 className="font-bold text-white text-base">Serviços / Peças Populares</h3>
            <PackageCheck size={18} className="text-[#C1E8FF]" />
          </div>
          {popularServices.length === 0 ? (
            <p className="text-sm text-[#7DA0CA] text-center py-6">Nenhum item faturado no momento.</p>
          ) : (
            <div className="space-y-4">
              {popularServices.map((service, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-[#7DA0CA]">
                    <span className="truncate max-w-[200px] text-white">{service.name}</span>
                    <span>{service.count} unidades</span>
                  </div>
                  <div className="w-full bg-[#021024] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#052659] via-[#5483B3] to-[#C1E8FF] h-full rounded-full" 
                      style={{ width: `${Math.min(100, (service.count / popularServices[0].count) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-6 rounded-2xl shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#7DA0CA]/15 pb-4">
            <h3 className="font-bold text-white text-base">Origem de Clientes (CRM)</h3>
            <Users size={18} className="text-[#C1E8FF]" />
          </div>
          {clientes.length === 0 ? (
            <p className="text-sm text-[#7DA0CA] text-center py-6">Nenhum cliente cadastrado.</p>
          ) : (
            <div className="space-y-4">
              {leadSourcePercentage.map((source, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-[#7DA0CA]">
                    <span className="text-white">{source.source}</span>
                    <span>{source.count} ({source.percent}%)</span>
                  </div>
                  <div className="w-full bg-[#021024] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#5483B3] to-[#C1E8FF] h-full rounded-full" 
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
        <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="font-bold text-white text-base border-b border-[#7DA0CA]/15 pb-4">Últimos Orçamentos Avulsos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#7DA0CA]">
              <thead>
                <tr className="border-b border-[#7DA0CA]/15 text-xs text-[#C1E8FF] font-bold uppercase">
                  <th className="py-2.5">ID</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.slice(0, 5).map(o => (
                  <tr key={o.id} className="border-b border-[#7DA0CA]/10 hover:bg-[#052659]/30">
                    <td className="py-3 font-semibold text-white">{o.id}</td>
                    <td>{o.cliente_nome}</td>
                    <td className="font-semibold text-white">R$ {Number(o.total).toFixed(2)}</td>
                    <td className="text-right">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        o.status === "Aprovado" ? "bg-emerald-500/15 text-emerald-300" :
                        o.status === "Concluído" ? "bg-sky-500/15 text-sky-300" :
                        o.status === "Recusado" ? "bg-rose-500/15 text-rose-300" :
                        "bg-amber-500/15 text-amber-300"
                      }`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="font-bold text-white text-base border-b border-[#7DA0CA]/15 pb-4">Atividade Financeira Recente</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#7DA0CA]">
              <thead>
                <tr className="border-b border-[#7DA0CA]/15 text-xs text-[#C1E8FF] font-bold uppercase">
                  <th className="py-2.5">Descrição</th>
                  <th>Valor</th>
                  <th>Meio</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {financeiro.slice(0, 5).map(f => (
                  <tr key={f.id} className="border-b border-[#7DA0CA]/10 hover:bg-[#052659]/30">
                    <td className="py-3 font-semibold text-white max-w-[200px] truncate">{f.descricao}</td>
                    <td className={f.tipo === "Receita" ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                      {f.tipo === "Receita" ? "+" : "-"} R$ {Number(f.valor).toFixed(2)}
                    </td>
                    <td>{f.meio_pagamento || "N/A"}</td>
                    <td className="text-right">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        f.status === "Pago" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
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
