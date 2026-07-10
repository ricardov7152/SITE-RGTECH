import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

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

  // ── Orçamentos ──
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
        const { count } = await supabase.from('orcamentos').select('*', { count: 'exact', head: true });
        const orcId = orcamento.id || `ORC-${year}-${1000 + (count || 0) + 1}`;
        
        const newOrcamento = { ...orcamento, id: orcId };
        
        const { error: err1 } = await supabase.from('orcamentos').insert([newOrcamento]);
        if (err1) throw err1;

        const newItens = itens.map(item => {
          const { id, ...rest } = item;
          return { ...rest, orcamento_id: orcId };
        });

        const { error: err2 } = await supabase.from('orcamento_itens').insert(newItens);
        if (err2) throw err2;

        if (newOrcamento.status === "Aprovado") {
          await db.financeiro.triggerFromOrcamento(newOrcamento);
          await db.ordem_servico.triggerFromOrcamento(newOrcamento);
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
            await db.ordem_servico.triggerFromOrcamento(orc);
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

  // ── Ordem de Serviço ──
  ordem_servico: {
    list: async () => {
      try {
        const { data, error } = await supabase.from('ordem_servico').select('*').order('criado_em', { ascending: false });
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error("Erro ao listar ordens de serviço no Supabase:", err);
        throw err;
      }
    },
    get: async (id) => {
      try {
        const { data: os, error: err1 } = await supabase.from('ordem_servico').select('*').eq('id', id).single();
        if (err1) throw err1;
        const { data: itens, error: err2 } = await supabase.from('os_itens').select('*').eq('os_id', id);
        if (err2) throw err2;
        return { data: { ...os, itens }, error: null };
      } catch (err) {
        console.error("Erro ao carregar ordem de serviço no Supabase:", err);
        throw err;
      }
    },
    insert: async (os, itens) => {
      try {
        const { data: newOS, error: err1 } = await supabase.from('ordem_servico').insert([os]).select();
        if (err1) throw err1;
        const mappedItens = itens.map(item => ({ ...item, os_id: newOS[0].id }));
        const { data: newItens, error: err2 } = await supabase.from('os_itens').insert(mappedItens).select();
        if (err2) throw err2;
        return { data: { ...newOS[0], itens: newItens }, error: null };
      } catch (err) {
        console.error("Erro ao inserir ordem de serviço no Supabase:", err);
        throw err;
      }
    },
    update: async (id, os) => {
      try {
        const { error } = await supabase.from('ordem_servico').update(os).eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.error("Erro ao atualizar ordem de serviço no Supabase:", err);
        throw err;
      }
    },
    updateStatus: async (id, status, motivo_cancelamento = null) => {
      try {
        const { data: dbOS } = await supabase.from('ordem_servico').select('*').eq('id', id).single();
        const os = dbOS;
        if (!os) return { error: "OS não encontrada" };
        const statusAnterior = os.status;

        const { data: dbItens } = await supabase.from('os_itens').select('*').eq('os_id', id);
        const osItens = dbItens || [];

        const updates = { 
          status, 
          atualizado_em: new Date().toISOString(),
          motivo_cancelamento: status === "cancelado" ? motivo_cancelamento : os.motivo_cancelamento
        };

        if (status === "entregue") {
          updates.data_entrega_real = new Date().toISOString().split('T')[0];
        }

        const { error } = await supabase.from('ordem_servico').update(updates).eq('id', id);
        if (error) throw error;

        const novoStatusBaixa = status === "em_execucao" || status === "entregue";
        const anteriorStatusBaixa = statusAnterior === "em_execucao" || statusAnterior === "entregue";

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

        if (status === "entregue") {
          const dataInicioStr = new Date().toISOString().split('T')[0];
          
          const updatedItens = osItens.map(item => {
            const inicio = new Date();
            const fim = new Date(inicio);
            fim.setDate(fim.getDate() + (item.garantia_dias || 0));
            return {
              ...item,
              data_inicio_garantia: dataInicioStr,
              data_fim_garantia: fim.toISOString().split('T')[0],
              status_garantia: 'ativa'
            };
          });

          for (const ui of updatedItens) {
            await supabase.from('os_itens').update({
              data_inicio_garantia: ui.data_inicio_garantia,
              data_fim_garantia: ui.data_fim_garantia,
              status_garantia: 'ativa'
            }).eq('id', ui.id);
          }

          if (os.orcamento_id) {
            const { data: finRec } = await supabase.from('financeiro').select('*').eq('orcamento_id', os.orcamento_id).single();
            if (finRec && finRec.meio_pagamento === "na retirada") {
              await supabase.from('financeiro').update({ status: "Pago", data_pagamento: dataInicioStr }).eq('id', finRec.id);
            }
          }

          if (os.cliente_id) {
            await supabase.from('clientes').update({ ultimo_contato: dataInicioStr }).eq('id', os.cliente_id);
          }
        }

        return { error: null };
      } catch (err) {
        console.error("Erro ao atualizar status da OS no Supabase:", err);
        throw err;
      }
    },
    triggerFromOrcamento: async (orcamento) => {
      try {
        const { data } = await supabase.from('ordem_servico').select('id').eq('orcamento_id', orcamento.id);
        const exists = data && data.length > 0;
        if (exists) return;

        let orcItens = [];
        const { data: dbItens } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', orcamento.id);
        orcItens = dbItens || [];

        const year = new Date().getFullYear();
        const { count: dbCount } = await supabase.from('ordem_servico').select('*', { count: 'exact', head: true });
        const count = dbCount || 0;
        const numeroOs = `OS-${year}-${1000 + count + 1}`;

        let prazoDias = 5;
        if (orcamento.prazo_entrega) {
          const parsed = parseInt(orcamento.prazo_entrega.replace(/\D/g, ""), 10);
          if (!isNaN(parsed)) {
            prazoDias = parsed;
          }
        }

        const dataAberturaStr = orcamento.data_emissao || new Date().toISOString().split('T')[0];
        const dataAbertura = new Date(dataAberturaStr + "T00:00:00");
        const dataPrevistaDate = new Date(dataAbertura);
        dataPrevistaDate.setDate(dataPrevistaDate.getDate() + prazoDias);
        const dataPrevistaStr = dataPrevistaDate.toISOString().split('T')[0];

        const novaOS = {
          numero_os: numeroOs,
          orcamento_id: orcamento.id,
          cliente_id: orcamento.cliente_id,
          status: 'recebido',
          data_abertura: dataAberturaStr,
          prazo_entrega_dias: prazoDias,
          data_entrega_prevista: dataPrevistaStr,
          equipamento_tipo: orcamento.eqp_tipo || "Equipamento",
          equipamento_marca: orcamento.eqp_marca || "Genérica",
          equipamento_modelo: orcamento.eqp_modelo || "",
          equipamento_numero_serie: orcamento.eqp_serie || "",
          acessorios_entregues: "",
          tecnico_responsavel: "Técnico Padrão",
          observacoes_internas: "Gerado automaticamente por aprovação de orçamento."
        };

        const { data: insertedOSData, error: insertOSErr } = await supabase.from('ordem_servico').insert([novaOS]).select();
        if (insertOSErr) throw insertOSErr;
        const insertedOS = insertedOSData[0];

        const osItens = orcItens.map(oi => {
          let garantiaDias = 30;
          if (oi.garantia) {
            const valor = parseInt(oi.garantia.replace(/\D/g, ""), 10);
            if (!isNaN(valor)) {
              if (oi.garantia.toLowerCase().includes("ano")) {
                garantiaDias = valor * 365;
              } else if (oi.garantia.toLowerCase().includes("mês") || oi.garantia.toLowerCase().includes("mes")) {
                garantiaDias = valor * 30;
              } else {
                garantiaDias = valor;
              }
            }
          }

          return {
            os_id: insertedOS.id,
            item_catalogo_id: oi.produto_id,
            tipo: oi.tipo,
            quantidade: oi.quantidade,
            valor_unitario: Number(oi.valor_unitario),
            garantia_dias: garantiaDias,
            status_garantia: 'ativa'
          };
        });

        const { error: insertOSItensErr } = await supabase.from('os_itens').insert(osItens);
        if (insertOSItensErr) throw insertOSItensErr;
      } catch (err) {
        console.error("Erro na automação OS de orçamento:", err);
        throw err;
      }
    }
  },

  // ── Itens da OS ──
  os_itens: {
    insert: async (item) => {
      try {
        const { data, error } = await supabase.from('os_itens').insert([item]).select();
        if (error) throw error;
        return { data: data[0], error: null };
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
  // ── Configurações Gerais ──
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
