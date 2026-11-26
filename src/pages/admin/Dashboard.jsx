import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, normalizeKanbanStatus } from "../../services/supabase";
import { localDateISO } from "../../utils/date";
import {
  formatDurationDays,
  computeFairComparison,
  computeAccountsReceivable,
  computeStageSLA,
  computeLeadTime,
  computeMaintenanceFunnel,
  computeEquipmentMix,
  computeCriticalStock,
} from "../../utils/dashboardAnalytics";
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
  Timer,
  Laptop,
  Package,
  ArrowUpRight,
} from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();
  const [financeiro, setFinanceiro] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [itensDeOrcamento, setItensDeOrcamento] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [osItens, setOsItens] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [osHistorico, setOsHistorico] = useState([]);
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
  });
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [tempMeta, setTempMeta] = useState(5000);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3600);
  };

  const metaFaturamento = configs.metas[selectedPeriod] || 5000;

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
    setTempMeta(configs.metas[selectedPeriod] || 5000);
  }, [selectedPeriod, configs.metas]);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: finData } = await db.financeiro.list();
        const { data: orcData } = await db.orcamentos.list();
        const { data: cliData } = await db.clientes.list();
        const { data: itemsData } = await db.orcamento_itens.list();
        const { data: ordensData } = await db.ordem_servico.list();
        let osItensData = [];
        let prodData = [];
        let histData = [];
        try {
          const [resItens, resProd, resHist] = await Promise.all([
            db.os_itens.listAll(),
            db.produtos.list(),
            db.os_historico.list(),
          ]);
          osItensData = resItens?.data || [];
          prodData = resProd?.data || [];
          histData = resHist?.data || [];
        } catch (e) {
          console.error("Erro ao carregar dados complementares do painel:", e);
        }
        setOsItens(osItensData);
        setProdutos(prodData);
        setOsHistorico(histData);
        
        setFinanceiro(finData || []);
        setOrcamentos(orcData || []);
        setClientes(cliData || []);
        setItensDeOrcamento(itemsData || []);
        setOrdens(ordensData || []);

        let loadedConfigs = null;
        try {
          const { data: dbConfigs } = await db.configuracoes.get();
          if (dbConfigs) {
            loadedConfigs = dbConfigs;
          }
        } catch (dbErr) {
          console.error("Erro ao buscar do Supabase, tentando local...", dbErr);
        }

        if (!loadedConfigs) {
          const stored = localStorage.getItem("rg_local_configuracoes");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              loadedConfigs = {
                metas: parsed.metas || {},
                dias_alerta_followup: parsed.dias_alerta_followup !== undefined ? parsed.dias_alerta_followup : 3,
              };
              // Migrar para o Supabase
              await db.configuracoes.upsert(loadedConfigs);
            } catch (e) {
              console.error("Erro ao migrar local configurações para o banco:", e);
            }
          }
        }

        if (loadedConfigs) {
          setConfigs(loadedConfigs);
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
      showToast("warning", "Por favor, insira um valor válido para a meta.");
      return;
    }
    const newConfigs = {
      ...configs,
      metas: {
        ...configs.metas,
        [selectedPeriod]: value
      }
    };
    try {
      setConfigs(newConfigs);
      await db.configuracoes.upsert(newConfigs);
      setIsEditingMeta(false);
      showToast("success", "Meta mensal atualizada com sucesso!");
    } catch (e) {
      console.error("Erro ao salvar meta no banco:", e);
      showToast("error", "Erro ao salvar meta no banco de dados.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-7 animate-pulse">
        {/* Skeleton Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-white/10 rounded-xl" />
            <div className="h-4 w-80 bg-white/5 rounded-lg" />
          </div>
          <div className="h-10 w-48 bg-white/10 rounded-xl" />
        </div>

        {/* Skeleton Faixa 1: Operação Hoje */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <div className="h-5 w-44 bg-white/10 rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-24 bg-white/5 rounded-2xl border border-white/5" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} className="h-16 bg-white/5 rounded-xl border border-white/5" />
            ))}
          </div>
        </div>

        {/* Skeleton Faixa 2: KPIs do Mês */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="glass p-6 rounded-2xl h-32 space-y-3">
              <div className="h-3 w-24 bg-white/10 rounded" />
              <div className="h-7 w-32 bg-white/10 rounded-lg" />
              <div className="h-3 w-28 bg-white/5 rounded" />
            </div>
          ))}
        </div>

        {/* Skeleton Painéis Analíticos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass p-6 rounded-2xl h-72 space-y-4">
              <div className="h-5 w-40 bg-white/10 rounded-lg" />
              <div className="h-48 w-full bg-white/5 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- CÁLCULOS FINANCEIROS FILTRADOS POR PERÍODO ---
  const receitasRecebidas = financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago" && (f.data_pagamento || f.data_vencimento)?.startsWith(selectedPeriod))
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const receitasPendentes = financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pendente" && f.data_vencimento?.startsWith(selectedPeriod))
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const receitaTotal = receitasRecebidas + receitasPendentes;

  const despesasPagas = financeiro
    .filter(f => f.tipo === "Despesa" && f.status === "Pago" && (f.data_pagamento || f.data_vencimento)?.startsWith(selectedPeriod))
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const lucroLiquido = receitasRecebidas - despesasPagas;
  const margemLucro = receitasRecebidas > 0 ? Math.round((lucroLiquido / receitasRecebidas) * 100) : 0;

  // --- TICKET MÉDIO NO PERÍODO ---
  // Agrupa parcelas do mesmo atendimento (OS ou orçamento) para não distorcer a média
  const receitasPagasPeriodo = financeiro.filter(f => f.tipo === "Receita" && f.status === "Pago" && (f.data_pagamento || f.data_vencimento)?.startsWith(selectedPeriod));
  const atendimentosPagos = new Set(receitasPagasPeriodo.map(f => f.os_id || f.orcamento_id || f.id)).size;
  const ticketMedio = atendimentosPagos > 0 ? receitasRecebidas / atendimentosPagos : 0;

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

  // --- VENDAS DE PRODUTOS E SERVIÇOS NO PERÍODO ---
  // Considera orçamentos avulsos aprovados + manutenções (Kanban) finalizadas no período.
  // Orçamentos que viraram OS são contados apenas pela OS, para não duplicar.
  let totalVendasProdutos = 0;
  let totalVendasServicos = 0;
  const serviceCount = {};
  const orcamentosComOS = new Set(ordens.map(o => o.orcamento_id).filter(Boolean));

  const registrarItem = (nome, tipo, valor, quantidade) => {
    if (tipo === "Peça") totalVendasProdutos += valor;
    else totalVendasServicos += valor;
    if (nome) serviceCount[nome] = (serviceCount[nome] || 0) + Number(quantidade || 1);
  };

  itensDeOrcamento.forEach(item => {
    const parentOrc = orcamentos.find(o => o.id === item.orcamento_id);
    if (!parentOrc || orcamentosComOS.has(parentOrc.id)) return;
    if (parentOrc.data_emissao?.startsWith(selectedPeriod) && (parentOrc.status === "Aprovado" || parentOrc.status === "Concluído")) {
      registrarItem(item.nome, item.tipo, Number(item.total || 0), item.quantidade);
    }
  });

  const ordensFinalizadasPeriodo = ordens.filter(os => {
    const s = normalizeKanbanStatus(os.status);
    return (s === "finalizado" || s === "entregue") &&
      (os.data_entrega_real || os.atualizado_em || "").startsWith(selectedPeriod);
  });
  const idsFinalizadas = new Set(ordensFinalizadasPeriodo.map(os => os.id));
  osItens.forEach(item => {
    if (!idsFinalizadas.has(item.os_id)) return;
    const valor = Number(item.valor_unitario || 0) * Number(item.quantidade || 1);
    registrarItem(item.nome, item.tipo, valor, item.quantidade);
  });

  // --- GRÁFICO DE RECEITAS E DESPESAS POR MÊS (ANUAL) ---
  const receitasPorMes = {};
  const despesasPorMes = {};
  const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const anoFoco = Number(selectedPeriod.substring(0, 4));

  mesesNomes.forEach((_, idx) => {
    const mesStr = String(idx + 1).padStart(2, "0");
    receitasPorMes[`${anoFoco}-${mesStr}`] = 0;
    despesasPorMes[`${anoFoco}-${mesStr}`] = 0;
  });

  financeiro
    .filter(f => f.status === "Pago" && (f.data_pagamento || f.data_vencimento))
    .forEach(f => {
      const data = f.data_pagamento || f.data_vencimento;
      const anoMes = data.substring(0, 7);
      if (f.tipo === "Receita" && receitasPorMes[anoMes] !== undefined) {
        receitasPorMes[anoMes] += Number(f.valor);
      } else if (f.tipo === "Despesa" && despesasPorMes[anoMes] !== undefined) {
        despesasPorMes[anoMes] += Number(f.valor);
      }
    });

  const chartDataReceitas = Object.entries(receitasPorMes)
    .map(([anoMes, valor]) => {
      const mesIdx = Number(anoMes.substring(5, 7)) - 1;
      const despesa = despesasPorMes[anoMes] || 0;
      return {
        label: mesesNomes[mesIdx],
        mesAno: anoMes,
        valor,
        despesa,
        lucro: valor - despesa,
      };
    })
    .sort((a, b) => a.mesAno.localeCompare(b.mesAno));

  const maxReceitaMes = Math.max(
    ...chartDataReceitas.map(d => Math.max(d.valor, d.despesa)),
    1
  );

  const formatCompactBRL = (val) => {
    if (!val || val <= 0) return "";
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1).replace(".0", "").replace(".", ",")}k`;
    }
    return `${Math.round(val)}`;
  };

  // --- CRESCIMENTO MENSAL (%) — COMPARATIVO JUSTO (MTD NO MÊS ATUAL) ---
  const [selAno, selMes] = selectedPeriod.split("-").map(Number);
  const prevMonthIdx = selMes === 1 ? 12 : selMes - 1;
  const prevYear = selMes === 1 ? selAno - 1 : selAno;
  const prevPeriodKey = `${prevYear}-${String(prevMonthIdx).padStart(2, "0")}`;

  const {
    temComparativo,
    crescimentoPercentual,
    labelComparativo,
  } = computeFairComparison({
    financeiro,
    selectedPeriod,
    prevPeriodKey,
    receitasRecebidas,
  });

  // --- ANÁLISES DA FASE 3 (SLA, LEAD TIME, FUNIL OS, CONTAS A RECEBER, EQUIPAMENTOS, ESTOQUE) ---
  const receivables = computeAccountsReceivable(financeiro, clientes);
  const stageSLA = computeStageSLA(ordens, osHistorico);
  const leadTime = computeLeadTime(ordens, selectedPeriod);
  const maintFunnel = computeMaintenanceFunnel(ordens, selectedPeriod);
  const eqpMix = computeEquipmentMix(ordens, osItens);
  const criticalStock = computeCriticalStock(produtos);

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

  // --- CÁLCULOS DAS ORDENS DE SERVIÇO NO PERÍODO ---
  // Situação ATUAL da bancada (não depende do mês selecionado) usando os status do Kanban
  const hojeStr = localDateISO();
  const osAbertas = ordens.filter(os => {
    if (os.arquivado) return false;
    const s = normalizeKanbanStatus(os.status);
    return s !== "finalizado" && s !== "entregue" && s !== "cancelado";
  });
  const contarStatus = (st) => osAbertas.filter(os => normalizeKanbanStatus(os.status) === st).length;

  const osRecebido = contarStatus("recebido");
  const osEmAnalise = contarStatus("em_analise");
  const osOrcamentoEnviado = contarStatus("orcamento_enviado");
  const osAguardandoPeca = contarStatus("aguardando_peca");
  const osEmExecucao = contarStatus("aprovado_execucao");
  const osProntoRetirada = ordens.filter(os => !os.arquivado && normalizeKanbanStatus(os.status) === "finalizado").length;
  const osAtrasadas = osAbertas.filter(os => os.data_entrega_prevista && os.data_entrega_prevista < hojeStr).length;
  const totalOSAndamento = osAbertas.length;
  const osEntreguesMes = ordens.filter(os =>
    normalizeKanbanStatus(os.status) === "entregue" &&
    (os.data_entrega_real || os.atualizado_em || "").startsWith(selectedPeriod)
  ).length;

  const osTiles = [
    { label: "Recebidos", value: osRecebido, color: "text-sky-400" },
    { label: "Em análise", value: osEmAnalise, color: "text-cyan-400" },
    { label: "Orç. enviado", value: osOrcamentoEnviado, color: "text-indigo-400" },
    { label: "Aguard. peça", value: osAguardandoPeca, color: "text-amber-500" },
    { label: "Execução", value: osEmExecucao, color: "text-[#19DDFF]" },
    { label: "Pronto p/ retirada", value: osProntoRetirada, color: "text-emerald-400" },
    { label: "Entregues (mês)", value: osEntreguesMes, color: "text-green-400" },
  ];

  const handleWhatsAppAlert = (orc) => {
    const client = clientes.find(c => c.id === orc.cliente_id);
    if (!client || !client.telefone) {
      showToast("warning", "Este cliente não possui telefone cadastrado.");
      return;
    }
    const cleanPhone = client.telefone.replace(/\D/g, "");
    const msg = `Olá, ${client.nome_completo}! Aqui é o técnico da *RG TECH Computadores*.\n\n` +
                `Gostaria de dar um retorno sobre o orçamento *#${orc.id}* enviado para o seu *${orc.eqp_tipo || "equipamento"}*.\n` +
                `Ficou com alguma dúvida ou gostaria de aprovar o início do reparo?`;
    window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  const convRadius = 48;
  const convCircumference = 2 * Math.PI * convRadius;
  const convClamped = Math.min(100, Math.max(0, taxaConversao));
  const convOffset = convCircumference * (1 - convClamped / 100);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Geral</h1>
          <p className="text-slate-400 text-sm mt-1">Resumo operacional em tempo real, financeiro e CRM da RG TECH Computadores</p>
        </div>
        
        {/* Seletor de Período */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Período do Mês:</label>
          <select
            className="bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-[#19DDFF] transition-all cursor-pointer shadow-lg"
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

      {/* ── FAIXA 1: OPERAÇÃO HOJE (BANCADA EM TEMPO REAL) ── */}
      <div className="glass p-6 rounded-2xl shadow-xl space-y-5 border border-[#19DDFF]/15">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="font-extrabold text-white text-base tracking-tight uppercase">
              Operação Hoje — Bancada em Tempo Real
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/ordens-servico")}
            className="text-xs font-bold text-[#19DDFF] hover:underline flex items-center gap-1"
          >
            Abrir Quadro Kanban <ArrowUpRight size={14} />
          </button>
        </div>

        {/* 4 Destaques Imediatos do Dia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => navigate("/admin/ordens-servico")}
            className="bg-white/2 hover:bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-[#19DDFF]/35 text-left flex items-center justify-between transition-all"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Na Bancada Agora
              </span>
              <span className="text-2xl font-extrabold text-white block mt-0.5">
                {totalOSAndamento}
              </span>
              <span className="text-[11px] text-slate-500 block">Equipamentos em atendimento</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#0029F5]/20 text-[#19DDFF] flex items-center justify-center shrink-0">
              <Wrench size={20} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/ordens-servico")}
            className="bg-white/2 hover:bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-emerald-500/35 text-left flex items-center justify-between transition-all"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Prontos p/ Retirada
              </span>
              <span className="text-2xl font-extrabold text-emerald-400 block mt-0.5">
                {osProntoRetirada}
              </span>
              <span className="text-[11px] text-slate-500 block">Aguardando cliente retirar</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <PackageCheck size={20} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/ordens-servico?atrasadas=1")}
            className={`bg-white/2 hover:bg-white/5 p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
              osAtrasadas > 0
                ? "border-rose-500/35 hover:border-rose-500/60"
                : "border-white/5 hover:border-white/15"
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                OS Atrasadas
              </span>
              <span
                className={`text-2xl font-extrabold block mt-0.5 ${
                  osAtrasadas > 0 ? "text-rose-500 animate-pulse" : "text-slate-300"
                }`}
              >
                {osAtrasadas}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {osAtrasadas > 0 ? "Clique para priorizar" : "Tudo dentro do prazo"}
              </span>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                osAtrasadas > 0
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  : "bg-slate-500/10 text-slate-500"
              }`}
            >
              <Clock size={20} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/financeiro")}
            className="bg-white/2 hover:bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-amber-500/35 text-left flex items-center justify-between transition-all"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                A Receber / Conferir Hoje
              </span>
              <span className="text-2xl font-extrabold text-amber-400 block mt-0.5">
                R$ {receivables.vencidasOuHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-slate-500 block">
                { alertasOrcamentos.length > 0
                  ? `${alertasOrcamentos.length} orçamento(s) p/ follow-up`
                  : "Lançamentos pendentes até hoje" }
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <DollarSign size={20} />
            </div>
          </button>
        </div>

        {/* 7 Raias da Bancada */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {osTiles.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => navigate("/admin/ordens-servico")}
              className="bg-white/2 p-3 rounded-xl border border-white/5 text-center space-y-1 hover:bg-white/5 hover:border-[#19DDFF]/30 transition-all"
              title="Abrir quadro de Manutenção"
            >
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">{t.label}</span>
              <span className={`text-xl font-bold block ${t.color}`}>{t.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── FAIXA 2: RESULTADOS DO MÊS SELECIONADO (5 KPIs Financeiros) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Faturamento Pago / Realizado */}
        <div
          onClick={() => navigate("/admin/financeiro")}
          className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden group cursor-pointer hover:border-emerald-500/30 transition-all"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Faturamento Realizado</span>
            <span className="text-2xl font-bold text-white block">R$ {receitasRecebidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-500 block">
              Previsto no mês: R$ {receitaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/30"></div>
        </div>

        {/* Lucro Líquido & Margem do Mês */}
        <div
          onClick={() => navigate("/admin/financeiro")}
          className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden cursor-pointer hover:border-[#19DDFF]/30 transition-all"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lucro Líquido</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                lucroLiquido >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
              }`}>
                {margemLucro}% margem
              </span>
            </div>
            <span className={`text-2xl font-bold block ${lucroLiquido >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
              R$ {lucroLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-500 block">
              Despesas pagas: R$ {despesasPagas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            lucroLiquido >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
          }`}>
            {lucroLiquido >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
          <div className={`absolute bottom-0 left-0 w-full h-1 ${
            lucroLiquido >= 0 ? "bg-emerald-500/40" : "bg-rose-500/40"
          }`}></div>
        </div>

        {/* Meta de Faturamento do Mês */}
        <div className="glass p-6 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Meta Mensal</span>
              {isEditingMeta ? (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-sm font-bold text-slate-400">R$</span>
                  <input 
                    type="number" 
                    className="bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-sm font-bold text-white w-24 focus:outline-none"
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
                  <button onClick={() => setIsEditingMeta(true)} className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg">
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>
            <div className="w-10 h-10 bg-[#0029F5]/20 text-[#19DDFF] rounded-xl flex items-center justify-center shrink-0">
              <Target size={20} />
            </div>
          </div>
          
          <div className="mt-3.5 space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
              <span>Progresso</span>
              <span>{percentMeta}%</span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-[#0029F5] to-[#19DDFF] h-full rounded-full transition-all duration-500" 
                style={{ width: `${percentMeta}%` }}
              />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-[#0029F5]"></div>
        </div>

        {/* Ticket Médio */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ticket Médio</span>
            <span className="text-2xl font-bold text-sky-400 block">R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-500 block">Média por atendimento pago</span>
          </div>
          <div className="w-11 h-11 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle size={22} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-sky-500/30"></div>
        </div>

        {/* Crescimento Mensal (%) — Comparativo Justo */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Crescimento Mensal</span>
            {temComparativo ? (
              <>
                <span className={`text-2xl font-bold block ${crescimentoPercentual >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                  {crescimentoPercentual >= 0 ? "+" : ""}{crescimentoPercentual.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-500 block">{labelComparativo}</span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-slate-300 block py-1">Sem comparativo</span>
                <span className="text-xs text-slate-500 block">Mês anterior sem faturamento</span>
              </>
            )}
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            !temComparativo ? "bg-slate-500/10 text-slate-400" : (crescimentoPercentual >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")
          }`}>
            <Percent size={20} />
          </div>
          <div className={`absolute bottom-0 left-0 w-full h-1 ${
            !temComparativo ? "bg-slate-500/30" : (crescimentoPercentual >= 0 ? "bg-emerald-500/30" : "bg-rose-500/30")
          }`}></div>
        </div>
      </div>

      {/* ── Fase 3: SLA por Etapa, Funil & Mix de Equipamentos, Contas a Receber & Estoque Crítico ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Tempo Médio por Etapa (SLA) & Lead Time Total */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">SLA & Tempo por Etapa</h3>
                <p className="text-slate-500 text-xs">Tempo médio de permanência em cada coluna</p>
              </div>
              <Timer size={18} className="text-[#19DDFF]" />
            </div>

            {/* Resumo Lead Time Total + Prazo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/2 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Lead Time Total
                </span>
                <span className="text-lg font-extrabold text-white block mt-0.5">
                  {leadTime.avgDays !== null ? formatDurationDays(leadTime.avgDays) : "—"}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {leadTime.completedCount > 0
                    ? `Média de ${leadTime.completedCount} concluída(s)`
                    : "Entrada até conclusão"}
                </span>
              </div>
              <div className="bg-white/2 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Entregas no Prazo
                </span>
                <span className="text-lg font-extrabold text-emerald-400 block mt-0.5">
                  {leadTime.onTimeRate !== null ? `${leadTime.onTimeRate}%` : "100%"}
                </span>
                <span className="text-[10px] text-slate-500 block">Dentro da previsão</span>
              </div>
            </div>

            {/* Barras de SLA por Etapa */}
            <div className="space-y-2.5 pt-1">
              {stageSLA.stages.map((st) => {
                const widthPct =
                  st.avgDays !== null
                    ? Math.max(8, Math.round((st.avgDays / stageSLA.maxAvg) * 100))
                    : 0;
                const isBottleneck =
                  stageSLA.bottleneck &&
                  stageSLA.bottleneck.id === st.id &&
                  (st.avgDays || 0) >= 1;

                return (
                  <div key={st.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        {st.label}
                        {isBottleneck && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Gargalo
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-white">{st.formatted}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`${isBottleneck ? "bg-amber-400" : st.color} h-full rounded-full transition-all`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>Calculado via histórico de movimentações</span>
            <button
              type="button"
              onClick={() => navigate("/admin/ordens-servico")}
              className="text-[#19DDFF] font-bold hover:underline flex items-center gap-1"
            >
              Ver Kanban <ArrowUpRight size={12} />
            </button>
          </div>
        </div>

        {/* 2. Funil de Manutenção (OS) & Receita por Tipo de Equipamento */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Funil de Manutenção & Mix</h3>
                <p className="text-slate-500 text-xs">Conversão da bancada e perfil de equipamentos</p>
              </div>
              <Laptop size={18} className="text-[#19DDFF]" />
            </div>

            {/* Funil de OS */}
            <div className="space-y-2">
              {maintFunnel.steps.map((step) => {
                const pct =
                  maintFunnel.totalEntrada > 0
                    ? Math.round((step.count / maintFunnel.totalEntrada) * 100)
                    : 0;
                return (
                  <div key={step.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">{step.label}</span>
                      <span className="font-bold text-white">
                        {step.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div
                        className={`${step.color} h-full rounded-full transition-all`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 font-semibold">
                <span>Aprovação de reparo: <strong className="text-emerald-400">{maintFunnel.taxaAprovacaoOS}%</strong></span>
                <span>Taxa de conclusão: <strong className="text-[#19DDFF]">{maintFunnel.taxaConclusaoOS}%</strong></span>
              </div>
            </div>

            {/* Receita por Tipo de Equipamento */}
            <div className="border-t border-white/5 pt-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Demanda e Receita por Equipamento
              </span>
              {eqpMix.typesList.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Sem equipamentos registrados.</p>
              ) : (
                <div className="space-y-1.5">
                  {eqpMix.typesList.slice(0, 4).map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs bg-white/2 px-3 py-2 rounded-xl border border-white/5"
                    >
                      <div>
                        <span className="font-bold text-white">{item.name}</span>
                        <span className="text-[10px] text-slate-500 ml-2">{item.count} OS</span>
                      </div>
                      <span className="font-bold text-emerald-400">
                        R$ {item.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {eqpMix.topBrands.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Top Marcas:</span>
                  {eqpMix.topBrands.map((b) => (
                    <span
                      key={b.brand}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5"
                    >
                      {b.brand} ({b.count})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Contas a Receber (7 / 30 dias) & Estoque Crítico */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">A Receber & Estoque Crítico</h3>
                <p className="text-slate-500 text-xs">Previsão de caixa e alerta de reposição</p>
              </div>
              <DollarSign size={18} className="text-emerald-400" />
            </div>

            {/* Resumo Contas a Receber */}
            <div className="grid grid-cols-3 gap-2.5">
              <div
                onClick={() => navigate("/admin/financeiro")}
                className="bg-white/2 p-3 rounded-xl border border-white/5 cursor-pointer hover:border-amber-500/30 transition-all"
              >
                <span className="text-[9px] font-bold text-amber-400 uppercase block">
                  Hoje / Vencidas
                </span>
                <span className="text-sm font-extrabold text-white block mt-1">
                  R$ {receivables.vencidasOuHoje.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[9px] text-slate-500 block">A conferir</span>
              </div>

              <div
                onClick={() => navigate("/admin/financeiro")}
                className="bg-white/2 p-3 rounded-xl border border-white/5 cursor-pointer hover:border-[#19DDFF]/30 transition-all"
              >
                <span className="text-[9px] font-bold text-sky-400 uppercase block">
                  Próx. 7 dias
                </span>
                <span className="text-sm font-extrabold text-white block mt-1">
                  R$ {receivables.proximos7Dias.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[9px] text-slate-500 block">Curto prazo</span>
              </div>

              <div
                onClick={() => navigate("/admin/financeiro")}
                className="bg-white/2 p-3 rounded-xl border border-white/5 cursor-pointer hover:border-emerald-500/30 transition-all"
              >
                <span className="text-[9px] font-bold text-emerald-400 uppercase block">
                  Próx. 30 dias
                </span>
                <span className="text-sm font-extrabold text-white block mt-1">
                  R$ {receivables.proximos30Dias.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[9px] text-slate-500 block">Médio prazo</span>
              </div>
            </div>

            {/* Estoque Crítico */}
            <div className="border-t border-white/5 pt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Package size={13} className="text-amber-400" />
                  Estoque Crítico de Peças ({criticalStock.length})
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/admin/produtos")}
                  className="text-[11px] font-bold text-[#19DDFF] hover:underline"
                >
                  Gerenciar
                </button>
              </div>

              {criticalStock.length === 0 ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 font-semibold text-center">
                  Todas as peças cadastradas estão com estoque acima do mínimo.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[155px] overflow-y-auto pr-1">
                  {criticalStock.map((prod) => {
                    const qtd = Number(prod.estoque_atual ?? 0);
                    const zerado = qtd <= 0;
                    return (
                      <div
                        key={prod.id}
                        onClick={() => navigate("/admin/produtos")}
                        className="flex items-center justify-between text-xs bg-white/2 hover:bg-white/5 px-3 py-2 rounded-xl border border-white/5 cursor-pointer transition-all"
                      >
                        <span className="font-semibold text-white truncate max-w-[180px]">
                          {prod.nome}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            zerado
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {zerado ? "Sem estoque (0)" : `Restam ${qtd} un.`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>Total pendente: R$ {receivables.totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            <button
              type="button"
              onClick={() => navigate("/admin/financeiro")}
              className="text-[#19DDFF] font-bold hover:underline flex items-center gap-1"
            >
              Abrir Financeiro <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Nova Linha: Gráfico de Receitas e Divisão Peças/Serviços ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras de Receitas vs Despesas por Mês */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div className="space-y-0.5">
              <h3 className="font-bold text-white text-base">Faturamento & Despesas Mensais ({anoFoco})</h3>
              <p className="text-slate-500 text-xs">Clique em qualquer mês para filtrar os indicadores do período</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-[#0029F5] to-[#19DDFF]" />
                Receitas
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/75" />
                Despesas
              </span>
              <Calendar size={16} className="text-slate-400 ml-1" />
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-2 sm:gap-3 pt-8 px-1">
            {chartDataReceitas.map((data, idx) => {
              const recPct = data.valor > 0 ? Math.max(8, (data.valor / maxReceitaMes) * 100) : 4;
              const despPct = data.despesa > 0 ? Math.max(6, (data.despesa / maxReceitaMes) * 100) : 0;
              const isSelected = data.mesAno === selectedPeriod;
              const compactVal = formatCompactBRL(data.valor);

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedPeriod(data.mesAno)}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer relative"
                >
                  {/* Valor visível no topo da barra */}
                  <span
                    className={`text-[9px] font-extrabold tracking-tight transition-colors ${
                      isSelected
                        ? "text-[#19DDFF]"
                        : data.valor > 0
                        ? "text-slate-400 group-hover:text-white"
                        : "text-transparent"
                    }`}
                  >
                    {compactVal || "0"}
                  </span>

                  {/* Par de Barras: Receita + Despesa */}
                  <div className="w-full flex items-end justify-center gap-1 flex-1">
                    <div
                      className={`flex-1 rounded-t-lg transition-all relative border-t ${
                        isSelected
                          ? "bg-gradient-to-t from-[#0029F5] to-[#19DDFF] border-[#19DDFF] shadow-[0_0_18px_rgba(25,221,255,0.3)]"
                          : "bg-[#0029F5]/55 group-hover:bg-[#19DDFF]/80 border-white/10"
                      }`}
                      style={{ height: `${recPct}%` }}
                    />
                    {despPct > 0 && (
                      <div
                        className="w-2 sm:w-2.5 bg-rose-500/75 group-hover:bg-rose-400 rounded-t-md transition-all"
                        style={{ height: `${despPct}%` }}
                      />
                    )}
                  </div>

                  {/* Tooltip Completo */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 border border-white/15 px-3 py-2 rounded-xl text-[10px] text-white font-semibold whitespace-nowrap absolute bottom-full left-1/2 -translate-x-1/2 mb-1 shadow-2xl z-20 pointer-events-none space-y-0.5">
                    <div className="font-extrabold text-[#19DDFF] uppercase">{data.label}/{anoFoco}</div>
                    <div>Receita: <strong className="text-emerald-400">R$ {data.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
                    <div>Despesa: <strong className="text-rose-400">R$ {data.despesa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
                    <div>Lucro: <strong>R$ {data.lucro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
                  </div>

                  {/* Label do Mês */}
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-tight px-1.5 py-0.5 rounded-md transition-all ${
                      isSelected
                        ? "bg-[#0029F5] text-white shadow-sm"
                        : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  >
                    {data.label}
                  </span>
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

      {/* ── Nova Linha: Conversão e Status de Orçamentos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bloco Conversão Comercial */}
        <div className="glass p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-bold text-white text-base">Conversão Comercial</h3>
            <Percent size={18} className="text-slate-400" />
          </div>

          <div className="flex flex-col items-center py-5">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 112 112">
                <defs>
                  <linearGradient id="rgConvGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0029F5" />
                    <stop offset="100%" stopColor="#19DDFF" />
                  </linearGradient>
                </defs>
                <circle
                  cx="56"
                  cy="56"
                  r={convRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="10"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={convRadius}
                  fill="none"
                  stroke="url(#rgConvGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={convCircumference}
                  strokeDashoffset={convOffset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-white">{taxaConversao.toFixed(0)}%</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Conversão</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center mt-3 max-w-[200px]">
              Proporção de orçamentos aprovados/concluídos sobre o total emitido
            </p>
          </div>

          <div className="border-t border-white/5 pt-3 flex justify-between text-xs text-slate-400 font-semibold">
            <span>Emitidos: {totalOrcamentos}</span>
            <span>Ganhos: {aprovadosCount + concluidosCount}</span>
          </div>
        </div>

        {/* Bloco Status de Orçamentos */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-bold text-white text-base">Status de Orçamentos</h3>
            <Clock size={18} className="text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div 
              onClick={() => navigate("/admin/orcamentos?status=Pendente")}
              className="bg-white/2 p-3 rounded-xl border border-white/2 flex items-center gap-2 cursor-pointer hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <div className="text-xs">
                <span className="font-bold text-white block">{pendentesCount}</span>
                <span className="text-slate-500 block uppercase text-[9px] font-bold">Pendentes</span>
              </div>
            </div>
            <div 
              onClick={() => navigate("/admin/orcamentos?status=Aprovado")}
              className="bg-white/2 p-3 rounded-xl border border-white/2 flex items-center gap-2 cursor-pointer hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <div className="text-xs">
                <span className="font-bold text-white block">{aprovadosCount}</span>
                <span className="text-slate-500 block uppercase text-[9px] font-bold">Aprovados</span>
              </div>
            </div>
            <div 
              onClick={() => navigate("/admin/orcamentos?status=Recusado")}
              className="bg-white/2 p-3 rounded-xl border border-white/2 flex items-center gap-2 cursor-pointer hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <div className="text-xs">
                <span className="font-bold text-white block">{recusadosCount}</span>
                <span className="text-slate-500 block uppercase text-[9px] font-bold">Recusados</span>
              </div>
            </div>
            <div 
              onClick={() => navigate("/admin/orcamentos?status=Concluído")}
              className="bg-white/2 p-3 rounded-xl border border-white/2 flex items-center gap-2 cursor-pointer hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <div className="text-xs">
                <span className="font-bold text-white block">{concluidosCount}</span>
                <span className="text-slate-500 block uppercase text-[9px] font-bold">Concluídos</span>
              </div>
            </div>
            <div 
              onClick={() => navigate("/admin/orcamentos?status=Vencido")}
              className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/10 flex items-center gap-2 col-span-2 cursor-pointer hover:bg-rose-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <div className="text-xs flex justify-between items-center w-full">
                <span className="text-slate-400 block text-[9px] font-bold uppercase">Aguardando Resposta (Vencidos)</span>
                <span className="font-bold text-rose-400">{vencidosCount} orçamentos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco Alerta de Orçamentos Sem Resposta (X+ dias) */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="font-bold text-white text-base">⚠️ Alertas de Follow-up</h3>
              <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{configs.dias_alerta_followup}+ dias parados</span>
            </div>

            {alertasOrcamentos.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Nenhum orçamento pendente há mais de {configs.dias_alerta_followup} dias.</p>
            ) : (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {alertasOrcamentos.slice(0, 3).map(o => (
                  <div key={o.id} className="flex justify-between items-center bg-white/2 p-2.5 rounded-xl border border-white/2">
                    <div className="text-xs">
                      <span className="font-bold text-white block">{o.id} - {o.cliente_nome}</span>
                      <span className="text-slate-500 block">Emitido em {format(new Date(o.data_emissao + "T00:00:00"), "dd/MM/yy")}</span>
                    </div>
                    <button 
                      onClick={() => handleWhatsAppAlert(o)}
                      className="text-emerald-500 hover:text-white hover:bg-emerald-500/10 p-1.5 rounded-lg transition-all"
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
            <p className="text-[10px] text-slate-500 text-right mt-1">+ {alertasOrcamentos.length - 3} alertas ocultados</p>
          )}
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
                    <span className="text-xs text-[#19DDFF] font-bold">#{idx + 1}</span>
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
                      className="bg-[#0029F5] h-full rounded-full" 
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
                      className="bg-[#19DDFF] h-full rounded-full" 
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
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-bold text-white text-base">Últimos Orçamentos</h3>
            <button
              type="button"
              onClick={() => navigate("/admin/orcamentos")}
              className="text-xs font-bold text-[#19DDFF] hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowUpRight size={13} />
            </button>
          </div>
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
                  <tr
                    key={o.id}
                    onClick={() => navigate("/admin/orcamentos")}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
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
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-bold text-white text-base">Atividade Financeira Recente</h3>
            <button
              type="button"
              onClick={() => navigate("/admin/financeiro")}
              className="text-xs font-bold text-[#19DDFF] hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowUpRight size={13} />
            </button>
          </div>
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
                  <tr
                    key={f.id}
                    onClick={() => navigate("/admin/financeiro")}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
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

      {/* Toast de feedback do Dashboard */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl text-xs font-bold animate-fadeIn ${
            toast.type === "error"
              ? "bg-rose-950/95 border-rose-400/40 text-rose-200"
              : toast.type === "warning"
              ? "bg-amber-950/95 border-amber-400/40 text-amber-200"
              : "bg-emerald-950/95 border-emerald-400/40 text-emerald-200"
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
