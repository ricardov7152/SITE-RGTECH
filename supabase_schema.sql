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
    endereco TEXT,
    origem TEXT CHECK (origem IN ('Indicação', 'Google', 'Instagram', 'Site', 'WhatsApp', 'Outros')),
    
    -- Exclusivos para Pessoa Jurídica (PJ)
    nome_fantasia TEXT,
    inscricao_estadual TEXT,
    nome_responsavel TEXT
);

-- 2. Tabela de Produtos e Serviços
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT NOT NULL CHECK (tipo IN ('Serviço', 'Peça')),
    preco NUMERIC(10,2) DEFAULT 0.00,
    garantia TEXT
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

-- Remover políticas existentes para evitar erros ao rodar o script novamente
DROP POLICY IF EXISTS "Permitir tudo anon (Clientes)" ON public.clientes;
DROP POLICY IF EXISTS "Permitir tudo anon (Produtos)" ON public.produtos;
DROP POLICY IF EXISTS "Permitir tudo anon (Orçamentos)" ON public.orcamentos;
DROP POLICY IF EXISTS "Permitir tudo anon (Itens)" ON public.orcamento_itens;
DROP POLICY IF EXISTS "Permitir tudo anon (Financeiro)" ON public.financeiro;

-- Políticas de acesso aberto (anon/autenticado) para facilitar no dev
CREATE POLICY "Permitir tudo anon (Clientes)" ON public.clientes FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Permitir tudo anon (Produtos)" ON public.produtos FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Permitir tudo anon (Orçamentos)" ON public.orcamentos FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Permitir tudo anon (Itens)" ON public.orcamento_itens FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Permitir tudo anon (Financeiro)" ON public.financeiro FOR ALL TO anon, authenticated USING (true);
