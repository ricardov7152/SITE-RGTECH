import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

// Colunas padrão do Kanban de Manutenção (Trello-style)
export const DEFAULT_KANBAN_COLUMNS = [
  { id: 'recebido', title: 'Equipamentos recebidos', color: '#C1E8FF' },
  { id: 'em_analise', title: 'Em analise', color: '#7DA0CA' },
  { id: 'orcamento_enviado', title: 'Orçamento enviado', color: '#5483B3' },
  { id: 'aprovado_execucao', title: 'Aprovado e Execução', color: '#38bdf8' },
  { id: 'finalizado', title: 'Finalizado', color: '#34d399' },
  { id: 'aguardando_peca', title: 'Aguardando Peças', color: '#fbbf24' },
];

const LEGACY_STATUS_MAP = {
  recebido: 'recebido',
  em_analise: 'em_analise',
  em_diagnostico: 'em_analise',
  orcamento_enviado: 'orcamento_enviado',
  aprovado_execucao: 'aprovado_execucao',
  em_execucao: 'aprovado_execucao',
  finalizado: 'finalizado',
  pronto_retirada: 'finalizado',
  entregue: 'finalizado',
  aguardando_peca: 'aguardando_peca',
  cancelado: 'aguardando_peca',
};

const REVERSE_LEGACY_STATUS = {
  recebido: 'recebido',
  em_analise: 'em_diagnostico',
  orcamento_enviado: 'em_diagnostico',
  aprovado_execucao: 'em_execucao',
  finalizado: 'entregue',
  aguardando_peca: 'aguardando_peca',
};

export function normalizeKanbanStatus(status) {
  return LEGACY_STATUS_MAP[status] || 'recebido';
}

/**
 * Gera o próximo ID sequencial (ex: ORC-2026-1001 ou OS-2026-1001)
 * consultando o maior número já utilizado no ano corrente (max + 1),
 * evitando colisões de chave primária caso registros antigos sejam excluídos.
 */
