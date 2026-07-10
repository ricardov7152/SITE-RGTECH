-- Script de criação do banco de dados para RG TECH Computadores e ERP

-- Habilitar a extensão UUID (caso não esteja)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    tipo_pessoa TEXT NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')) DEFAULT 'PF',
    nome_completo TEXT NOT NULL, -- Serve para Nome Completo (PF) ou Razão Social (PJ)
    cpf_cnpj TEXT,
    telefone TEXT,
    email TEXT,
    endereco TEXT, -- Armazena Rua e Número
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    origem TEXT CHECK (origem IN ('Indicação', 'Google', 'Instagram', 'Site', 'WhatsApp', 'Outros')),
    
    -- Exclusivos para Pessoa Jurídica (PJ)
    nome_fantasia TEXT,
    inscricao_estadual TEXT,
    nome_responsavel TEXT,

    -- Novos Campos CRM
    consentimento_marketing BOOLEAN DEFAULT FALSE,
    data_nascimento_fundacao DATE,
    observacoes_internas TEXT,
    data_cadastro DATE DEFAULT CURRENT_DATE,
    status_cliente TEXT DEFAULT 'Lead' CHECK (status_cliente IN ('Lead', 'Ativo', 'Inativo')),
    indicado_por_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    tags TEXT,
    ultimo_contato DATE
);

-- 2. Tabela de Produtos e Serviços
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT NOT NULL CHECK (tipo IN ('Serviço', 'Peça')),
    preco NUMERIC(10,2) DEFAULT 0.00,
    preco_custo NUMERIC(10,2) DEFAULT 0.00,
    estoque_atual INTEGER DEFAULT 0,
    status_item TEXT CHECK (status_item IN ('Ativo', 'Inativo')) DEFAULT 'Ativo',
    garantia_valor INTEGER,
    garantia_unidade TEXT CHECK (garantia_unidade IN ('Dias', 'Meses', 'Anos')),
    fornecedor TEXT,
    categoria TEXT,
    subcategoria TEXT,
    garantia TEXT -- Mantido para retrocompatibilidade se necessário
);

-- 3. Tabela de Orçamentos
CREATE TABLE IF NOT EXISTS public.orcamentos (
    id TEXT PRIMARY KEY, -- Formato: ORC-ANO-NUMERO
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nome TEXT NOT NULL, -- Cópia para facilitar listagem rápida
    
    -- Equipamento
    eqp_tipo TEXT,
    eqp_marca TEXT,
    eqp_modelo TEXT,
    eqp_serie TEXT,
    
    -- Problema
    problema_relatado TEXT,
    
    -- Valores
    subtotal NUMERIC(10,2) DEFAULT 0.00,
    desconto NUMERIC(10,2) DEFAULT 0.00,
    total NUMERIC(10,2) DEFAULT 0.00,
    
    -- Condições
    status TEXT DEFAULT 'Em aberto' CHECK (status IN ('Em aberto', 'Aprovado', 'Recusado', 'Concluído')),
    data_emissao DATE DEFAULT CURRENT_DATE,
    validade_dias INTEGER DEFAULT 7,
    prazo_entrega TEXT,
    forma_pagamento TEXT,
    observacoes TEXT,
    motivo_recusa TEXT
);

-- 4. Tabela de Itens do Orçamento
CREATE TABLE IF NOT EXISTS public.orcamento_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orcamento_id TEXT REFERENCES public.orcamentos(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT NOT NULL,
    quantidade INTEGER DEFAULT 1,
    valor_unitario NUMERIC(10,2) DEFAULT 0.00,
    total NUMERIC(10,2) DEFAULT 0.00,
    garantia TEXT
);

-- 5. Tabela Financeira
CREATE TABLE IF NOT EXISTS public.financeiro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
    categoria TEXT NOT NULL, -- ex: 'Orçamento', 'Peças', 'Aluguel', 'Marketing', etc.
    descricao TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pendente', 'Pago')) DEFAULT 'Pendente',
    
    -- Relacionamentos
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    orcamento_id TEXT REFERENCES public.orcamentos(id) ON DELETE SET NULL,
    
    -- Datas
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    
    -- Conciliação
    banco TEXT,
    meio_pagamento TEXT,
    
    -- Misto / Descontos
    valor_pix NUMERIC(10,2) DEFAULT 0.00,
    valor_cartao NUMERIC(10,2) DEFAULT 0.00,
    valor_dinheiro NUMERIC(10,2) DEFAULT 0.00,
    desconto NUMERIC(10,2) DEFAULT 0.00,
    
    observacoes TEXT
);

