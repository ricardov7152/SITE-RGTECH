# Constituição do Projeto — SITE-RGTECH & ERP

## 📋 Regras de Comportamento
1. **Confiabilidade sobre Velocidade:** Construir código limpo, testável e determinístico.
2. **Sem Suposições:** Nunca adivinhar regras de negócio; em caso de dúvida, perguntar.
3. **Design Coeso e Premium:** A área administrativa/ERP deve compartilhar da mesma identidade visual moderna e escura (dark mode, tons de roxo/azul e preto, glassmorphism) do site institucional da RG TECH.
4. **Segurança por Padrão:** Toda chamada ao banco e telas de gerenciamento devem exigir login via Supabase Auth (e-mail/senha).
5. **Automação de Fluxo:** Aprovou orçamento -> Gera lançamento financeiro "a conferir" (status: Pendente) automaticamente.
6. **Conexão 100% Online Exclusiva (Sem Modo Offline):** É terminantemente proibido projetar, programar ou manter qualquer "Modo de Contingência Local", "Offline Fallback" ou "Dev Bypass" utilizando LocalStorage/session para simular dados do banco. Toda e qualquer funcionalidade desenvolvida deve operar em tempo real, conectada diretamente ao Supabase (Auth e Database), tratando eventuais erros de rede ou permissão de forma transparente na interface para que o usuário saiba imediatamente o estado real da conexão.

## 🏗️ Invariantes Arquiteturais
* **Frontend:** Single Page Application (SPA) com React 19 + Vite 8.
* **Estilização:** Tailwind CSS v4 (conforme configurado no site principal).
* **Roteamento:** `react-router-dom` v7 para gerenciar as rotas públicas do site e as rotas protegidas do painel administrativo.
* **Banco de Dados & Autenticação:** Supabase.
* **Configurações:** Segredos carregados do arquivo `.env` (ex: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

---

## 📊 Esquema de Dados (Data Schemas)

### 1. Tabela: `clientes`
Armazena os clientes (PF e PJ) e suas origens.
```sql
CREATE TABLE public.clientes (
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
```

### 2. Tabela: `produtos`
Itens pré-cadastrados (Peças ou Serviços) para acelerar a criação de orçamentos.
```sql
CREATE TABLE public.produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT NOT NULL CHECK (tipo IN ('Serviço', 'Peça')),
    preco NUMERIC(10,2) DEFAULT 0.00,
    garantia TEXT
);
```

### 3. Tabela: `orcamentos`
Registros de orçamentos emitidos.
```sql
CREATE TABLE public.orcamentos (
    id TEXT PRIMARY KEY, -- Formato: ORC-ANO-NUMERO (ex: ORC-2026-1025)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nome TEXT NOT NULL, -- Cache para listagem rápida
    
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
    observacoes TEXT
);
```

### 4. Tabela: `orcamento_itens`
Itens associados a cada orçamento.
```sql
CREATE TABLE public.orcamento_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orcamento_id TEXT REFERENCES public.orcamentos(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT NOT NULL, -- Peça ou Serviço
    quantidade INTEGER DEFAULT 1,
    valor_unitario NUMERIC(10,2) DEFAULT 0.00,
    total NUMERIC(10,2) DEFAULT 0.00,
    garantia TEXT
);
```

### 5. Tabela: `financeiro`
Lançamentos financeiros de receitas (entradas) e despesas (saídas).
```sql
CREATE TABLE public.financeiro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
    categoria TEXT NOT NULL, -- ex: 'Orçamento', 'Peças', 'Aluguel', 'Marketing', etc.
    descricao TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pendente', 'Pago')) DEFAULT 'Pendente',
    
    -- Relacionamentos Opcionais
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    orcamento_id TEXT REFERENCES public.orcamentos(id) ON DELETE SET NULL,
    
    -- Datas
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    
    -- Detalhes de Pagamento (Conciliação)
    banco TEXT, -- ex: 'Nubank', 'Sicredi', 'Caixa', etc.
    meio_pagamento TEXT, -- ex: 'PIX', 'Cartão de Crédito', 'Dinheiro', 'Misto', etc.
    
    -- Valores detalhados para pagamentos mistos ou descontos
    valor_pix NUMERIC(10,2) DEFAULT 0.00,
    valor_cartao NUMERIC(10,2) DEFAULT 0.00,
    valor_dinheiro NUMERIC(10,2) DEFAULT 0.00,
    desconto NUMERIC(10,2) DEFAULT 0.00,
    
    observacoes TEXT
);
```

---

## 📝 Log de Manutenção
* **2026-06-03:** Inicialização da união entre o site RG-TECH institucional e o painel administrativo ERP. Definição do novo esquema de banco de dados robusto no `gemini.md`.