async function getNextSequentialId(table, column, prefix) {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .like(column, `${prefix}%`);

  if (error) throw error;

  let maxNum = 1000;
  for (const row of data || []) {
    const val = row[column] || '';
    const parts = val.split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  return `${prefix}${maxNum + 1}`;
}

// --- OBJETO CENTRAL DE CONSULTAS DO SISTEMA (API) ---
export const db = {
  // ── Clientes ──
  clientes: {
    list: async () => {
      try {
        const { data, error } = await supabase.from('clientes').select('*').order('nome_completo');
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error("Erro ao listar clientes no Supabase:", err);
        throw err;
      }
    },
    insert: async (cliente) => {
      try {
        const { data, error } = await supabase.from('clientes').insert([cliente]).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.error("Erro ao inserir cliente no Supabase:", err);
        throw err;
      }
    },
    update: async (id, cliente) => {
      try {
        const { data, error } = await supabase.from('clientes').update(cliente).eq('id', id).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.error("Erro ao atualizar cliente no Supabase:", err);
        throw err;
      }
    },
    delete: async (id) => {
      try {
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.error("Erro ao excluir cliente no Supabase:", err);
        throw err;
      }
    }
  },

  // ── Produtos ──
  produtos: {
    list: async () => {
      try {
        const { data, error } = await supabase.from('produtos').select('*').order('nome');
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error("Erro ao listar produtos no Supabase:", err);
        throw err;
      }
    },
    insert: async (produto) => {
      try {
        const { data, error } = await supabase.from('produtos').insert([produto]).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.error("Erro ao inserir produto no Supabase:", err);
        throw err;
      }
    },
    update: async (id, produto) => {
      try {
        const { data, error } = await supabase.from('produtos').update(produto).eq('id', id).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.error("Erro ao atualizar produto no Supabase:", err);
        throw err;
      }
    },
    delete: async (id) => {
      try {
        const { error } = await supabase.from('produtos').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.error("Erro ao excluir produto no Supabase:", err);
        throw err;
      }
    }
  },

  // ── Orçamentos (Avulsos) ──
  orcamentos: {
    list: async () => {
      try {
        const { data, error } = await supabase.from('orcamentos').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error("Erro ao listar orçamentos no Supabase:", err);
        throw err;
      }
    },
    get: async (id) => {
      try {
        const { data: orcamento, error: err1 } = await supabase.from('orcamentos').select('*').eq('id', id).single();
        if (err1) throw err1;
        const { data: itens, error: err2 } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', id);
        if (err2) throw err2;
        return { data: { ...orcamento, itens }, error: null };
      } catch (err) {
        console.error("Erro ao carregar orçamento no Supabase:", err);
        throw err;
      }
    },
    insert: async (orcamento, itens) => {
      try {
        const year = new Date().getFullYear();
        const orcId = orcamento.id || await getNextSequentialId('orcamentos', 'id', `ORC-${year}-`);
        
        const newOrcamento = { ...orcamento, id: orcId };
        
        const { error: err1 } = await supabase.from('orcamentos').insert([newOrcamento]);
        if (err1) throw err1;

        const newItens = itens.map(item => {
          const { id, ...rest } = item;
          return { ...rest, orcamento_id: orcId };
        });

        const { error: err2 } = await supabase.from('orcamento_itens').insert(newItens);
        if (err2) throw err2;

        // Orçamentos avulsos aprovados geram apenas lançamento financeiro (não criam card de manutenção automaticamente)
        if (newOrcamento.status === "Aprovado") {
          await db.financeiro.triggerFromOrcamento(newOrcamento);
        }

        return { data: { ...newOrcamento, itens: newItens }, error: null };
      } catch (err) {
        console.error("Erro ao inserir orçamento no Supabase:", err);
        throw err;
      }
    },
    updateStatus: async (id, status, motivo_recusa = null) => {
      try {
        const payload = { status, motivo_recusa: status === "Recusado" ? motivo_recusa : null };
        const { error } = await supabase.from('orcamentos').update(payload).eq('id', id);
        if (error) throw error;

        if (status === "Aprovado") {
          const { data: orc } = await supabase.from('orcamentos').select('*').eq('id', id).single();
          if (orc) {
            await db.financeiro.triggerFromOrcamento(orc);
          }
        }
        return { error: null };
      } catch (err) {
        console.error("Erro ao atualizar status do orçamento no Supabase:", err);
        throw err;
      }
    },
    delete: async (id) => {
      try {
        const { error } = await supabase.from('orcamentos').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.error("Erro ao excluir orçamento no Supabase:", err);
        throw err;
      }
    }
  },

  // ── Financeiro ──
  financeiro: {
    list: async () => {
      try {
        const { data, error } = await supabase.from('financeiro').select('*').order('data_vencimento', { ascending: false });
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error("Erro ao listar lançamentos financeiros no Supabase:", err);
        throw err;
      }
    },
    insert: async (lancamento) => {
      try {
        const { data, error } = await supabase.from('financeiro').insert([lancamento]).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.error("Erro ao inserir lançamento financeiro no Supabase:", err);
        throw err;
      }
    },
    update: async (id, lancamento) => {
      try {
        const { data, error } = await supabase.from('financeiro').update(lancamento).eq('id', id).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.error("Erro ao atualizar lançamento financeiro no Supabase:", err);
        throw err;
      }
    },
    delete: async (id) => {
      try {
        const { error } = await supabase.from('financeiro').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.error("Erro ao excluir lançamento financeiro no Supabase:", err);
        throw err;
      }
    },
    triggerFromOrcamento: async (orcamento) => {
      try {
        const { data } = await supabase.from('financeiro').select('id').eq('orcamento_id', orcamento.id);
        const exists = data && data.length > 0;
        if (exists) return;

        const novoLancamento = {
          tipo: 'Receita',
          categoria: 'Orçamento',
          descricao: `Orçamento Aprovado ${orcamento.id} - ${orcamento.cliente_nome}`,
          valor: Number(orcamento.total),
          status: 'Pendente',
          cliente_id: orcamento.cliente_id,
          orcamento_id: orcamento.id,
          data_vencimento: orcamento.data_emissao || new Date().toISOString().split('T')[0],
          observacoes: 'Lançamento automático gerado pela aprovação do orçamento.'
        };

        await db.financeiro.insert(novoLancamento);
      } catch (err) {
        console.error("Erro na automação financeira de orçamento:", err);
        throw err;
      }
    },
    triggerFinanceiroFromOS: async (os, itens = [], clienteNome = "") => {
      return db.financeiro.triggerFromOS(os, itens, clienteNome);
    },
    triggerFromOS: async (os, itens = [], clienteNome = "") => {
      try {
        const subtotal = (itens || []).reduce(
          (acc, item) => acc + Number(item.quantidade || 1) * Number(item.valor_unitario || 0),
          0
        );
        const desconto = Number(os.desconto || 0);
        const valorCalculado = Math.max(0, subtotal - desconto);
        const valorFinal = valorCalculado > 0 ? valorCalculado : Number(os.valor_total || 0);

        // Verificar duplicidade por os_id (se coluna existir) ou pela descrição com numero_os
        const { data: existingList } = await supabase
          .from('financeiro')
          .select('id, os_id, descricao, orcamento_id')
          .or(`descricao.ilike.%${os.numero_os}%${os.orcamento_id ? `,orcamento_id.eq.${os.orcamento_id}` : ''}`);

        if (existingList && existingList.length > 0) {
          return { skipped: true };
        }

        const tituloCard = os.titulo || `${os.equipamento_tipo || 'Equipamento'} ${os.equipamento_marca || ''}`.trim();
        const desc = `Manutenção Finalizada ${os.numero_os} - ${tituloCard}${clienteNome ? ` (${clienteNome})` : ''}`;
        const hoje = new Date().toISOString().split('T')[0];

        const payload = {
          tipo: 'Receita',
          categoria: 'Manutenção',
          descricao: desc,
          valor: valorFinal,
          status: 'Pendente',
          cliente_id: os.cliente_id || null,
          orcamento_id: os.orcamento_id || null,
          os_id: os.id,
          data_vencimento: hoje,
          observacoes: 'Gerado automaticamente ao finalizar manutenção no quadro Kanban (A Conferir).'
        };

        const { error } = await supabase.from('financeiro').insert([payload]);
        if (error) {
          // Fallback caso a coluna os_id ainda não tenha sido adicionada na tabela financeiro
          const { os_id, ...fallbackPayload } = payload;
          const { error: errFallback } = await supabase.from('financeiro').insert([fallbackPayload]);
          if (errFallback) throw errFallback;
        }
        return { skipped: false };
      } catch (err) {
        console.error("Erro ao gerar lançamento financeiro automático da Manutenção:", err);
        return { error: err };
      }
    }
  },

  // ── Itens do Orçamento ──
  orcamento_itens: {
    list: async () => {
      try {
        const { data, error } = await supabase.from('orcamento_itens').select('*');
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error("Erro ao listar itens de orçamento no Supabase:", err);
        throw err;
      }
    }
  },

  // ── Ordem de Serviço / Quadro Kanban de Manutenção ──
  ordem_servico: {
    list: async () => {
      try {
        const { data, error } = await supabase.from('ordem_servico').select('*').order('criado_em', { ascending: false });
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error("Erro ao listar manutenções no Supabase:", err);
        throw err;
      }
    },
    get: async (id) => {
      try {
        const { data: os, error: err1 } = await supabase.from('ordem_servico').select('*').eq('id', id).single();
        if (err1) throw err1;
        const { data: itens, error: err2 } = await supabase.from('os_itens').select('*').eq('os_id', id);
        if (err2) throw err2;
        return { data: { ...os, itens: itens || [] }, error: null };
      } catch (err) {
        console.error("Erro ao carregar manutenção no Supabase:", err);
        throw err;
      }
    },
    createCard: async (cardInput) => {
      try {
        const year = new Date().getFullYear();
        const numeroOs = cardInput.numero_os || await getNextSequentialId('ordem_servico', 'numero_os', `OS-${year}-`);
        const hoje = new Date().toISOString().split('T')[0];
        const prazoDias = Number(cardInput.prazo_entrega_dias || 5);
        const previstaDate = new Date();
        previstaDate.setDate(previstaDate.getDate() + prazoDias);
        const dataPrevista = cardInput.data_entrega_prevista || previstaDate.toISOString().split('T')[0];

        const fullPayload = {
          numero_os: numeroOs,
          titulo: cardInput.titulo || 'Manutenção de Equipamento',
          prioridade: cardInput.prioridade || 'Média',
          posicao: Number(cardInput.posicao ?? 0),
          cliente_id: cardInput.cliente_id || null,
          status: cardInput.status || 'recebido',
          data_abertura: cardInput.data_abertura || hoje,
          prazo_entrega_dias: prazoDias,
          data_entrega_prevista: dataPrevista,
          equipamento_tipo: cardInput.equipamento_tipo || cardInput.titulo || 'Computador / Notebook',
          equipamento_marca: cardInput.equipamento_marca || 'A definir',
          equipamento_modelo: cardInput.equipamento_modelo || '',
          equipamento_numero_serie: cardInput.equipamento_numero_serie || '',
          acessorios_entregues: cardInput.acessorios_entregues || '',
          problema_relatado: cardInput.problema_relatado || '',
          tecnico_responsavel: cardInput.tecnico_responsavel || 'Técnico RG TECH',
          observacoes_internas: cardInput.observacoes_internas || '',
          desconto: Number(cardInput.desconto || 0),
          valor_total: Number(cardInput.valor_total || 0),
          condicoes_pagamento: cardInput.condicoes_pagamento || 'PIX / Cartão / Dinheiro',
        };

        const { data, error } = await supabase.from('ordem_servico').insert([fullPayload]).select();
        if (!error && data && data[0]) {
          return { data: data[0], error: null };
        }

        // Fallback resiliente caso o script SQL de migração ainda não tenha sido executado no Supabase
        const legacyPayload = {
          numero_os: numeroOs,
          cliente_id: cardInput.cliente_id || null,
          status: REVERSE_LEGACY_STATUS[fullPayload.status] || 'recebido',
          data_abertura: fullPayload.data_abertura,
          prazo_entrega_dias: prazoDias,
          data_entrega_prevista: dataPrevista,
          equipamento_tipo: fullPayload.titulo || fullPayload.equipamento_tipo,
          equipamento_marca: fullPayload.equipamento_marca,
          equipamento_modelo: fullPayload.equipamento_modelo,
          equipamento_numero_serie: fullPayload.equipamento_numero_serie,
          acessorios_entregues: fullPayload.acessorios_entregues,
          tecnico_responsavel: fullPayload.tecnico_responsavel,
          observacoes_internas: fullPayload.observacoes_internas || fullPayload.problema_relatado,
        };
        const { data: legacyData, error: legacyErr } = await supabase.from('ordem_servico').insert([legacyPayload]).select();
        if (legacyErr) throw legacyErr;
        return { data: { ...fullPayload, ...legacyData[0], status: fullPayload.status }, error: null };
      } catch (err) {
        console.error("Erro ao criar cartão de manutenção no Supabase:", err);
        throw err;
      }
    },
    insert: async (os, itens = []) => {
      try {
        const { data: created, error: err1 } = await db.ordem_servico.createCard(os);
        if (err1) throw err1;
        let newItens = [];
        if (itens && itens.length > 0) {
          const mappedItens = itens.map(item => ({ ...item, os_id: created.id }));
          const { data: insertedItens, error: err2 } = await supabase.from('os_itens').insert(mappedItens).select();
          if (err2) throw err2;
          newItens = insertedItens || [];
        }
        return { data: { ...created, itens: newItens }, error: null };
      } catch (err) {
        console.error("Erro ao inserir ordem de serviço no Supabase:", err);
        throw err;
      }
    },
    update: async (id, osUpdates) => {
      try {
        const payload = { ...osUpdates, atualizado_em: new Date().toISOString() };
        const { data, error } = await supabase.from('ordem_servico').update(payload).eq('id', id).select();
        if (!error) {
          return { data: data?.[0] || payload, error: null };
        }

        // Fallback caso colunas novas ainda não existam no banco
        const {
          titulo,
          prioridade,
          posicao,
          problema_relatado,
          desconto,
          valor_total,
          condicoes_pagamento,
          status,
          ...legacyRest
        } = payload;

        if (status) {
          legacyRest.status = REVERSE_LEGACY_STATUS[status] || 'recebido';
        }
        const { error: errFallback } = await supabase.from('ordem_servico').update(legacyRest).eq('id', id);
        if (errFallback) throw errFallback;
        return { data: payload, error: null };
      } catch (err) {
        console.error("Erro ao atualizar ordem de serviço no Supabase:", err);
        throw err;
      }
    },
    updatePositions: async (orderedCards = []) => {
      try {
        await Promise.all(
          orderedCards.map((card, index) =>
            supabase
              .from('ordem_servico')
              .update({ posicao: index, status: card.status, atualizado_em: new Date().toISOString() })
              .eq('id', card.id)
          )
        );
        return { error: null };
      } catch (err) {
        console.error("Erro ao atualizar posições no Kanban:", err);
        return { error: err };
      }
    },
    updateStatus: async (id, status, motivo_cancelamento = null, posicao = null) => {
      try {
        const { data: dbOS } = await supabase.from('ordem_servico').select('*').eq('id', id).single();
        const os = dbOS;
        if (!os) return { error: "Manutenção não encontrada" };
        const statusAnterior = normalizeKanbanStatus(os.status);
        const statusNovoNorm = normalizeKanbanStatus(status);

        const { data: dbItens } = await supabase.from('os_itens').select('*').eq('os_id', id);
        const osItens = dbItens || [];

        const updates = { 
          status, 
          atualizado_em: new Date().toISOString(),
          motivo_cancelamento: status === "cancelado" ? motivo_cancelamento : os.motivo_cancelamento
        };

        if (posicao !== null && posicao !== undefined) {
          updates.posicao = posicao;
        }

        if (statusNovoNorm === "finalizado" || status === "entregue") {
          updates.data_entrega_real = new Date().toISOString().split('T')[0];
        }

        const { error } = await supabase.from('ordem_servico').update(updates).eq('id', id);
        if (error) {
          // Fallback para status legado se o CHECK constraint ainda não foi migrado no banco
          const legacyUpdates = {
            status: REVERSE_LEGACY_STATUS[statusNovoNorm] || 'recebido',
            atualizado_em: updates.atualizado_em,
            data_entrega_real: updates.data_entrega_real || os.data_entrega_real,
          };
          const { error: legacyErr } = await supabase.from('ordem_servico').update(legacyUpdates).eq('id', id);
          if (legacyErr) throw legacyErr;
        }

        // Baixa automática de estoque ao entrar em execução ou finalizar
        const novoStatusBaixa = statusNovoNorm === "aprovado_execucao" || statusNovoNorm === "finalizado";
        const anteriorStatusBaixa = statusAnterior === "aprovado_execucao" || statusAnterior === "finalizado";

        if (novoStatusBaixa && !anteriorStatusBaixa) {
          for (const item of osItens) {
            if (item.tipo === "Peça" && item.item_catalogo_id) {
              const { data: prod } = await supabase.from('produtos').select('estoque_atual').eq('id', item.item_catalogo_id).single();
              if (prod) {
                const novaQtd = Math.max(0, (prod.estoque_atual || 0) - item.quantidade);
                await supabase.from('produtos').update({ estoque_atual: novaQtd }).eq('id', item.item_catalogo_id);
              }
            }
          }
        }

        // Ao finalizar: ativa garantias e gera lançamento financeiro "Pendente" (A Conferir)
        if (statusNovoNorm === "finalizado") {
          const dataInicioStr = new Date().toISOString().split('T')[0];
          
          for (const item of osItens) {
            const inicio = new Date();
            const fim = new Date(inicio);
            fim.setDate(fim.getDate() + (item.garantia_dias || 30));
            await supabase.from('os_itens').update({
              data_inicio_garantia: dataInicioStr,
              data_fim_garantia: fim.toISOString().split('T')[0],
              status_garantia: 'ativa'
            }).eq('id', item.id);
          }

          let clienteNome = "";
          if (os.cliente_id) {
            const { data: cli } = await supabase.from('clientes').select('nome_completo').eq('id', os.cliente_id).maybeSingle();
            clienteNome = cli?.nome_completo || "";
            await supabase.from('clientes').update({ ultimo_contato: dataInicioStr }).eq('id', os.cliente_id);
          }

          await db.financeiro.triggerFromOS({ ...os, status: statusNovoNorm }, osItens, clienteNome);
        }

        return { error: null };
      } catch (err) {
        console.error("Erro ao atualizar status da manutenção no Supabase:", err);
        throw err;
      }
    },
    delete: async (id) => {
      try {
        const { error } = await supabase.from('ordem_servico').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.error("Erro ao excluir manutenção no Supabase:", err);
        throw err;
      }
    }
  },

  // ── Itens da OS / Manutenção ──
  os_itens: {
    listAll: async () => {
      try {
        const { data, error } = await supabase.from('os_itens').select('*');
        if (error) throw error;
        return { data: data || [], error: null };
      } catch (err) {
        console.error("Erro ao listar itens de OS no Supabase:", err);
        throw err;
      }
    },
    insert: async (item) => {
      try {
        const { data, error } = await supabase.from('os_itens').insert([item]).select();
        if (!error && data && data[0]) {
          return { data: data[0], error: null };
        }
        // Fallback caso nome/descricao ainda não existam em os_itens
        const { nome, descricao, ...legacyItem } = item;
        const { data: legacyData, error: legacyErr } = await supabase.from('os_itens').insert([legacyItem]).select();
        if (legacyErr) throw legacyErr;
        return { data: { ...legacyData[0], nome, descricao }, error: null };
      } catch (err) {
        console.error("Erro ao inserir item de OS no Supabase:", err);
        throw err;
      }
    },
    delete: async (id) => {
      try {
        const { error } = await supabase.from('os_itens').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.error("Erro ao excluir item de OS no Supabase:", err);
        throw err;
      }
    }
  },

  // ── Bancos ──
  bancos: {
    list: async () => {
      try {
        const { data, error } = await supabase.from('bancos').select('*').order('nome');
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error("Erro ao listar bancos no Supabase:", err);
        throw err;
      }
    },
    insert: async (banco) => {
      try {
        const { data, error } = await supabase.from('bancos').insert([banco]).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.error("Erro ao inserir banco no Supabase:", err);
        throw err;
      }
    },
    delete: async (id) => {
      try {
        const { error } = await supabase.from('bancos').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.error("Erro ao excluir banco no Supabase:", err);
        throw err;
      }
    }
  },

  // ── Configurações Gerais (Metas + Colunas do Kanban) ──
  configuracoes: {
    get: async () => {
      try {
        const { data, error } = await supabase.from('configuracoes').select('*').eq('chave', 'erp_configuracoes').maybeSingle();
        if (error) throw error;
        return { data: data ? data.valor : null, error: null };
      } catch (err) {
        console.error("Erro ao carregar configurações no Supabase:", err);
        throw err;
      }
    },
    upsert: async (valor) => {
      try {
        const { data, error } = await supabase.from('configuracoes').upsert({
          chave: 'erp_configuracoes',
          valor,
          atualizado_em: new Date().toISOString()
        }).select();
        if (error) throw error;
        return { data: data[0].valor, error: null };
      } catch (err) {
        console.error("Erro ao salvar configurações no Supabase:", err);
        throw err;
      }
    }
  }
};
