import { normalizeKanbanStatus } from "../services/supabase";
import { localDateISO } from "./date";

const STAGE_META = [
  { id: "recebido", label: "Recebido", color: "bg-sky-400" },
  { id: "em_analise", label: "Em análise", color: "bg-cyan-400" },
  { id: "orcamento_enviado", label: "Orç. enviado", color: "bg-indigo-400" },
  { id: "aguardando_peca", label: "Aguard. peça", color: "bg-amber-400" },
  { id: "aprovado_execucao", label: "Em execução", color: "bg-[#19DDFF]" },
  { id: "finalizado", label: "Pronto p/ retirada", color: "bg-emerald-400" },
];

function addDaysISO(baseIso, days) {
  const d = new Date(`${baseIso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localDateISO(d);
}

function diffDaysStr(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return null;
  const s = new Date(`${startDateStr.slice(0, 10)}T00:00:00`);
  const e = new Date(`${endDateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000));
}

export function formatDurationDays(daysFloat) {
  if (daysFloat === null || daysFloat === undefined || Number.isNaN(daysFloat)) {
    return "—";
  }
  if (daysFloat < 0.05) return "< 1h";
  if (daysFloat < 1) {
    const hours = Math.max(1, Math.round(daysFloat * 24));
    return `${hours}h`;
  }
  return `${daysFloat.toFixed(1).replace(".", ",")}d`;
}

/**
 * 1. Comparativo Justo (MTD quando for o mês atual, ou mês completo quando for mês fechado)
 */
export function computeFairComparison({
  financeiro = [],
  selectedPeriod,
  prevPeriodKey,
  receitasRecebidas,
}) {
  const hojeStr = localDateISO();
  const isCurrentMonth = hojeStr.startsWith(selectedPeriod);
  const currentDay = hojeStr.slice(8, 10);
  const cutoffPrev = isCurrentMonth ? `${prevPeriodKey}-${currentDay}` : `${prevPeriodKey}-31`;

  const prevSamePace = financeiro
    .filter((f) => {
      if (f.tipo !== "Receita" || f.status !== "Pago") return false;
      const dt = (f.data_pagamento || f.data_vencimento || "").slice(0, 10);
      return dt.startsWith(prevPeriodKey) && dt <= cutoffPrev;
    })
    .reduce((acc, cur) => acc + Number(cur.valor || 0), 0);

  const prevFullMonth = financeiro
    .filter(
      (f) =>
        f.tipo === "Receita" &&
        f.status === "Pago" &&
        (f.data_pagamento || f.data_vencimento || "").startsWith(prevPeriodKey)
    )
    .reduce((acc, cur) => acc + Number(cur.valor || 0), 0);

  const baseComparacao = prevSamePace > 0 ? prevSamePace : prevFullMonth;
  const temComparativo = baseComparacao > 0;
  const crescimentoPercentual = temComparativo
    ? ((receitasRecebidas - baseComparacao) / baseComparacao) * 100
    : 0;

  const labelComparativo =
    isCurrentMonth && prevSamePace > 0
      ? `Até dia ${currentDay} vs. mês ant. (R$ ${prevSamePace.toLocaleString("pt-BR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })})`
      : "Este mês vs. mês anterior";

  return {
    temComparativo,
    crescimentoPercentual,
    labelComparativo,
    prevSamePace,
    prevFullMonth,
  };
}

/**
 * 2. Contas a Receber (Vencidas/Hoje, Próximos 7 dias, Próximos 30 dias)
 */
export function computeAccountsReceivable(financeiro = [], clientes = []) {
  const hojeStr = localDateISO();
  const plus7Str = addDaysISO(hojeStr, 7);
  const plus30Str = addDaysISO(hojeStr, 30);

  const pendentes = financeiro.filter(
    (f) => f.tipo === "Receita" && f.status === "Pendente"
  );

  let vencidasOuHoje = 0;
  let proximos7Dias = 0;
  let proximos30Dias = 0;
  let totalGeral = 0;

  pendentes.forEach((f) => {
    const val = Number(f.valor || 0);
    totalGeral += val;
    const venc = (f.data_vencimento || hojeStr).slice(0, 10);
    if (venc <= hojeStr) {
      vencidasOuHoje += val;
    } else if (venc <= plus7Str) {
      proximos7Dias += val;
    }
    if (venc > hojeStr && venc <= plus30Str) {
      proximos30Dias += val;
    }
  });

  const proximosItens = [...pendentes]
    .sort((a, b) => (a.data_vencimento || "").localeCompare(b.data_vencimento || ""))
    .slice(0, 4)
    .map((f) => {
      const cli = clientes.find((c) => c.id === f.cliente_id);
      return {
        ...f,
        clienteNome: cli?.nome_completo || null,
        vencida: (f.data_vencimento || hojeStr).slice(0, 10) < hojeStr,
      };
    });

  return {
    vencidasOuHoje,
    proximos7Dias,
    proximos30Dias,
    totalGeral,
    count: pendentes.length,
    proximosItens,
  };
}

