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
  const currentFin = localStorage.getItem("rg_local_financeiro");
  if (currentFin && !currentFin.includes("f3")) {
    localStorage.removeItem("rg_local_financeiro");
  }

  const currentProd = localStorage.getItem("rg_local_produtos");
  if (currentProd && !currentProd.includes("preco_custo")) {
    localStorage.removeItem("rg_local_produtos");
  }

  if (!localStorage.getItem("rg_local_produtos")) {
    localDB.set("produtos", [
      { id: "p1", nome: "Formatação com Instalação Padrão", tipo: "Serviço", preco: 120.00, preco_custo: 0.00, estoque_atual: 0, status_item: "Ativo", garantia_valor: 30, garantia_unidade: "Dias", garantia: "30 Dias", categoria: "Serviços", subcategoria: "Software", descricao: "Instalação de Windows e programas essenciais." },
      { id: "p2", nome: "Limpeza Preventiva e Troca de Pasta Térmica", tipo: "Serviço", preco: 80.00, preco_custo: 10.00, estoque_atual: 0, status_item: "Ativo", garantia_valor: 30, garantia_unidade: "Dias", garantia: "30 Dias", categoria: "Serviços", subcategoria: "Limpeza", descricao: "Troca por pasta térmica premium." },
      { id: "p3", nome: "SSD Kingston 480GB SATA III", tipo: "Peça", preco: 250.00, preco_custo: 160.00, estoque_atual: 5, status_item: "Ativo", garantia_valor: 1, garantia_unidade: "Anos", garantia: "1 Ano", fornecedor: "Kingston Oficial", categoria: "Armazenamento", subcategoria: "SSD", descricao: "Unidade de estado sólido para upgrade." },
      { id: "p4", nome: "Memória RAM DDR4 8GB 3200MHz", tipo: "Peça", preco: 180.00, preco_custo: 110.00, estoque_atual: 8, status_item: "Ativo", garantia_valor: 1, garantia_unidade: "Anos", garantia: "1 Ano", fornecedor: "Kabum S/A", categoria: "Memória", subcategoria: "RAM DDR4", descricao: "Pente de memória para upgrade." }
    ]);
  }
  if (!localStorage.getItem("rg_local_clientes")) {
    localDB.set("clientes", [
      { 
        id: "c1", 
        tipo_pessoa: "PF", 
        nome_completo: "Ricardo Bertollo", 
        cpf_cnpj: "123.456.789-00", 
        telefone: "(66) 99999-9999", 
        email: "ricardo@email.com", 
        endereco: "Rua Celeste, 670, Sorriso - MT", 
        origem: "Site",
        consentimento_marketing: true,
        data_nascimento_fundacao: "1995-10-15",
        observacoes_internas: "Cliente VIP, prefere atendimento à tarde.",
        data_cadastro: "2026-01-10",
        status_cliente: "Ativo",
        tags: "VIP, Gamer",
        ultimo_contato: "2026-06-15"
      },
      { 
        id: "c2", 
        tipo_pessoa: "PJ", 
        nome_completo: "Paiol Comercial Agrícola", 
        cpf_cnpj: "12.345.678/0001-99", 
        telefone: "(66) 3544-0000", 
        email: "compras@paiol.com.br", 
        endereco: "Sorriso - MT", 
        origem: "Indicação", 
        nome_fantasia: "Paiol Agrícola", 
        inscricao_estadual: "987654321", 
        nome_responsavel: "Glauber Compras",
        consentimento_marketing: false,
        data_nascimento_fundacao: "2010-05-20",
        observacoes_internas: "Sempre pede faturamento em boleto para 30 dias.",
        data_cadastro: "2026-03-15",
        status_cliente: "Ativo",
        tags: "Agro, Recorrente",
        indicado_por_id: "c1",
        ultimo_contato: "2026-06-17"
      }
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
    const getFutureDateString = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split("T")[0];
    };

    localDB.set("financeiro", [
      { id: "f1", created_at: new Date().toISOString(), tipo: "Receita", categoria: "Orçamento", descricao: "Orçamento Aprovado ORC-2026-1001 - Ricardo Bertollo", valor: 350.00, status: "Pago", cliente_id: "c1", orcamento_id: "ORC-2026-1001", data_vencimento: "2026-06-02", data_pagamento: "2026-06-02", banco: "Nubank", meio_pagamento: "PIX", valor_pix: 350.00, valor_cartao: 0.00, valor_dinheiro: 0.00, desconto: 20.00, observacoes: "Lançamento automático de aprovação." },
      { id: "f2", created_at: new Date().toISOString(), tipo: "Despesa", categoria: "Marketing", descricao: "Anúncios no Instagram", valor: 100.00, status: "Pago", data_vencimento: "2026-06-01", data_pagamento: "2026-06-01", banco: "Nubank", meio_pagamento: "PIX", valor_pix: 100.00 },
      // Lançamentos pendentes futuros para demonstrar a Projeção (Fluxo de Caixa Projetado)
      { id: "f3", created_at: new Date().toISOString(), tipo: "Receita", categoria: "Orçamento", descricao: "Orçamento Futuro Projetado - Ricardo Bertollo", valor: 500.00, status: "Pendente", cliente_id: "c1", data_vencimento: getFutureDateString(5) },
      { id: "f4", created_at: new Date().toISOString(), tipo: "Receita", categoria: "Orçamento", descricao: "Manutenção Projetada - Paiol Agrícola", valor: 1200.00, status: "Pendente", cliente_id: "c2", data_vencimento: getFutureDateString(12) },
      { id: "f5", created_at: new Date().toISOString(), tipo: "Despesa", categoria: "Peças", descricao: "Compra de Componentes Importados", valor: 300.00, status: "Pendente", data_vencimento: getFutureDateString(6) },
      { id: "f6", created_at: new Date().toISOString(), tipo: "Despesa", categoria: "Aluguel", descricao: "Aluguel Mensal - Ponto Comercial", valor: 1500.00, status: "Pendente", data_vencimento: getFutureDateString(20), recorrente: true, frequencia: "Mensal" }
    ]);
  }

  if (!localStorage.getItem("rg_local_categorias_produtos")) {
    localStorage.setItem("rg_local_categorias_produtos", JSON.stringify({
      "Serviço": ["Serviços", "Consultoria", "Licenças", "Outros"],
      "Peça": ["Armazenamento", "Memória", "Processadores", "Placas de Vídeo", "Placas-Mãe", "Fontes", "Gabinetes", "Periféricos", "Outros"]
    }));
  }

  if (!localStorage.getItem("rg_local_subcategorias_produtos")) {
    localStorage.setItem("rg_local_subcategorias_produtos", JSON.stringify([
      "SSD SATA", "SSD M.2 NVMe", "HD Externo", "RAM DDR4", "RAM DDR5", "Mouse Gamer", "Teclado Mecânico"
    ]));
  }

  if (!localStorage.getItem("rg_local_ordens_servico")) {
    localDB.set("ordens_servico", []);
  }
  if (!localStorage.getItem("rg_local_os_itens")) {
    localDB.set("os_itens", []);
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

        // Automação: se o orçamento for criado como Aprovado, gera lançamento financeiro e OS
        if (newOrcamento.status === "Aprovado") {
          await db.financeiro.triggerFromOrcamento(newOrcamento);
          await db.ordem_servico.triggerFromOrcamento(newOrcamento);
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

        // Automação: se o orçamento for criado como Aprovado, gera lançamento financeiro e OS
        if (newOrcamento.status === "Aprovado") {
          await db.financeiro.triggerFromOrcamento(newOrcamento);
          await db.ordem_servico.triggerFromOrcamento(newOrcamento);
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
          await db.ordem_servico.triggerFromOrcamento(newOrc);
        }
        return { data: { ...newOrc, itens: newItens }, error: null };
      }
    },
    updateStatus: async (id, status, motivo_recusa = null) => {
      if (isOffline()) {
        const orcamentos = localDB.get("orcamentos");
        let updatedOrc = null;
        const updated = orcamentos.map(o => {
          if (o.id === id) {
            updatedOrc = { ...o, status, motivo_recusa: status === "Recusado" ? motivo_recusa : null };
            return updatedOrc;
          }
          return o;
        });
        localDB.set("orcamentos", updated);

        // Se mudou para aprovado, disparar lançamento financeiro e OS
        if (status === "Aprovado" && updatedOrc) {
          await db.financeiro.triggerFromOrcamento(updatedOrc);
          await db.ordem_servico.triggerFromOrcamento(updatedOrc);
        }
        return { error: null };
      }
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
        console.warn("Supabase erro, caindo para local storage:", err);
        const orcamentos = localDB.get("orcamentos");
        let updatedOrc = null;
        const updated = orcamentos.map(o => {
          if (o.id === id) {
            updatedOrc = { ...o, status, motivo_recusa: status === "Recusado" ? motivo_recusa : null };
            return updatedOrc;
          }
          return o;
        });
        localDB.set("orcamentos", updated);
        if (status === "Aprovado" && updatedOrc) {
          await db.financeiro.triggerFromOrcamento(updatedOrc);
          await db.ordem_servico.triggerFromOrcamento(updatedOrc);
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
  },

  // ── Ordem de Serviço ──
  ordem_servico: {
    list: async () => {
      if (isOffline()) {
        return { data: localDB.get("ordens_servico"), error: null };
      }
      try {
        const { data, error } = await supabase.from('ordem_servico').select('*').order('criado_em', { ascending: false });
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        return { data: localDB.get("ordens_servico"), error: null };
      }
    },
    get: async (id) => {
      if (isOffline()) {
        const os = localDB.get("ordens_servico").find(o => o.id === id);
        const itens = localDB.get("os_itens").filter(oi => oi.os_id === id);
        return { data: os ? { ...os, itens } : null, error: null };
      }
      try {
        const { data: os, error: err1 } = await supabase.from('ordem_servico').select('*').eq('id', id).single();
        if (err1) throw err1;
        const { data: itens, error: err2 } = await supabase.from('os_itens').select('*').eq('os_id', id);
        if (err2) throw err2;
        return { data: { ...os, itens }, error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const os = localDB.get("ordens_servico").find(o => o.id === id);
        const itens = localDB.get("os_itens").filter(oi => oi.os_id === id);
        return { data: os ? { ...os, itens } : null, error: null };
      }
    },
    insert: async (os, itens) => {
      if (isOffline()) {
        const current = localDB.get("ordens_servico");
        const newOS = { ...os, id: crypto.randomUUID(), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };
        localDB.set("ordens_servico", [newOS, ...current]);

        const currentItens = localDB.get("os_itens");
        const newItens = itens.map(item => ({ ...item, id: crypto.randomUUID(), os_id: newOS.id }));
        localDB.set("os_itens", [...currentItens, ...newItens]);

        return { data: { ...newOS, itens: newItens }, error: null };
      }
      try {
        const { data: newOS, error: err1 } = await supabase.from('ordem_servico').insert([os]).select();
        if (err1) throw err1;
        const mappedItens = itens.map(item => ({ ...item, os_id: newOS[0].id }));
        const { data: newItens, error: err2 } = await supabase.from('os_itens').insert(mappedItens).select();
        if (err2) throw err2;
        return { data: { ...newOS[0], itens: newItens }, error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("ordens_servico");
        const newOS = { ...os, id: crypto.randomUUID(), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };
        localDB.set("ordens_servico", [newOS, ...current]);
        const currentItens = localDB.get("os_itens");
        const newItens = itens.map(item => ({ ...item, id: crypto.randomUUID(), os_id: newOS.id }));
        localDB.set("os_itens", [...currentItens, ...newItens]);
        return { data: { ...newOS, itens: newItens }, error: null };
      }
    },
    update: async (id, os) => {
      if (isOffline()) {
        const current = localDB.get("ordens_servico");
        const updated = current.map(o => o.id === id ? { ...o, ...os, atualizado_em: new Date().toISOString() } : o);
        localDB.set("ordens_servico", updated);
        return { error: null };
      }
      try {
        const { error } = await supabase.from('ordem_servico').update(os).eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("ordens_servico");
        const updated = current.map(o => o.id === id ? { ...o, ...os, atualizado_em: new Date().toISOString() } : o);
        localDB.set("ordens_servico", updated);
        return { error: null };
      }
    },
    updateStatus: async (id, status, motivo_cancelamento = null) => {
      // 1. Obter a OS atual para ver o status anterior
      let os = null;
      let osItens = [];
      if (isOffline()) {
        os = localDB.get("ordens_servico").find(o => o.id === id);
        osItens = localDB.get("os_itens").filter(oi => oi.os_id === id);
      } else {
        try {
          const { data: dbOS } = await supabase.from('ordem_servico').select('*').eq('id', id).single();
          os = dbOS;
          const { data: dbItens } = await supabase.from('os_itens').select('*').eq('os_id', id);
          osItens = dbItens || [];
        } catch (e) {
          os = localDB.get("ordens_servico").find(o => o.id === id);
          osItens = localDB.get("os_itens").filter(oi => oi.os_id === id);
        }
      }

      if (!os) return { error: "OS não encontrada" };
      const statusAnterior = os.status;

      // 2. Atualizar o status da OS
      const updates = { 
        status, 
        atualizado_em: new Date().toISOString(),
        motivo_cancelamento: status === "cancelado" ? motivo_cancelamento : os.motivo_cancelamento
      };

      if (status === "entregue") {
        updates.data_entrega_real = new Date().toISOString().split('T')[0];
      }

      if (isOffline()) {
        const currentOS = localDB.get("ordens_servico");
        const updated = currentOS.map(o => o.id === id ? { ...o, ...updates } : o);
        localDB.set("ordens_servico", updated);
      } else {
        try {
          const { error } = await supabase.from('ordem_servico').update(updates).eq('id', id);
          if (error) throw error;
        } catch (e) {
          const currentOS = localDB.get("ordens_servico");
          const updated = currentOS.map(o => o.id === id ? { ...o, ...updates } : o);
          localDB.set("ordens_servico", updated);
        }
      }

      // GATILHO 2 — Baixa de estoque
      const novoStatusBaixa = status === "em_execucao" || status === "entregue";
      const anteriorStatusBaixa = statusAnterior === "em_execucao" || statusAnterior === "entregue";

      if (novoStatusBaixa && !anteriorStatusBaixa) {
        for (const item of osItens) {
          if (item.tipo === "Peça" && item.item_catalogo_id) {
            if (isOffline()) {
              const produtos = localDB.get("produtos");
              const updatedProds = produtos.map(p => {
                if (p.id === item.item_catalogo_id) {
                  return { ...p, estoque_atual: Math.max(0, (p.estoque_atual || 0) - item.quantidade) };
                }
                return p;
              });
              localDB.set("produtos", updatedProds);
            } else {
              try {
                const { data: prod } = await supabase.from('produtos').select('estoque_atual').eq('id', item.item_catalogo_id).single();
                if (prod) {
                  const novaQtd = Math.max(0, (prod.estoque_atual || 0) - item.quantidade);
                  await supabase.from('produtos').update({ estoque_atual: novaQtd }).eq('id', item.item_catalogo_id);
                }
              } catch (e) {
                const produtos = localDB.get("produtos");
                const updatedProds = produtos.map(p => {
                  if (p.id === item.item_catalogo_id) {
                    return { ...p, estoque_atual: Math.max(0, (p.estoque_atual || 0) - item.quantidade) };
                  }
                  return p;
                });
                localDB.set("produtos", updatedProds);
              }
            }
          }
        }
      }

      // GATILHO 3 — Alerta de peça em falta
      if (status === "aguardando_peca") {
        const alertas = localDB.get("alertas_estoque_os") || [];
        const novosAlertas = [...alertas];
        for (const item of osItens) {
          if (item.tipo === "Peça" && item.item_catalogo_id) {
            let estoque = 0;
            if (isOffline()) {
              const p = localDB.get("produtos").find(prod => prod.id === item.item_catalogo_id);
              estoque = p ? p.estoque_atual : 0;
            } else {
              try {
                const { data } = await supabase.from('produtos').select('estoque_atual').eq('id', item.item_catalogo_id).single();
                estoque = data ? data.estoque_atual : 0;
              } catch (e) {
                const p = localDB.get("produtos").find(prod => prod.id === item.item_catalogo_id);
                estoque = p ? p.estoque_atual : 0;
              }
            }

            if (estoque < item.quantidade) {
              const msg = `Peça em falta para a OS ${os.numero_os} (Necessário: ${item.quantidade}, Em Estoque: ${estoque})`;
              if (!novosAlertas.some(a => a.os_id === id && a.item_id === item.item_catalogo_id)) {
                novosAlertas.push({
                  id: crypto.randomUUID(),
                  os_id: id,
                  numero_os: os.numero_os,
                  item_id: item.item_catalogo_id,
                  mensagem: msg,
                  criado_em: new Date().toISOString()
                });
              }
            }
          }
        }
        localDB.set("alertas_estoque_os", novosAlertas);
      }

      // GATILHO 4 — Fechamento e garantia (Quando muda para entregue)
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

        if (isOffline()) {
          const currentItens = localDB.get("os_itens");
          const mapping = currentItens.map(ci => {
            const match = updatedItens.find(ui => ui.id === ci.id);
            return match ? { ...ci, ...match } : ci;
          });
          localDB.set("os_itens", mapping);
        } else {
          try {
            for (const ui of updatedItens) {
              await supabase.from('os_itens').update({
                data_inicio_garantia: ui.data_inicio_garantia,
                data_fim_garantia: ui.data_fim_garantia,
                status_garantia: 'ativa'
              }).eq('id', ui.id);
            }
          } catch (e) {
            const currentItens = localDB.get("os_itens");
            const mapping = currentItens.map(ci => {
              const match = updatedItens.find(ui => ui.id === ci.id);
              return match ? { ...ci, ...match } : ci;
            });
            localDB.set("os_itens", mapping);
          }
        }

        if (os.orcamento_id) {
          if (isOffline()) {
            const fin = localDB.get("financeiro");
            const updatedFin = fin.map(f => {
              if (f.orcamento_id === os.orcamento_id && f.meio_pagamento === "na retirada") {
                return { ...f, status: "Pago", data_pagamento: dataInicioStr };
              }
              return f;
            });
            localDB.set("financeiro", updatedFin);
          } else {
            try {
              const { data: finRec } = await supabase.from('financeiro').select('*').eq('orcamento_id', os.orcamento_id).single();
              if (finRec && finRec.meio_pagamento === "na retirada") {
                await supabase.from('financeiro').update({ status: "Pago", data_pagamento: dataInicioStr }).eq('id', finRec.id);
              }
            } catch (e) {
              const fin = localDB.get("financeiro");
              const updatedFin = fin.map(f => {
                if (f.orcamento_id === os.orcamento_id && f.meio_pagamento === "na retirada") {
                  return { ...f, status: "Pago", data_pagamento: dataInicioStr };
                }
                return f;
              });
              localDB.set("financeiro", updatedFin);
            }
          }
        }

        // GATILHO 5 — Histórico do cliente
        if (os.cliente_id) {
          let totalOrc = 0;
          if (os.orcamento_id) {
            if (isOffline()) {
              const o = localDB.get("orcamentos").find(orc => orc.id === os.orcamento_id);
              totalOrc = o ? Number(o.total) : 0;
            } else {
              try {
                const { data } = await supabase.from('orcamentos').select('total').eq('id', os.orcamento_id).single();
                totalOrc = data ? Number(data.total) : 0;
              } catch (e) {
                const o = localDB.get("orcamentos").find(orc => orc.id === os.orcamento_id);
                totalOrc = o ? Number(o.total) : 0;
              }
            }
          }

          if (isOffline()) {
            const clientes = localDB.get("clientes");
            const updatedCli = clientes.map(c => {
              if (c.id === os.cliente_id) {
                return {
                  ...c,
                  total_os_concluidas: (c.total_os_concluidas || 0) + 1,
                  ultimo_contato: dataInicioStr
                };
              }
              return c;
            });
            localDB.set("clientes", updatedCli);
          } else {
            try {
              await supabase.from('clientes').update({ ultimo_contato: dataInicioStr }).eq('id', os.cliente_id);
            } catch (e) {
              const clientes = localDB.get("clientes");
              const updatedCli = clientes.map(c => {
                if (c.id === os.cliente_id) {
                  return {
                    ...c,
                    total_os_concluidas: (c.total_os_concluidas || 0) + 1,
                    ultimo_contato: dataInicioStr
                  };
                }
                return c;
              });
              localDB.set("clientes", updatedCli);
            }
          }
        }
      }

      return { error: null };
    },
    triggerFromOrcamento: async (orcamento) => {
      let exists = false;
      if (isOffline()) {
        exists = localDB.get("ordens_servico").some(os => os.orcamento_id === orcamento.id);
      } else {
        try {
          const { data } = await supabase.from('ordem_servico').select('id').eq('orcamento_id', orcamento.id);
          exists = data && data.length > 0;
        } catch (e) {
          exists = localDB.get("ordens_servico").some(os => os.orcamento_id === orcamento.id);
        }
      }

      if (exists) return;

      let orcItens = [];
      if (isOffline()) {
        orcItens = localDB.get("orcamento_itens").filter(oi => oi.orcamento_id === orcamento.id);
      } else {
        try {
          const { data } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', orcamento.id);
          orcItens = data || [];
        } catch (e) {
          orcItens = localDB.get("orcamento_itens").filter(oi => oi.orcamento_id === orcamento.id);
        }
      }

      const year = new Date().getFullYear();
      let count = 0;
      if (isOffline()) {
        count = localDB.get("ordens_servico").length;
      } else {
        try {
          const { count: dbCount } = await supabase.from('ordem_servico').select('*', { count: 'exact', head: true });
          count = dbCount || 0;
        } catch (e) {
          count = localDB.get("ordens_servico").length;
        }
      }
      const numeroOs = `OS-${year}-${1000 + count + 1}`;

      let prazoDias = 5;
      if (orcamento.prazo_entrega) {
        const parsed = parseInt(orcamento.prazo_entrega.replace(/\D/g, ""), 10);
        if (!isNaN(parsed)) {
          prazoDias = parsed;
        }
      }

      const dataAberturaStr = new Date().toISOString().split('T')[0];
      const dataAbertura = new Date();
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

      let insertedOS = null;
      if (isOffline()) {
        const currentOS = localDB.get("ordens_servico");
        insertedOS = { ...novaOS, id: crypto.randomUUID(), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };
        localDB.set("ordens_servico", [insertedOS, ...currentOS]);
      } else {
        try {
          const { data, error } = await supabase.from('ordem_servico').insert([novaOS]).select();
          if (error) throw error;
          insertedOS = data[0];
        } catch (e) {
          const currentOS = localDB.get("ordens_servico");
          insertedOS = { ...novaOS, id: crypto.randomUUID(), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };
          localDB.set("ordens_servico", [insertedOS, ...currentOS]);
        }
      }

      if (!insertedOS) return;

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

      if (isOffline()) {
        const currentItems = localDB.get("os_itens");
        const newItems = osItens.map(item => ({ ...item, id: crypto.randomUUID() }));
        localDB.set("os_itens", [...currentItems, ...newItems]);
      } else {
        try {
          const { error } = await supabase.from('os_itens').insert(osItens);
          if (error) throw error;
        } catch (e) {
          const currentItems = localDB.get("os_itens");
          const newItems = osItens.map(item => ({ ...item, id: crypto.randomUUID() }));
          localDB.set("os_itens", [...currentItems, ...newItems]);
        }
      }
    }
  },

  // ── Itens da OS ──
  os_itens: {
    insert: async (item) => {
      if (isOffline()) {
        const current = localDB.get("os_itens");
        const newItem = { ...item, id: crypto.randomUUID() };
        localDB.set("os_itens", [...current, newItem]);
        return { data: newItem, error: null };
      }
      try {
        const { data, error } = await supabase.from('os_itens').insert([item]).select();
        if (error) throw error;
        return { data: data[0], error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("os_itens");
        const newItem = { ...item, id: crypto.randomUUID() };
        localDB.set("os_itens", [...current, newItem]);
        return { data: newItem, error: null };
      }
    },
    delete: async (id) => {
      if (isOffline()) {
        const current = localDB.get("os_itens");
        localDB.set("os_itens", current.filter(oi => oi.id !== id));
        return { error: null };
      }
      try {
        const { error } = await supabase.from('os_itens').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.warn("Supabase erro, caindo para local storage:", err);
        const current = localDB.get("os_itens");
        localDB.set("os_itens", current.filter(oi => oi.id !== id));
        return { error: null };
      }
    }
  }
};
