import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

// Auxiliar para detectar se estamos rodando no modo offline (Dev Bypass)
const isOffline = () => {
  return localStorage.getItem("rgtech_session") !== null || !supabaseUrl || supabaseUrl.includes("placeholder");
};

// --- BANCO DE DADOS LOCAL FALLBACK (LocalStorage) ---
const localDB = {
  get: (key, defaultVal = []) => {
    try {
      const data = localStorage.getItem(`rg_local_${key}`);
      return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
      console.error(e);
      return defaultVal;
    }
  },
  set: (key, data) => {
    try {
      localStorage.setItem(`rg_local_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  }
};

// Massa de dados inicial padrão caso o local esteja vazio
const initLocalData = () => {
  if (!localStorage.getItem("rg_local_produtos")) {
    localDB.set("produtos", [
      { id: "p1", nome: "Formatação com Instalação Padrão", tipo: "Serviço", preco: 120.00, garantia: "30 dias", descricao: "Instalação de Windows e programas essenciais." },
      { id: "p2", nome: "Limpeza Preventiva e Troca de Pasta Térmica", tipo: "Serviço", preco: 80.00, garantia: "30 dias", descricao: "Troca por pasta térmica premium." },
      { id: "p3", nome: "SSD Kingston 480GB SATA III", tipo: "Peça", preco: 250.00, garantia: "1 Ano do Fabricante", descricao: "Unidade de estado sólido para upgrade." },
      { id: "p4", nome: "Memória RAM DDR4 8GB 3200MHz", tipo: "Peça", preco: 180.00, garantia: "1 Ano", descricao: "Pente de memória para upgrade." }
    ]);
  }
  if (!localStorage.getItem("rg_local_clientes")) {
    localDB.set("clientes", [
      { id: "c1", tipo_pessoa: "PF", nome_completo: "Ricardo Bertollo", cpf_cnpj: "123.456.789-00", telefone: "(66) 99999-9999", email: "ricardo@email.com", endereco: "Rua Celeste, 670, Sorriso - MT", origem: "Site" },
      { id: "c2", tipo_pessoa: "PJ", nome_completo: "Paiol Comercial Agrícola", cpf_cnpj: "12.345.678/0001-99", telefone: "(66) 3544-0000", email: "compras@paiol.com.br", endereco: "Sorriso - MT", origem: "Indicação", nome_fantasia: "Paiol Agrícola", inscricao_estadual: "987654321", nome_responsavel: "Glauber Compras" }
    ]);
  }
  if (!localStorage.getItem("rg_local_orcamentos")) {
    localDB.set("orcamentos", [
      { id: "ORC-2026-1001", created_at: new Date().toISOString(), cliente_id: "c1", cliente_nome: "Ricardo Bertollo", eqp_tipo: "Notebook", eqp_marca: "Dell", eqp_modelo: "Inspiron 15", eqp_serie: "BR12345", problema_relatado: "Notebook não liga, apenas pisca o LED de bateria.", subtotal: 370.00, desconto: 20.00, total: 350.00, status: "Aprovado", data_emissao: "2026-06-02", validade_dias: 7, prazo_entrega: "2 dias úteis", forma_pagamento: "PIX", observacoes: "Cliente aguarda aprovação" }
    ]);
  }
  if (!localStorage.getItem("rg_local_orcamento_itens")) {
    localDB.set("orcamento_itens", [
      { id: "oi1", orcamento_id: "ORC-2026-1001", produto_id: "p1", nome: "Formatação com Instalação Padrão", tipo: "Serviço", quantidade: 1, valor_unitario: 120.00, total: 120.00, garantia: "30 dias" },
      { id: "oi2", orcamento_id: "ORC-2026-1001", produto_id: "p3", nome: "SSD Kingston 480GB SATA III", tipo: "Peça", quantidade: 1, valor_unitario: 250.00, total: 250.00, garantia: "1 Ano do Fabricante" }
    ]);
  }
  if (!localStorage.getItem("rg_local_financeiro")) {
    localDB.set("financeiro", [
      { id: "f1", created_at: new Date().toISOString(), tipo: "Receita", categoria: "Orçamento", descricao: "Orçamento Aprovado ORC-2026-1001 - Ricardo Bertollo", valor: 350.00, status: "Pago", cliente_id: "c1", orcamento_id: "ORC-2026-1001", data_vencimento: "2026-06-02", data_pagamento: "2026-06-02", banco: "Nubank", meio_pagamento: "PIX", valor_pix: 350.00, valor_cartao: 0.00, valor_dinheiro: 0.00, desconto: 20.00, observacoes: "Lançamento automático de aprovação." },
      { id: "f2", created_at: new Date().toISOString(), tipo: "Despesa", categoria: "Marketing", descricao: "Anúncios no Instagram", valor: 100.00, status: "Pago", data_vencimento: "2026-06-01", data_pagamento: "2026-06-01", banco: "Nubank", meio_pagamento: "PIX", valor_pix: 100.00 }
    ]);
  }
};

initLocalData();

// --- OBJETO CENTRAL DE CONSULTAS DO SISTEMA (API) ---
export const db = {
  // ── Clientes ──
  clientes: {
    list: async () => {
      if (isOffline()) {
        return { data: localDB.get("clientes"), error: null };
      }
      try {
        const { data, error } = await supabase.from('clientes').select('*').order('nome_completo');
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        return { data: localDB.get("clientes"), error: null };
      }
    },
    insert: async (cliente) => {
      if (isOffline()) {
        const current = localDB.get("clientes");
        const newCliente = { ...cliente, id: crypto.randomUUID(), created_at: new Date().toISOString() };
        localDB.set("clientes", [...current, newCliente]);
        return { data: newCliente, error: null };
      }
      try {
        const { data, error } = await supabase.from('clientes').insert([cliente]).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("clientes");
        const newCliente = { ...cliente, id: crypto.randomUUID(), created_at: new Date().toISOString() };
        localDB.set("clientes", [...current, newCliente]);
        return { data: newCliente, error: null };
      }
    },
    update: async (id, cliente) => {
      if (isOffline()) {
        const current = localDB.get("clientes");
        const updated = current.map(c => c.id === id ? { ...c, ...cliente } : c);
        localDB.set("clientes", updated);
        return { data: cliente, error: null };
      }
      try {
        const { data, error } = await supabase.from('clientes').update(cliente).eq('id', id).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("clientes");
        const updated = current.map(c => c.id === id ? { ...c, ...cliente } : c);
        localDB.set("clientes", updated);
        return { data: cliente, error: null };
      }
    },
    delete: async (id) => {
      if (isOffline()) {
        const current = localDB.get("clientes");
        localDB.set("clientes", current.filter(c => c.id !== id));
        return { error: null };
      }
      try {
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("clientes");
        localDB.set("clientes", current.filter(c => c.id !== id));
        return { error: null };
      }
    }
  },

  // ── Produtos ──
  produtos: {
    list: async () => {
      if (isOffline()) {
        return { data: localDB.get("produtos"), error: null };
      }
      try {
        const { data, error } = await supabase.from('produtos').select('*').order('nome');
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        return { data: localDB.get("produtos"), error: null };
      }
    },
    insert: async (produto) => {
      if (isOffline()) {
        const current = localDB.get("produtos");
        const newProduto = { ...produto, id: crypto.randomUUID(), created_at: new Date().toISOString() };
        localDB.set("produtos", [...current, newProduto]);
        return { data: newProduto, error: null };
      }
      try {
        const { data, error } = await supabase.from('produtos').insert([produto]).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("produtos");
        const newProduto = { ...produto, id: crypto.randomUUID(), created_at: new Date().toISOString() };
        localDB.set("produtos", [...current, newProduto]);
        return { data: newProduto, error: null };
      }
    },
    update: async (id, produto) => {
      if (isOffline()) {
        const current = localDB.get("produtos");
        const updated = current.map(p => p.id === id ? { ...p, ...produto } : p);
        localDB.set("produtos", updated);
        return { data: produto, error: null };
      }
      try {
        const { data, error } = await supabase.from('produtos').update(produto).eq('id', id).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("produtos");
        const updated = current.map(p => p.id === id ? { ...p, ...produto } : p);
        localDB.set("produtos", updated);
        return { data: produto, error: null };
      }
    },
    delete: async (id) => {
      if (isOffline()) {
        const current = localDB.get("produtos");
        localDB.set("produtos", current.filter(p => p.id !== id));
        return { error: null };
      }
      try {
        const { error } = await supabase.from('produtos').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("produtos");
        localDB.set("produtos", current.filter(p => p.id !== id));
        return { error: null };
      }
    }
  },

  // ── Orçamentos ──
  orcamentos: {
    list: async () => {
      if (isOffline()) {
        return { data: localDB.get("orcamentos"), error: null };
      }
      try {
        const { data, error } = await supabase.from('orcamentos').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        return { data: localDB.get("orcamentos"), error: null };
      }
    },
    get: async (id) => {
      if (isOffline()) {
        const orcamento = localDB.get("orcamentos").find(o => o.id === id);
        const itens = localDB.get("orcamento_itens").filter(oi => oi.orcamento_id === id);
        return { data: orcamento ? { ...orcamento, itens } : null, error: null };
      }
      try {
        const { data: orcamento, error: err1 } = await supabase.from('orcamentos').select('*').eq('id', id).single();
        if (err1) throw err1;
        const { data: itens, error: err2 } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', id);
        if (err2) throw err2;
        return { data: { ...orcamento, itens }, error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const orcamento = localDB.get("orcamentos").find(o => o.id === id);
        const itens = localDB.get("orcamento_itens").filter(oi => oi.orcamento_id === id);
        return { data: orcamento ? { ...orcamento, itens } : null, error: null };
      }
    },
    insert: async (orcamento, itens) => {
      if (isOffline()) {
        // Gerar número sequencial se não informado
        const year = new Date().getFullYear();
        const orcamentos = localDB.get("orcamentos");
        const orcId = orcamento.id || `ORC-${year}-${1000 + orcamentos.length + 1}`;
        
        const newOrcamento = { 
          ...orcamento, 
          id: orcId, 
          created_at: new Date().toISOString() 
        };
        
        const currentOrcamentos = localDB.get("orcamentos");
        localDB.set("orcamentos", [newOrcamento, ...currentOrcamentos]);

        const currentItens = localDB.get("orcamento_itens");
        const newItens = itens.map(item => ({
          ...item,
          id: item.id || crypto.randomUUID(),
          orcamento_id: orcId
        }));
        localDB.set("orcamento_itens", [...currentItens, ...newItens]);

        // Automação: se o orçamento for criado como Aprovado, gera lançamento financeiro
        if (newOrcamento.status === "Aprovado") {
          await db.financeiro.triggerFromOrcamento(newOrcamento);
        }

        return { data: { ...newOrcamento, itens: newItens }, error: null };
      }
      try {
        const year = new Date().getFullYear();
        // Buscar quantidade de orçamentos para gerar o ID sequencial se não houver
        const { count } = await supabase.from('orcamentos').select('*', { count: 'exact', head: true });
        const orcId = orcamento.id || `ORC-${year}-${1000 + (count || 0) + 1}`;
        
        const newOrcamento = { ...orcamento, id: orcId };
        
        const { error: err1 } = await supabase.from('orcamentos').insert([newOrcamento]);
        if (err1) throw err1;

        const newItens = itens.map(item => {
          const { id, ...rest } = item; // remover ID temporário do frontend
          return { ...rest, orcamento_id: orcId };
        });

        const { error: err2 } = await supabase.from('orcamento_itens').insert(newItens);
        if (err2) throw err2;

        // Automação: se o orçamento for criado como Aprovado, gera lançamento financeiro
        if (newOrcamento.status === "Aprovado") {
          await db.financeiro.triggerFromOrcamento(newOrcamento);
        }

        return { data: { ...newOrcamento, itens: newItens }, error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        // Rodar lógica local como fallback
        const orcamentos = localDB.get("orcamentos");
        const orcId = orcamento.id || `ORC-${new Date().getFullYear()}-${1000 + orcamentos.length + 1}`;
        const newOrc = { ...orcamento, id: orcId, created_at: new Date().toISOString() };
        localDB.set("orcamentos", [newOrc, ...orcamentos]);
        const currentItens = localDB.get("orcamento_itens");
        const newItens = itens.map(item => ({ ...item, id: item.id || crypto.randomUUID(), orcamento_id: orcId }));
        localDB.set("orcamento_itens", [...currentItens, ...newItens]);
        if (newOrc.status === "Aprovado") {
          await db.financeiro.triggerFromOrcamento(newOrc);
        }
        return { data: { ...newOrc, itens: newItens }, error: null };
      }
    },
    updateStatus: async (id, status) => {
      if (isOffline()) {
        const orcamentos = localDB.get("orcamentos");
        let updatedOrc = null;
        const updated = orcamentos.map(o => {
          if (o.id === id) {
            updatedOrc = { ...o, status };
            return updatedOrc;
          }
          return o;
        });
        localDB.set("orcamentos", updated);

        // Se mudou para aprovado, disparar lançamento financeiro
        if (status === "Aprovado" && updatedOrc) {
          await db.financeiro.triggerFromOrcamento(updatedOrc);
        }
        return { error: null };
      }
      try {
        const { error } = await supabase.from('orcamentos').update({ status }).eq('id', id);
        if (error) throw error;

        if (status === "Aprovado") {
          const { data: orc } = await supabase.from('orcamentos').select('*').eq('id', id).single();
          if (orc) {
            await db.financeiro.triggerFromOrcamento(orc);
          }
        }
        return { error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const orcamentos = localDB.get("orcamentos");
        let updatedOrc = null;
        const updated = orcamentos.map(o => {
          if (o.id === id) {
            updatedOrc = { ...o, status };
            return updatedOrc;
          }
          return o;
        });
        localDB.set("orcamentos", updated);
        if (status === "Aprovado" && updatedOrc) {
          await db.financeiro.triggerFromOrcamento(updatedOrc);
        }
        return { error: null };
      }
    },
    delete: async (id) => {
      if (isOffline()) {
        const current = localDB.get("orcamentos");
        localDB.set("orcamentos", current.filter(o => o.id !== id));
        const currentItens = localDB.get("orcamento_itens");
        localDB.set("orcamento_itens", currentItens.filter(oi => oi.orcamento_id !== id));
        return { error: null };
      }
      try {
        const { error } = await supabase.from('orcamentos').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("orcamentos");
        localDB.set("orcamentos", current.filter(o => o.id !== id));
        const currentItens = localDB.get("orcamento_itens");
        localDB.set("orcamento_itens", currentItens.filter(oi => oi.orcamento_id !== id));
        return { error: null };
      }
    }
  },

  // ── Financeiro ──
  financeiro: {
    list: async () => {
      if (isOffline()) {
        return { data: localDB.get("financeiro"), error: null };
      }
      try {
        const { data, error } = await supabase.from('financeiro').select('*').order('data_vencimento', { ascending: false });
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        return { data: localDB.get("financeiro"), error: null };
      }
    },
    insert: async (lancamento) => {
      if (isOffline()) {
        const current = localDB.get("financeiro");
        const newLancamento = { ...lancamento, id: crypto.randomUUID(), created_at: new Date().toISOString() };
        localDB.set("financeiro", [newLancamento, ...current]);
        return { data: newLancamento, error: null };
      }
      try {
        const { data, error } = await supabase.from('financeiro').insert([lancamento]).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("financeiro");
        const newLancamento = { ...lancamento, id: crypto.randomUUID(), created_at: new Date().toISOString() };
        localDB.set("financeiro", [newLancamento, ...current]);
        return { data: newLancamento, error: null };
      }
    },
    update: async (id, lancamento) => {
      if (isOffline()) {
        const current = localDB.get("financeiro");
        const updated = current.map(f => f.id === id ? { ...f, ...lancamento } : f);
        localDB.set("financeiro", updated);
        return { data: lancamento, error: null };
      }
      try {
        const { data, error } = await supabase.from('financeiro').update(lancamento).eq('id', id).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("financeiro");
        const updated = current.map(f => f.id === id ? { ...f, ...lancamento } : f);
        localDB.set("financeiro", updated);
        return { data: lancamento, error: null };
      }
    },
    delete: async (id) => {
      if (isOffline()) {
        const current = localDB.get("financeiro");
        localDB.set("financeiro", current.filter(f => f.id !== id));
        return { error: null };
      }
      try {
        const { error } = await supabase.from('financeiro').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("financeiro");
        localDB.set("financeiro", current.filter(f => f.id !== id));
        return { error: null };
      }
    },
    // Trigger de integração automática quando orçamento aprovado
    triggerFromOrcamento: async (orcamento) => {
      // Verificar se já existe um lançamento para este orçamento
      let exists = false;
      if (isOffline()) {
        exists = localDB.get("financeiro").some(f => f.orcamento_id === orcamento.id);
      } else {
        try {
          const { data } = await supabase.from('financeiro').select('id').eq('orcamento_id', orcamento.id);
          exists = data && data.length > 0;
        } catch (e) {
          exists = localDB.get("financeiro").some(f => f.orcamento_id === orcamento.id);
        }
      }

      if (exists) return; // Não duplicar lançamentos

      const novoLancamento = {
        tipo: 'Receita',
        categoria: 'Orçamento',
        descricao: `Orçamento Aprovado ${orcamento.id} - ${orcamento.cliente_nome}`,
        valor: Number(orcamento.total),
        status: 'Pendente', // "A Conferir"
        cliente_id: orcamento.cliente_id,
        orcamento_id: orcamento.id,
        data_vencimento: orcamento.data_emissao || new Date().toISOString().split('T')[0],
        observacoes: 'Lançamento automático gerado pela aprovação do orçamento.'
      };

      await db.financeiro.insert(novoLancamento);
    }
  },
  // ── Itens do Orçamento ──
  orcamento_itens: {
    list: async () => {
      if (isOffline()) {
        return { data: localDB.get("orcamento_itens"), error: null };
      }
      try {
        const { data, error } = await supabase.from('orcamento_itens').select('*');
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        return { data: localDB.get("orcamento_itens"), error: null };
      }
    }
  }
};