/**
 * 3. SLA — Tempo médio por etapa (a partir de os_historico + etapa atual das OS)
 */
export function computeStageSLA(ordens = [], osHistorico = []) {
  const nowMs = Date.now();
  const durationsByStage = {};
  STAGE_META.forEach((s) => {
    durationsByStage[s.id] = [];
  });

  // Agrupar histórico por os_id
  const byOS = {};
  (osHistorico || []).forEach((h) => {
    if (!h.os_id || !h.alterado_em) return;
    if (!byOS[h.os_id]) byOS[h.os_id] = [];
    byOS[h.os_id].push(h);
  });

  Object.values(byOS).forEach((events) => {
    events.sort((a, b) => new Date(a.alterado_em) - new Date(b.alterado_em));
    for (let i = 0; i < events.length - 1; i++) {
      const st = normalizeKanbanStatus(events[i].status_novo);
      const t1 = new Date(events[i].alterado_em).getTime();
      const t2 = new Date(events[i + 1].alterado_em).getTime();
      if (durationsByStage[st] && t2 > t1) {
        durationsByStage[st].push((t2 - t1) / 86400000);
      }
    }
  });

  // Incluir o tempo da etapa atual para as OS que estão na bancada agora
  ordens.forEach((os) => {
    if (os.arquivado) return;
    const st = normalizeKanbanStatus(os.status);
    if (!durationsByStage[st]) return;
    const ref = os.status_alterado_em || os.atualizado_em || os.criado_em;
    if (!ref) return;
    const t1 = new Date(ref).getTime();
    if (!Number.isNaN(t1) && nowMs > t1) {
      durationsByStage[st].push((nowMs - t1) / 86400000);
    }
  });

  const stages = STAGE_META.map((meta) => {
    const arr = durationsByStage[meta.id] || [];
    const avgDays =
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    return {
      ...meta,
      sampleCount: arr.length,
      avgDays,
      formatted: formatDurationDays(avgDays),
    };
  });

  const maxAvg = Math.max(...stages.map((s) => s.avgDays || 0), 0.1);
  let bottleneck = null;
  stages.forEach((s) => {
    if (s.id !== "finalizado" && s.avgDays && (!bottleneck || s.avgDays > bottleneck.avgDays)) {
      bottleneck = s;
    }
  });

  return { stages, maxAvg, bottleneck };
}

/**
 * 4. Lead Time Total (Entrada -> Entrega/Conclusão) e % no prazo
 */
export function computeLeadTime(ordens = [], selectedPeriod) {
  const concluidasTodas = ordens.filter((os) => {
    const st = normalizeKanbanStatus(os.status);
    return (st === "finalizado" || st === "entregue") && os.data_abertura;
  });

  const calcStats = (lista) => {
    const leadDays = [];
    let noPrazo = 0;
    let comPrazo = 0;

    lista.forEach((os) => {
      const fimStr = (os.data_entrega_real || os.atualizado_em || "").slice(0, 10);
      const dias = diffDaysStr(os.data_abertura, fimStr);
      if (dias !== null) {
        leadDays.push(dias);
        if (os.data_entrega_prevista) {
          comPrazo++;
          if (fimStr <= os.data_entrega_prevista.slice(0, 10)) {
            noPrazo++;
          }
        }
      }
    });

    const avg =
      leadDays.length > 0
        ? leadDays.reduce((a, b) => a + b, 0) / leadDays.length
        : null;
    const onTimeRate = comPrazo > 0 ? Math.round((noPrazo / comPrazo) * 100) : null;
    return { avg, count: leadDays.length, onTimeRate };
  };

  const concluidasMes = concluidasTodas.filter((os) =>
    (os.data_entrega_real || os.atualizado_em || "").startsWith(selectedPeriod)
  );

  const mesStats = calcStats(concluidasMes);
  const geralStats = calcStats(concluidasTodas);

  return {
    avgDays: mesStats.avg !== null ? mesStats.avg : geralStats.avg,
    isFromMonth: mesStats.avg !== null,
    completedCount: mesStats.count || geralStats.count,
    onTimeRate: mesStats.onTimeRate !== null ? mesStats.onTimeRate : geralStats.onTimeRate,
  };
}

/**
 * 5. Funil de Manutenção (OS)
 */
