import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  });
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [tempMeta, setTempMeta] = useState(5000);

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
      alert("Por favor, insira um valor válido para a meta.");
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
    } catch (e) {
      console.error("Erro ao salvar meta no banco:", e);
      alert("Erro ao salvar meta no banco de dados.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <span className="ml-3">Carregando dados do painel...</span>
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

  // --- VENDAS DE PRODUTOS E SERVIÇOS NO PERÍODO ---
  let totalVendasProdutos = 0;
  let totalVendasServicos = 0;
  
  itensDeOrcamento.forEach(item => {
    const parentOrc = orcamentos.find(o => o.id === item.orcamento_id);
    if (parentOrc && parentOrc.data_emissao?.startsWith(selectedPeriod) && (parentOrc.status === "Aprovado" || parentOrc.status === "Concluído")) {
      const valor = Number(item.total || 0);
      const isPeca = item.tipo === "Peça";

      if (isPeca) {
        totalVendasProdutos += valor;
      } else {
        totalVendasServicos += valor;
      }
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
  let osRecebido = 0;
  let osEmDiagnostico = 0;
  let osAguardandoPeca = 0;
  let osEmExecucao = 0;
  let osProntoRetirada = 0;
  let osAtrasadas = 0;

  const hojeStr = new Date().toISOString().split("T")[0];
  const ordensDoPeriodo = ordens.filter(os => os.data_abertura?.startsWith(selectedPeriod));

  ordensDoPeriodo.forEach(os => {
    const status = os.status;
    if (status !== "entregue" && status !== "cancelado") {
      if (status === "recebido") osRecebido++;
      else if (status === "em_diagnostico") osEmDiagnostico++;
      else if (status === "aguardando_peca") osAguardandoPeca++;
      else if (status === "em_execucao") osEmExecucao++;
      else if (status === "pronto_retirada") osProntoRetirada++;

      if (os.data_entrega_prevista && os.data_entrega_prevista < hojeStr) {
        osAtrasadas++;
      }
    }
  });

  const totalOSAndamento = osRecebido + osEmDiagnostico + osAguardandoPeca + osEmExecucao + osProntoRetirada;

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
          <p className="text-slate-400 text-sm mt-1">Resumo operacional, financeiro e CRM da RG TECH Computadores</p>
        </div>
        
        {/* Seletor de Período */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Período:</label>
          <select
            className="bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-[#4A47FF] transition-all cursor-pointer shadow-lg"
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
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Faturamento Realizado</span>
            <span className="text-2xl font-bold text-white block">R$ {receitasRecebidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-500 block">Lançamentos compensados</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/30"></div>
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
            <div className="w-10 h-10 bg-[#2D2B7A]/20 text-[#c2c1ff] rounded-xl flex items-center justify-center shrink-0">
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
                className="bg-gradient-to-r from-[#2D2B7A] to-[#4A47FF] h-full rounded-full transition-all duration-500" 
                style={{ width: `${percentMeta}%` }}
              />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-[#2D2B7A]"></div>
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
            {temComparativo ? (
              <>
                <span className={`text-2xl font-bold block ${crescimentoPercentual >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                  {crescimentoPercentual >= 0 ? "+" : ""}{crescimentoPercentual.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-500 block">Este mês vs. mês anterior</span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-slate-300 block py-1">Sem comparativo</span>
                <span className="text-xs text-slate-500 block">Primeiro mês de operação</span>
              </>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            !temComparativo ? "bg-slate-500/10 text-slate-400" : (crescimentoPercentual >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")
          }`}>
            <Percent size={22} />
          </div>
          <div className={`absolute bottom-0 left-0 w-full h-1 ${
            !temComparativo ? "bg-slate-500/30" : (crescimentoPercentual >= 0 ? "bg-emerald-500/30" : "bg-rose-500/30")
          }`}></div>
        </div>
      </div>

      {/* ── Seção de Ordens de Serviço (OS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card: OS em Andamento */}
        <div className="glass p-6 rounded-2xl shadow-xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <Wrench className="text-[#4A47FF]" size={20} />
              <h3 className="font-bold text-white text-base">OS em Andamento ({totalOSAndamento})</h3>
            </div>
            <span className="text-slate-500 text-xs font-medium">Status de execução atual</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white/2 p-3.5 rounded-xl border border-white/5 text-center space-y-1">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Recebido</span>
              <span className="text-xl font-bold text-blue-400 block">{osRecebido}</span>
            </div>
            <div className="bg-white/2 p-3.5 rounded-xl border border-white/5 text-center space-y-1">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Diagnóstico</span>
              <span className="text-xl font-bold text-sky-400 block">{osEmDiagnostico}</span>
            </div>
            <div className="bg-white/2 p-3.5 rounded-xl border border-white/5 text-center space-y-1">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Falta Peça</span>
              <span className="text-xl font-bold text-amber-500 block">{osAguardandoPeca}</span>
            </div>
            <div className="bg-white/2 p-3.5 rounded-xl border border-white/5 text-center space-y-1">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Execução</span>
              <span className="text-xl font-bold text-[#4A47FF] block">{osEmExecucao}</span>
            </div>
            <div className="bg-white/2 p-3.5 rounded-xl border border-white/5 text-center space-y-1">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Retirada</span>
              <span className="text-xl font-bold text-emerald-400 block">{osProntoRetirada}</span>
            </div>
          </div>
        </div>

        {/* Card: OS Atrasadas */}
        <div className="glass p-6 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">OS Atrasadas</span>
            <span className={`text-3xl font-extrabold block ${osAtrasadas > 0 ? "text-rose-500 animate-pulse" : "text-slate-300"}`}>
              {osAtrasadas}
            </span>
            <span className="text-xs text-slate-500 block">
              {osAtrasadas > 0 ? "Requer atenção imediata" : "Nenhum atraso pendente"}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            osAtrasadas > 0 ? "bg-rose-500/15 text-rose-400 border border-rose-500/30" : "bg-slate-500/10 text-slate-500 border border-slate-500/10"
          }`}>
            <Clock size={24} />
          </div>
          <div className={`absolute bottom-0 left-0 w-full h-1 ${osAtrasadas > 0 ? "bg-rose-500/40" : "bg-white/5"}`}></div>
        </div>
      </div>

      {/* ── Nova Linha: Gráfico de Receitas e Divisão Peças/Serviços ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras de Receitas por Mês */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="space-y-0.5">
              <h3 className="font-bold text-white text-base">Faturamento Mensal ({anoFoco})</h3>
              <p className="text-slate-500 text-xs">Receitas compensadas mês a mês</p>
            </div>
            <Calendar size={18} className="text-slate-400" />
          </div>

          <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
            {chartDataReceitas.map((data, idx) => {
              const heightPercent = Math.max(5, (data.valor / maxReceitaMes) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer relative">
                  
                  {/* Barra */}
                  <div 
                    className="w-full bg-[#2D2B7A]/50 hover:bg-[#4A47FF] transition-all rounded-t-lg relative border-t border-white/10 shadow-[0_0_10px_rgba(45,43,122,0.1)]"
                    style={{ height: `${heightPercent}%` }}
                  >
                    {/* Tooltip valor */}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] text-white font-bold whitespace-nowrap absolute bottom-full left-1/2 -translate-x-1/2 mb-2 shadow-2xl z-10 pointer-events-none">
                      R$ {data.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
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

      {/* ── Nova Linha: Conversão e Status de Orçamentos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bloco Conversão Comercial */}
        <div className="glass p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-bold text-white text-base">Conversão Comercial</h3>
            <Percent size={18} className="text-slate-400" />
          </div>

          <div className="flex flex-col items-center py-6">
            <div className="relative flex items-center justify-center">
              {/* Outer Ring */}
              <div className="w-28 h-28 rounded-full border-8 border-white/5 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{taxaConversao.toFixed(0)}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center mt-4 max-w-[200px]">
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