-- Habilitar RLS (Segurança) mas permitir acesso para simplificar no dev
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;

-- 6. Tabela de Ordem de Serviço
CREATE TABLE IF NOT EXISTS public.ordem_servico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_os TEXT UNIQUE NOT NULL,
    orcamento_id TEXT REFERENCES public.orcamentos(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'recebido' CHECK (status IN ('recebido', 'em_diagnostico', 'aguardando_peca', 'em_execucao', 'pronto_retirada', 'entregue', 'cancelado')),
    data_abertura DATE DEFAULT CURRENT_DATE,
    prazo_entrega_dias INTEGER DEFAULT 5,
    data_entrega_prevista DATE NOT NULL,
    data_entrega_real DATE,
    equipamento_tipo TEXT NOT NULL,
    equipamento_marca TEXT NOT NULL,
    equipamento_modelo TEXT,
    equipamento_numero_serie TEXT,
    acessorios_entregues TEXT,
    tecnico_responsavel TEXT,
    motivo_cancelamento TEXT,
    observacoes_internas TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Tabela de Itens da Ordem de Serviço
CREATE TABLE IF NOT EXISTS public.os_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    os_id UUID REFERENCES public.ordem_servico(id) ON DELETE CASCADE,
    item_catalogo_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('Serviço', 'Peça')),
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    garantia_dias INTEGER NOT NULL DEFAULT 0,
    data_inicio_garantia DATE,
    data_fim_garantia DATE,
    status_garantia TEXT CHECK (status_garantia IN ('ativa', 'expirada')) DEFAULT 'ativa'
);

ALTER TABLE public.ordem_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_itens ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar erros ao rodar o script novamente
DROP POLICY IF EXISTS "Permitir tudo anon (Clientes)" ON public.clientes;
DROP POLICY IF EXISTS "Permitir tudo autenticado (Clientes)" ON public.clientes;

DROP POLICY IF EXISTS "Permitir tudo anon (Produtos)" ON public.produtos;
DROP POLICY IF EXISTS "Permitir tudo autenticado (Produtos)" ON public.produtos;

DROP POLICY IF EXISTS "Permitir tudo anon (Orçamentos)" ON public.orcamentos;
DROP POLICY IF EXISTS "Permitir tudo autenticado (Orçamentos)" ON public.orcamentos;

DROP POLICY IF EXISTS "Permitir tudo anon (Itens)" ON public.orcamento_itens;
DROP POLICY IF EXISTS "Permitir tudo autenticado (Itens)" ON public.orcamento_itens;

DROP POLICY IF EXISTS "Permitir tudo anon (Financeiro)" ON public.financeiro;
DROP POLICY IF EXISTS "Permitir tudo autenticado (Financeiro)" ON public.financeiro;

DROP POLICY IF EXISTS "Permitir tudo anon (Ordem Servico)" ON public.ordem_servico;
DROP POLICY IF EXISTS "Permitir tudo autenticado (Ordem Servico)" ON public.ordem_servico;

DROP POLICY IF EXISTS "Permitir tudo anon (OS Itens)" ON public.os_itens;
DROP POLICY IF EXISTS "Permitir tudo autenticado (OS Itens)" ON public.os_itens;

-- Políticas de acesso restrito (somente usuários autenticados via login)
CREATE POLICY "Permitir tudo autenticado (Clientes)" ON public.clientes FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir tudo autenticado (Produtos)" ON public.produtos FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir tudo autenticado (Orçamentos)" ON public.orcamentos FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir tudo autenticado (Itens)" ON public.orcamento_itens FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir tudo autenticado (Financeiro)" ON public.financeiro FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir tudo autenticado (Ordem Servico)" ON public.ordem_servico FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir tudo autenticado (OS Itens)" ON public.os_itens FOR ALL TO authenticated USING (true);

-- 8. Tabela de Bancos / Contas Bancárias (Dinâmica)
CREATE TABLE IF NOT EXISTS public.bancos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT UNIQUE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo autenticado (Bancos)" ON public.bancos;
CREATE POLICY "Permitir tudo autenticado (Bancos)" ON public.bancos FOR ALL TO authenticated USING (true);

-- 9. Tabela de Configurações Gerais (ERP / Metas)
CREATE TABLE IF NOT EXISTS public.configuracoes (
    chave TEXT PRIMARY KEY,
    valor JSONB NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo autenticado (Configuracoes)" ON public.configuracoes;
CREATE POLICY "Permitir tudo autenticado (Configuracoes)" ON public.configuracoes FOR ALL TO authenticated USING (true);