export function computeMaintenanceFunnel(ordens = [], selectedPeriod) {
  // Considera OS abertas no período ou concluídas no período ou ativas na bancada
  const relevantes = ordens.filter((os) => {
    const st = normalizeKanbanStatus(os.status);
    if (st === "cancelado") return false;
    const abriuNoMes = (os.data_abertura || "").startsWith(selectedPeriod);
    const fechouNoMes = (os.data_entrega_real || os.atualizado_em || "").startsWith(selectedPeriod);
    const ativaAgora = !os.arquivado && st !== "finalizado" && st !== "entregue";
    return abriuNoMes || fechouNoMes || ativaAgora;
  });

  const totalEntrada = relevantes.length;
  let emAnaliseOuMais = 0;
  let aprovadasOuMais = 0;
  let concluidas = 0;

  relevantes.forEach((os) => {
    const st = normalizeKanbanStatus(os.status);
    if (st !== "recebido") emAnaliseOuMais++;
    if (st === "aprovado_execucao" || st === "finalizado" || st === "entregue") {
      aprovadasOuMais++;
    }
    if (st === "finalizado" || st === "entregue") {
      concluidas++;
    }
  });

  const taxaAprovacaoOS =
    emAnaliseOuMais > 0 ? Math.round((aprovadasOuMais / emAnaliseOuMais) * 100) : 0;
  const taxaConclusaoOS =
    totalEntrada > 0 ? Math.round((concluidas / totalEntrada) * 100) : 0;

  return {
    steps: [
      { label: "Recebidas / Na fila", count: totalEntrada, color: "bg-sky-500" },
      { label: "Diagnosticadas / Orçadas", count: emAnaliseOuMais, color: "bg-indigo-500" },
      { label: "Aprovadas / Em reparo", count: aprovadasOuMais, color: "bg-[#0029F5]" },
      { label: "Prontas / Entregues", count: concluidas, color: "bg-emerald-500" },
    ],
    totalEntrada,
    taxaAprovacaoOS,
    taxaConclusaoOS,
  };
}

/**
 * 6. Receita e Volume por Tipo de Equipamento e Marca
 */
export function computeEquipmentMix(ordens = [], osItens = []) {
  const itensByOS = {};
  (osItens || []).forEach((i) => {
    if (!i.os_id) return;
    const sub = Number(i.valor_unitario || 0) * Number(i.quantidade || 1);
    itensByOS[i.os_id] = (itensByOS[i.os_id] || 0) + sub;
  });

  const categorizeType = (raw = "", titulo = "") => {
    const text = `${raw} ${titulo}`.toLowerCase();
    if (text.includes("gamer")) return "PC Gamer";
    if (text.includes("note") || text.includes("macbook") || text.includes("laptop")) {
      return "Notebook";
    }
    if (text.includes("pc") || text.includes("desktop") || text.includes("computador") || text.includes("all in one")) {
      return "Desktop / PC";
    }
    if (text.includes("placa") || text.includes("gpu") || text.includes("console") || text.includes("ps5") || text.includes("xbox")) {
      return "Hardware / Placa";
    }
    return "Outros Equip.";
  };

  const byType = {};
  const byBrand = {};

  ordens.forEach((os) => {
    if (normalizeKanbanStatus(os.status) === "cancelado") return;
    const cat = categorizeType(os.equipamento_tipo, os.titulo);
    const valItens = Math.max(0, (itensByOS[os.id] || 0) - Number(os.desconto || 0));
    const revenue = valItens > 0 ? valItens : Number(os.valor_total || 0);

    if (!byType[cat]) byType[cat] = { name: cat, count: 0, revenue: 0 };
    byType[cat].count += 1;
    byType[cat].revenue += revenue;

    const brandRaw = (os.equipamento_marca || "").trim();
    if (
      brandRaw &&
      brandRaw.toLowerCase() !== "a definir" &&
      brandRaw.toLowerCase() !== "genérica" &&
      brandRaw.toLowerCase() !== "generica"
    ) {
      const bKey = brandRaw.toUpperCase();
      byBrand[bKey] = (byBrand[bKey] || 0) + 1;
    }
  });

  const typesList = Object.values(byType).sort(
    (a, b) => b.revenue - a.revenue || b.count - a.count
  );
  const topBrands = Object.entries(byBrand)
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { typesList, topBrands };
}

/**
 * 7. Estoque Crítico (Peças com estoque <= estoque_minimo)
 */
export function computeCriticalStock(produtos = []) {
  return (produtos || [])
    .filter((p) => {
      if (p.tipo && p.tipo !== "Peça") return false;
      const atual = Number(p.estoque_atual ?? 0);
      const min = Number(p.estoque_minimo ?? 2);
      return atual <= min;
    })
    .sort((a, b) => Number(a.estoque_atual ?? 0) - Number(b.estoque_atual ?? 0))
    .slice(0, 6);
}
