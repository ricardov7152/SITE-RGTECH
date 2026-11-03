import { useEffect, useState } from "react";
import { db } from "../../services/supabase";
import { Plus, Search, Edit2, Trash2, X, TrendingUp, TrendingDown, CheckSquare, AlertCircle, RefreshCw, Calendar } from "lucide-react";
import { format } from "date-fns";

const getMonthBounds = (offset = 0) => {
  const d = new Date();
  // Ajuste seguro para evitar problemas de virada de ano/mês
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear();
  const m = d.getMonth();
  
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  
  const pad = (n) => String(n).padStart(2, '0');
  
  return {
    start: `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-01`,
    end: `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`
  };
};

export default function Financeiro() {
  const [financeiro, setFinanceiro] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [loading, setLoading] = useState(true);

  // Filtros de Período
  const [filterPeriodo, setFilterPeriodo] = useState("Este Mês"); // Este Mês, Mês Anterior, Personalizado
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Estados do Modal Lançamento Manual / Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tipo, setTipo] = useState("Receita"); // Receita ou Despesa
  const [categoria, setCategoria] = useState("Orçamento");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState(0);
  const [status, setStatus] = useState("Pendente"); // Pendente ou Pago
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split("T")[0]);
  const [dataPagamento, setDataPagamento] = useState("");
  const [banco, setBanco] = useState("");
  const [meioPagamento, setMeioPagamento] = useState("PIX");
  const [valorPix, setValorPix] = useState(0);
  const [valorCartao, setValorCartao] = useState(0);
  const [valorDinheiro, setValorDinheiro] = useState(0);
  const [desconto, setDesconto] = useState(0);
  const [observacoes, setObservacoes] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState("Mensal");

  // Estado do Modal de Conciliação Rápida (para Orçamentos)
  const [conciliationModalOpen, setConciliationModalOpen] = useState(false);
  const [conciliatingItem, setConciliatingItem] = useState(null);

  const processAutoRecurring = async (finList) => {
    // 1. Filtrar templates ativos com recorrência mensal
    const templates = finList.filter(f => f.recorrente === true && f.frequencia === "Mensal");
    if (templates.length === 0) return finList;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-indexed

    let hasAddedAny = false;
    let listCopy = [...finList];

    // Identificar descrições únicas de despesas recorrentes
    const uniqueDescriptions = Array.from(new Set(templates.map(t => t.descricao)));

    for (const desc of uniqueDescriptions) {
      // Achar todas as instâncias desse lançamento
      const identicals = listCopy.filter(f => f.descricao === desc && f.recorrente === true);
      const temp = identicals[0]; // Usar o primeiro como template base
      
      const dates = identicals.map(f => f.data_vencimento).filter(Boolean);
      if (dates.length === 0) continue;
      
      dates.sort();
      const lastDateStr = dates[dates.length - 1]; // Data mais recente: YYYY-MM-DD
      
      const lastYear = parseInt(lastDateStr.slice(0, 4), 10);
      const lastMonth = parseInt(lastDateStr.slice(5, 7), 10);
      const dayStr = lastDateStr.slice(8, 10);

      let iterateYear = lastYear;
      let iterateMonth = lastMonth;

      while (true) {
        iterateMonth++;
        if (iterateMonth > 12) {
          iterateMonth = 1;
          iterateYear++;
        }

        // Se passamos do mês/ano atual, paramos
        if (iterateYear > currentYear || (iterateYear === currentYear && iterateMonth > currentMonth)) {
          break;
        }

        const pad = (n) => String(n).padStart(2, '0');
        const targetDate = `${iterateYear}-${pad(iterateMonth)}-${dayStr}`;
        const targetMonthStr = `${iterateYear}-${pad(iterateMonth)}`;

        // Verificar se já existe lançamento nesse mês
        const alreadyExists = listCopy.some(f => 
          f.descricao === desc && 
          f.data_vencimento && 
          f.data_vencimento.startsWith(targetMonthStr)
        );

        if (!alreadyExists) {
          const newRecur = {
            tipo: temp.tipo,
            categoria: temp.categoria,
            descricao: temp.descricao,
            valor: Number(temp.valor),
            status: "Pendente",
            data_vencimento: targetDate,
            recorrente: true,
            frequencia: "Mensal"
          };

          try {
            const { data: inserted } = await db.financeiro.insert(newRecur);
            if (inserted) {
              listCopy.push(inserted);
              hasAddedAny = true;
            }
          } catch (e) {
            console.error("Erro ao gerar despesa recorrente mensal automática:", e);
          }
        }
      }
    }

    if (hasAddedAny) {
      alert("Aviso: Lançamentos recorrentes mensais foram gerados automaticamente para o mês atual!");
    }

    return listCopy;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: finData } = await db.financeiro.list();
      const { data: cliData } = await db.clientes.list();
      const { data: bancoData } = await db.bancos.list();
      
      const activeFinData = finData || [];
      const updatedFin = await processAutoRecurring(activeFinData);
      
      setFinanceiro(updatedFin);
      setClientes(cliData || []);
      setBancos(bancoData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNew = () => {
    setEditingId(null);
    setTipo("Receita");
    setCategoria("Orçamento");
    setDescricao("");
    setValor(0);
    setStatus("Pendente");
    setDataVencimento(new Date().toISOString().split("T")[0]);
    setDataPagamento("");
    setBanco(bancos[0]?.nome || "");
    setMeioPagamento("PIX");
    setValorPix(0);
    setValorCartao(0);
    setValorDinheiro(0);
    setDesconto(0);
    setObservacoes("");
    setRecorrente(false);
    setFrequencia("Mensal");
    setModalOpen(true);
  };

  const handleOpenEdit = (f) => {
    setEditingId(f.id);
    setTipo(f.tipo || "Receita");
    setCategoria(f.categoria || "Orçamento");
    setDescricao(f.descricao || "");
    setValor(Number(f.valor || 0));
    setStatus(f.status || "Pendente");
    setDataVencimento(f.data_vencimento || new Date().toISOString().split("T")[0]);
    setDataPagamento(f.data_pagamento || "");
    setBanco(f.banco || bancos[0]?.nome || "");
    setMeioPagamento(f.meio_pagamento || "PIX");
    setValorPix(Number(f.valor_pix || 0));
    setValorCartao(Number(f.valor_cartao || 0));
    setValorDinheiro(Number(f.valor_dinheiro || 0));
    setDesconto(Number(f.desconto || 0));
    setObservacoes(f.observacoes || "");
    setRecorrente(!!f.recorrente);
    setFrequencia(f.frequencia || "Mensal");
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      tipo,
      categoria,
      descricao,
      valor: Number(valor),
      status,
      data_vencimento: dataVencimento,
      data_pagamento: status === "Pago" ? (dataPagamento || new Date().toISOString().split("T")[0]) : null,
      banco: status === "Pago" ? banco : null,
      meio_pagamento: status === "Pago" ? meioPagamento : null,
      valor_pix: status === "Pago" && meioPagamento === "PIX" ? Number(valor) : Number(valorPix),
      valor_cartao: status === "Pago" && meioPagamento === "Cartão de Crédito" ? Number(valor) : Number(valorCartao),
      valor_dinheiro: status === "Pago" && meioPagamento === "Dinheiro" ? Number(valor) : Number(valorDinheiro),
      desconto: Number(desconto),
      observacoes,
      recorrente: recorrente,
      frequencia: recorrente ? frequencia : null
    };

    try {
      if (editingId) {
        await db.financeiro.update(editingId, payload);
      } else {
        await db.financeiro.insert(payload);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar lançamento financeiro.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este lançamento financeiro?")) return;
    try {
      await db.financeiro.delete(id);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir lançamento.");
    }
  };

  // Abrir Conciliação Rápida
  const handleOpenConciliation = (item) => {
    setConciliatingItem(item);
    setDataPagamento(new Date().toISOString().split("T")[0]);
    setBanco(bancos[0]?.nome || "");
    setMeioPagamento("PIX");
    setValorPix(Number(item.valor));
    setValorCartao(0);
    setValorDinheiro(0);
    setDesconto(0);
    setObservacoes("");
    setConciliationModalOpen(true);
  };

  // Submeter Conciliação Rápida
  const handleConciliationSubmit = async (e) => {
    e.preventDefault();
    if (!conciliatingItem) return;

    // Se for misto, garantir que a soma bate
    if (meioPagamento === "Misto") {
      const soma = Number(valorPix) + Number(valorCartao) + Number(valorDinheiro);
      if (Math.abs(soma - Number(conciliatingItem.valor) + Number(desconto)) > 0.05) {
        if (!window.confirm(`Atenção: A soma dos valores (R$ ${soma.toFixed(2)}) e do desconto (R$ ${Number(desconto).toFixed(2)}) não bate exatamente com o total do lançamento (R$ ${Number(conciliatingItem.valor).toFixed(2)}). Deseja continuar mesmo assim?`)) {
          return;
        }
      }
    }

    const payload = {
      status: "Pago",
      data_pagamento: dataPagamento || new Date().toISOString().split("T")[0],
      banco,
      meio_pagamento: meioPagamento,
      valor_pix: meioPagamento === "PIX" ? Number(conciliatingItem.valor) : (meioPagamento === "Misto" ? Number(valorPix) : 0),
      valor_cartao: meioPagamento === "Cartão de Crédito" ? Number(conciliatingItem.valor) : (meioPagamento === "Misto" ? Number(valorCartao) : 0),
      valor_dinheiro: meioPagamento === "Dinheiro" ? Number(conciliatingItem.valor) : (meioPagamento === "Misto" ? Number(valorDinheiro) : 0),
      desconto: Number(desconto),
      observacoes: observacoes ? `${observacoes}\nConciliado automaticamente.` : "Conciliado automaticamente."
    };

    try {
      await db.financeiro.update(conciliatingItem.id, payload);
      setConciliationModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao realizar conciliação.");
    }
  };

  // Helper de Projeções de data futura
  const getFutureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const getTransactionDate = (f) => {
    return f.status === "Pago" ? (f.data_pagamento || f.data_vencimento) : f.data_vencimento;
  };

  // Obter limites de datas baseado no filtro de período
  const getPeriodDates = () => {
    if (filterPeriodo === "Este Mês") {
      return getMonthBounds(0);
    } else if (filterPeriodo === "Mês Anterior") {
      return getMonthBounds(-1);
    } else if (filterPeriodo === "Personalizado") {
      return { start: customStart, end: customEnd };
    }
    return { start: "", end: "" };
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  const isWithinPeriod = (dateStr) => {
    if (!dateStr) return false;
    if (!periodStart && !periodEnd) return true;
    if (periodStart && dateStr < periodStart) return false;
    if (periodEnd && dateStr > periodEnd) return false;
    return true;
  };

  // Filtragem e Classificação dos Lançamentos
  const filteredFinanceiro = financeiro.filter(f => {
    const transactionDate = getTransactionDate(f);
    const matchesPeriod = isWithinPeriod(transactionDate);
    const matchesSearch = f.descricao.toLowerCase().includes(search.toLowerCase()) ||
                          (f.categoria && f.categoria.toLowerCase().includes(search.toLowerCase()));
    const matchesTipo = filterTipo === "Todos" || f.tipo === filterTipo;
    const matchesStatus = filterStatus === "Todos" || f.status === filterStatus;
    
    return matchesPeriod && matchesSearch && matchesTipo && matchesStatus;
  });

  // Ordenar decrescente por data para a listagem
  const sortedFilteredFinanceiro = [...filteredFinanceiro].sort((a, b) => {
    const dateA = getTransactionDate(a);
    const dateB = getTransactionDate(b);
    return new Date(dateB) - new Date(dateA);
  });

  // Métricas do Período Filtrado (Compensadas/Pagas)
  const receitasCompensadas = financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago" && isWithinPeriod(getTransactionDate(f)))
    .reduce((sum, f) => sum + Number(f.valor), 0);

  const despesasPagas = financeiro
    .filter(f => f.tipo === "Despesa" && f.status === "Pago" && isWithinPeriod(getTransactionDate(f)))
    .reduce((sum, f) => sum + Number(f.valor), 0);

  const resultadoPeriodo = receitasCompensadas - despesasPagas;

  // Saldo real histórico geral atual
  const totalReceitasGeral = financeiro
    .filter(f => f.tipo === "Receita" && f.status === "Pago")
    .reduce((sum, f) => sum + Number(f.valor), 0);

  const totalDespesasGeral = financeiro
    .filter(f => f.tipo === "Despesa" && f.status === "Pago")
    .reduce((sum, f) => sum + Number(f.valor), 0);

  const saldoAtualReal = totalReceitasGeral - totalDespesasGeral;

  // Projeções futuras (vencimentos pendentes)
  const getProjections = (days) => {
    const limitDate = getFutureDate(days);
    const pendentes = financeiro.filter(f => f.status === "Pendente" && f.data_vencimento <= limitDate);
    
    const entradas = pendentes.filter(f => f.tipo === "Receita").reduce((sum, f) => sum + Number(f.valor), 0);
    const saidas = pendentes.filter(f => f.tipo === "Despesa").reduce((sum, f) => sum + Number(f.valor), 0);
    
    return {
      entradas,
      saidas,
      saldoProjetado: saldoAtualReal + entradas - saidas
    };
  };

  const proj7 = getProjections(7);
  const proj15 = getProjections(15);
  const proj30 = getProjections(30);

  // Verificar e Gerar Recorrências do Mês Atual
  const boundsMêsAtual = getMonthBounds(0);
  const recorrenciasGeradas = financeiro.some(f => {
    const fDate = f.data_vencimento;
    return fDate >= boundsMêsAtual.start && fDate <= boundsMêsAtual.end && 
      (f.categoria === "Aluguel" || f.categoria === "Infraestrutura" || f.categoria === "Ferramentas");
  });

  const handleGerarRecorrencias = async () => {
    const currentYearMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const itemsToGenerate = [
      {
        tipo: "Despesa",
        categoria: "Aluguel",
        descricao: "Aluguel Mensal - Ponto Comercial",
        valor: 1500.00,
        status: "Pendente",
        data_vencimento: `${currentYearMonth}-10`,
      },
      {
        tipo: "Despesa",
        categoria: "Infraestrutura",
        descricao: "Internet Fibra e Energia (Luz/Água)",
        valor: 250.00,
        status: "Pendente",
        data_vencimento: `${currentYearMonth}-15`,
      },
      {
        tipo: "Despesa",
        categoria: "Ferramentas",
        descricao: "Assinaturas ERP e Licenças de Software",
        valor: 120.00,
        status: "Pendente",
        data_vencimento: `${currentYearMonth}-05`,
      }
    ];

    try {
      for (const item of itemsToGenerate) {
        await db.financeiro.insert(item);
      }
      alert("Despesas recorrentes do mês geradas com sucesso como Pendentes!");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar despesas recorrentes.");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Módulo Financeiro</h1>
          <p className="text-slate-400 text-sm mt-1">Fluxo de caixa, receitas, despesas e conciliação bancária</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="flex items-center gap-2 bg-[#2D2B7A] hover:bg-[#4A47FF] px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all"
        >
          <Plus size={16} /> Novo Lançamento Manual
        </button>
      </div>

      {/* Alerta de Despesas Recorrentes Pendentes */}
      {!recorrenciasGeradas && !loading && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-amber-400 shrink-0" size={24} />
            <div>
              <p className="text-sm font-bold text-white">Despesas Recorrentes Pendentes</p>
              <p className="text-xs text-slate-400">As despesas fixas recorrentes (Aluguel, Internet, Softwares) deste mês ainda não foram lançadas.</p>
            </div>
          </div>
          <button
            onClick={handleGerarRecorrencias}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-450 text-[#0d0d0d] font-bold text-xs px-4 py-2 rounded-xl transition-all whitespace-nowrap"
          >
            <RefreshCw size={14} /> Gerar Recorrências do Mês
          </button>
        </div>
      )}

      {/* Caixa de Resumo Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Receita Acumulada */}
        <div className="glass p-5 rounded-2xl flex items-center justify-between border border-emerald-500/10">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">Receitas Compensadas</span>
            <h2 className="text-xl font-bold text-emerald-400">
              R$ {receitasCompensadas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Despesa Acumulada */}
        <div className="glass p-5 rounded-2xl flex items-center justify-between border border-rose-500/10">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">Despesas Pagas</span>
            <h2 className="text-xl font-bold text-rose-500">
              R$ {despesasPagas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-450 flex items-center justify-center shrink-0">
            <TrendingDown size={20} />
          </div>
        </div>

        {/* Resultado do Período */}
        <div className={`glass p-5 rounded-2xl flex items-center justify-between border ${
          resultadoPeriodo >= 0 ? "border-emerald-500/25 bg-emerald-950/5" : "border-rose-500/25 bg-rose-950/5"
        }`}>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">Resultado do Período</span>
            <h2 className={`text-xl font-bold ${resultadoPeriodo >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
              {resultadoPeriodo >= 0 ? "+" : ""} R$ {resultadoPeriodo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            resultadoPeriodo >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
          }`}>
            <Calendar size={20} />
          </div>
        </div>
      </div>

      {/* Fluxo de Caixa Projetado */}
      <div className="glass p-6 rounded-2xl space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white">Fluxo de Caixa Projetado (Previsibilidade)</h3>
          <p className="text-xs text-slate-500">Projeção considerando saldo atual real de R$ {saldoAtualReal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} + contas pendentes no período</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-2">
            <span className="block text-xs font-bold text-slate-400 uppercase">Próximos 7 Dias</span>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Entradas Previstas:</span>
              <span className="text-emerald-400 font-semibold">+ R$ {proj7.entradas.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Saídas Previstas:</span>
              <span className="text-rose-400 font-semibold">- R$ {proj7.saidas.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-300 border-t border-white/5 pt-2">
              <span>Saldo Projetado:</span>
              <span className={proj7.saldoProjetado >= 0 ? "text-emerald-400" : "text-rose-500"}>
                R$ {proj7.saldoProjetado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-2">
            <span className="block text-xs font-bold text-slate-400 uppercase">Próximos 15 Dias</span>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Entradas Previstas:</span>
              <span className="text-emerald-400 font-semibold">+ R$ {proj15.entradas.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Saídas Previstas:</span>
              <span className="text-rose-400 font-semibold">- R$ {proj15.saidas.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-300 border-t border-white/5 pt-2">
              <span>Saldo Projetado:</span>
              <span className={proj15.saldoProjetado >= 0 ? "text-emerald-400" : "text-rose-500"}>
                R$ {proj15.saldoProjetado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-2">
            <span className="block text-xs font-bold text-slate-400 uppercase">Próximos 30 Dias</span>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Entradas Previstas:</span>
              <span className="text-emerald-400 font-semibold">+ R$ {proj30.entradas.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Saídas Previstas:</span>
              <span className="text-rose-400 font-semibold">- R$ {proj30.saidas.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-300 border-t border-white/5 pt-2">
              <span>Saldo Projetado:</span>
              <span className={proj30.saldoProjetado >= 0 ? "text-emerald-400" : "text-rose-500"}>
                R$ {proj30.saldoProjetado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Listagem */}
      <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por descrição ou categoria..."
              className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select 
              className="bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none flex-1 md:flex-none"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option value="Todos">Todos os Tipos</option>
              <option value="Receita">Apenas Entradas (Receitas)</option>
              <option value="Despesa">Apenas Saídas (Despesas)</option>
            </select>
            <select 
              className="bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none flex-1 md:flex-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="Todos">Todos os Status</option>
              <option value="Pago">Compensados (Pago)</option>
              <option value="Pendente">A Conferir (Pendente)</option>
            </select>
            <select 
              className="bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none flex-1 md:flex-none"
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value)}
            >
              <option value="Este Mês">Este Mês</option>
              <option value="Mês Anterior">Mês Anterior</option>
              <option value="Personalizado">Período Personalizado</option>
            </select>
          </div>
          {filterPeriodo === "Personalizado" && (
            <div className="flex gap-2 items-center w-full md:w-auto bg-white/2 p-2 rounded-xl border border-white/5">
              <input 
                type="date"
                className="bg-[#0D0D0D] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span className="text-slate-500 text-xs">até</span>
              <input 
                type="date"
                className="bg-[#0D0D0D] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-10">Carregando fluxo financeiro...</div>
        ) : sortedFilteredFinanceiro.length === 0 ? (
          <div className="text-center text-slate-500 py-10">Nenhum lançamento financeiro encontrado no período selecionado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 font-bold uppercase">
                  <th className="pb-3 pt-1">Vencimento</th>
                  <th className="pb-3 pt-1">Tipo</th>
                  <th className="pb-3 pt-1">Categoria</th>
                  <th className="pb-3 pt-1">Descrição</th>
                  <th className="pb-3 pt-1">Valor</th>
                  <th className="pb-3 pt-1">Forma/Banco</th>
                  <th className="pb-3 pt-1">Status</th>
                  <th className="pb-3 pt-1 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedFilteredFinanceiro.map((f) => (
                  <tr key={f.id} className="hover:bg-white/2">
                    <td className="py-3.5">
                      {f.data_vencimento ? format(new Date(f.data_vencimento + "T00:00:00"), "dd/MM/yyyy") : "N/D"}
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        f.tipo === "Receita" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      }`}>{f.tipo}</span>
                    </td>
                    <td className="py-3.5">
                      <span className="bg-white/5 text-slate-300 px-2 py-0.5 rounded text-xs">
                        {f.categoria}
                      </span>
                    </td>
                    <td className="py-3.5 font-medium text-white max-w-[200px] truncate">{f.descricao}</td>
                    <td className={`py-3.5 font-bold ${f.tipo === "Receita" ? "text-emerald-400" : "text-rose-500"}`}>
                      {f.tipo === "Receita" ? "+" : "-"} R$ {Number(f.valor).toFixed(2)}
                    </td>
                    <td className="py-3.5 text-xs">
                      {f.status === "Pago" ? `${f.meio_pagamento || "PIX"} (${f.banco || "Nubank"})` : "Aguardando"}
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit ${
                        f.status === "Pago" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {f.status === "Pago" ? "Compensado" : "A Conferir"}
                      </span>
                    </td>
                    <td className="py-3.5 text-right space-x-1 whitespace-nowrap">
                      {/* Conciliação rápida */}
                      {f.status === "Pendente" && (
                        <button 
                          onClick={() => handleOpenConciliation(f)}
                          className="text-emerald-500 hover:text-emerald-400 p-1 hover:bg-emerald-500/5 rounded-lg transition-all"
                          title="Conciliar / Confirmar Pagamento"
                        >
                          <CheckSquare size={16} />
                        </button>
                      )}

                      <button 
                        onClick={() => handleOpenEdit(f)}
                        className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(f.id)}
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

      {/* ── MODAL CADASTRO / EDIÇÃO MANUAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-[#0D0D0D]">
              <h3 className="font-bold text-white text-lg">
                {editingId ? "Editar Lançamento" : "Novo Lançamento Financeiro"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-white/5 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Lançamento *</label>
                  <select 
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                  >
                    <option value="Receita">Receita (Entrada)</option>
                    <option value="Despesa">Despesa (Saída)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoria *</label>
                  <select 
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    <option value="Orçamento">Orçamento</option>
                    <option value="Peças">Compra de Peças</option>
                    <option value="Marketing">Anúncios/Marketing</option>
                    <option value="Infraestrutura">Internet/Luz/Telefone</option>
                    <option value="Aluguel">Aluguel</option>
                    <option value="Pró-labore">Pró-labore</option>
                    <option value="Salários de Funcionários">Salários de Funcionários</option>
                    <option value="Impostos/DAS">Impostos/DAS</option>
                    <option value="ICMS e ICMS Substituição Tributária">ICMS e ICMS Substituição Tributária</option>
                    <option value="Ferramentas">Assinaturas/Softwares</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Formatação Notebook - Ricardo Bertollo"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Valor Total (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Data Vencimento *</label>
                  <input 
                    type="date" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Status Lançamento *</label>
                  <select 
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Pendente">A Conferir (Pendente)</option>
                    <option value="Pago">Compensado (Pago)</option>
                  </select>
                </div>
                
                {status === "Pago" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Data de Compensação</label>
                    <input 
                      type="date" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {status === "Pago" && (
                <div className="p-4 bg-white/2 rounded-xl border border-white/5 grid grid-cols-2 gap-4 animate-fadeIn">
                  <div className="col-span-2">
                    <span className="block text-xs font-bold text-[#c2c1ff] uppercase">Conciliação Bancária</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Banco Destino/Origem</label>
                    <select 
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                      value={banco}
                      onChange={(e) => setBanco(e.target.value)}
                    >
                      <option value="">-- Selecione o Banco --</option>
                      {bancos.map(b => (
                        <option key={b.id} value={b.nome}>{b.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Meio de Pagamento</label>
                    <select 
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                      value={meioPagamento}
                      onChange={(e) => setMeioPagamento(e.target.value)}
                    >
                      <option value="PIX">PIX</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                      <option value="Dinheiro">Dinheiro/Caixa</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Seção de Recorrência */}
              <div className="p-4 bg-white/2 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <input 
                    type="checkbox" 
                    id="recorrenteCheckbox"
                    checked={recorrente} 
                    onChange={(e) => setRecorrente(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-[#0d0d0d] text-[#2d2b7a] focus:ring-[#2d2b7a] focus:ring-offset-[#0d0d0d] focus:ring-2"
                  />
                  <label htmlFor="recorrenteCheckbox" className="text-sm font-medium text-slate-300 cursor-pointer select-none">
                    Lançamento Recorrente?
                  </label>
                </div>
                {recorrente && (
                  <div className="animate-fadeIn">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Frequência da Recorrência</label>
                    <select 
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                      value={frequencia}
                      onChange={(e) => setFrequencia(e.target.value)}
                    >
                      <option value="Mensal">Mensal (Todo mês)</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Observações / Notas</label>
                <textarea 
                  rows="2" 
                  placeholder="Lançamento manual referente a..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none resize-vertical"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 border border-white/10 text-slate-300 font-semibold text-sm rounded-xl hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-[#2D2B7A] hover:bg-[#4A47FF] text-white font-bold text-sm rounded-xl shadow-lg transition-all"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CONCILIAÇÃO RÁPIDA (BUDGET CONCILIATION) ── */}
      {conciliationModalOpen && conciliatingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-[#0D0D0D]">
              <h3 className="font-bold text-white text-base">Confirmar Recebimento (Conciliação)</h3>
              <button onClick={() => setConciliationModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConciliationSubmit} className="p-6 space-y-4">
              <div className="bg-white/2 border border-white/5 p-4 rounded-xl text-xs space-y-1">
                <p className="text-slate-400"><strong>Lançamento:</strong> {conciliatingItem.descricao}</p>
                <p className="text-slate-400"><strong>Valor Total:</strong> R$ {Number(conciliatingItem.valor).toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Data do Pagamento *</label>
                  <input 
                    type="date" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Banco Destino *</label>
                  <select 
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                  >
                    <option value="">-- Selecione o Banco --</option>
                    {bancos.map(b => (
                      <option key={b.id} value={b.nome}>{b.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Meio de Pagamento *</label>
                <select 
                  className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  value={meioPagamento}
                  onChange={(e) => setMeioPagamento(e.target.value)}
                >
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Dinheiro">Dinheiro/Caixa</option>
                  <option value="Misto">Misto (Múltiplas Formas)</option>
                </select>
              </div>

              {/* Se for Misto, abre campos de parcelamento de valor */}
              {meioPagamento === "Misto" && (
                <div className="p-4 bg-white/2 border border-white/5 rounded-xl space-y-3 animate-fadeIn">
                  <span className="block text-xs font-bold text-purple-400 uppercase">Detalhamento Misto</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Pago no PIX</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                        value={valorPix}
                        onChange={(e) => setValorPix(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">No Cartão</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                        value={valorCartao}
                        onChange={(e) => setValorCartao(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Em Dinheiro</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                        value={valorDinheiro}
                        onChange={(e) => setValorDinheiro(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 border-t border-white/5 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Desconto Concedido no Pagamento (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
                    placeholder="0.00"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notas de Conciliação</label>
                <textarea 
                  rows="2" 
                  placeholder="Ex: Pago parte em pix e restante em cartão parcelado..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white resize-vertical"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
                <button 
                  type="button" 
                  onClick={() => setConciliationModalOpen(false)}
                  className="px-5 py-2.5 border border-white/10 text-slate-300 font-semibold text-sm rounded-xl hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all"
                >
                  Confirmar e Faturar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
