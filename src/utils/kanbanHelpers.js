import { localDateISO } from "./date";

/**
 * Calcula quantos dias o cartão está na etapa atual.
 * Retorna o número de dias, o rótulo amigável e as classes de cor (verde < 2d, amarelo < 5d, vermelho >= 5d).
 */
export function getStageAgeInfo(card, normStatus) {
  const refRaw =
    card?.status_alterado_em ||
    card?.atualizado_em ||
    card?.criado_em ||
    card?.data_abertura;

  if (!refRaw) {
    return {
      days: 0,
      label: "Hoje na etapa",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30 kanban-stage-ok",
    };
  }

  let refDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(refRaw)) {
    refDate = new Date(`${refRaw}T00:00:00`);
  } else {
    const parsed = new Date(refRaw);
    const localRefStr = localDateISO(parsed);
    refDate = new Date(`${localRefStr}T00:00:00`);
  }

  const todayLocal = new Date(`${localDateISO()}T00:00:00`);
  const diffDays = Number.isNaN(refDate.getTime())
    ? 0
    : Math.max(0, Math.round((todayLocal.getTime() - refDate.getTime()) / 86400000));

  if (normStatus === "entregue") {
    const label =
      diffDays === 0
        ? "Entregue hoje"
        : diffDays === 1
        ? "Entregue ontem"
        : `Entregue há ${diffDays}d`;
    return {
      days: diffDays,
      label,
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30 kanban-stage-ok",
    };
  }

  const label =
    diffDays === 0
      ? "Hoje na etapa"
      : diffDays === 1
      ? "Há 1 dia"
      : `Há ${diffDays} dias`;

  if (diffDays < 2) {
    return {
      days: diffDays,
      label,
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30 kanban-stage-ok",
    };
  }
  if (diffDays < 5) {
    return {
      days: diffDays,
      label,
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-400/40 kanban-stage-warn",
    };
  }
  return {
    days: diffDays,
    label,
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-400/45 kanban-stage-alert",
  };
}

export const WHATSAPP_TEMPLATE_OPTIONS = [
  { id: "recebido", label: "Entrada confirmada (Recebido)" },
  { id: "em_analise", label: "Equipamento em análise" },
  { id: "orcamento_enviado", label: "Orçamento pronto p/ aprovação" },
  { id: "aguardando_peca", label: "Aguardando chegada de peça" },
  { id: "aprovado_execucao", label: "Peça chegou / Em execução" },
  { id: "finalizado", label: "Pronto para retirada" },
  { id: "entregue", label: "Pós-venda e garantia (Entregue)" },
];

export function buildWhatsAppStageMessage(templateKey, { card, client, totalValue = 0 }) {
  const nomeCliente = client?.nome_completo?.split(" ")[0] || client?.nome_completo || "Cliente";
  const titulo =
    card?.titulo && card.titulo !== "Manutenção de Equipamento"
      ? card.titulo
      : `${card?.equipamento_tipo || "Equipamento"} ${card?.equipamento_marca || ""}`.trim();
  const osNum = card?.numero_os || "";
  const valorNum = Number(totalValue || card?.valor_total || 0);
  const valorLinha = valorNum > 0 ? `\n💰 *Valor total:* R$ ${valorNum.toFixed(2)}` : "";

  switch (templateKey) {
    case "recebido":
      return (
        `Olá, *${nomeCliente}*! Aqui é a equipe da *RG TECH Computadores*.\n\n` +
        `Confirmamos a entrada do seu equipamento (*${titulo}*) sob a ordem *#${osNum}*.\n` +
        `Já estamos organizando a avaliação técnica e em breve atualizamos você por aqui!`
      );

    case "em_analise":
      return (
        `Olá, *${nomeCliente}*! Aqui é da *RG TECH Computadores*.\n\n` +
        `Passando para avisar que o seu equipamento (*${titulo}* — *#${osNum}*) já está na bancada *em análise técnica*.\n` +
        `Assim que concluirmos o diagnóstico, enviaremos o laudo e o orçamento completo.`
      );

    case "orcamento_enviado":
      return (
        `Olá, *${nomeCliente}*! Aqui é da *RG TECH Computadores*.\n\n` +
        `O orçamento da manutenção *#${osNum}* (*${titulo}*) já está pronto!${valorLinha}\n\n` +
        `Ficou com alguma dúvida ou podemos aprovar o início do serviço?`
      );

    case "aguardando_peca":
      return (
        `Olá, *${nomeCliente}*! Aqui é da *RG TECH Computadores*.\n\n` +
        `Atualização da sua OS *#${osNum}* (*${titulo}*): estamos *aguardando a chegada da peça* necessária para concluir o reparo.\n` +
        `Assim que ela chegar em nosso laboratório, damos sequência imediata e avisamos você!`
      );

    case "aprovado_execucao":
      return (
        `Olá, *${nomeCliente}*! Aqui é da *RG TECH Computadores*.\n\n` +
        `Boas notícias sobre a OS *#${osNum}* (*${titulo}*): já está *em execução* na nossa bancada técnica!\n` +
        `Em seguida finalizamos os testes de estabilidade e avisamos quando estiver pronto para retirada.`
      );

    case "finalizado":
      return (
        `Olá, *${nomeCliente}*! Aqui é a equipe da *RG TECH Computadores*.\n\n` +
        `✅ *Ótima notícia:* seu equipamento (*${titulo}* — *#${osNum}*) está *pronto para retirada*!${valorLinha}\n` +
        `💳 *Pagamento:* ${card?.condicoes_pagamento || "PIX, Cartão ou Dinheiro"}\n\n` +
        `Quando ficar melhor para você passar aqui retirar?`
      );

    case "entregue":
      return (
        `Olá, *${nomeCliente}*! Aqui é da *RG TECH Computadores*.\n\n` +
        `Obrigado por confiar o seu equipamento (*${titulo}* — *#${osNum}*) à nossa equipe! 🙌\n` +
        `Lembramos que os serviços realizados contam com a nossa garantia. Qualquer necessidade ou dúvida no dia a dia, é só chamar aqui!`
      );

    default:
      return (
        `Olá, *${nomeCliente}*! Aqui é a equipe da *RG TECH Computadores*.\n\n` +
        `Informamos sobre a manutenção *#${osNum}* (*${titulo}*).${valorLinha}\n` +
        `Qualquer dúvida estamos à disposição!`
      );
  }
}

export function buildWhatsAppUrl(telefone, message) {
  let clean = (telefone || "").replace(/\D/g, "");
  if (!clean) return null;
  if (!clean.startsWith("55") && clean.length <= 11) {
    clean = `55${clean}`;
  }
  return `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(message)}`;
}
