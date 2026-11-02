-- ============================================================================
-- MIGRAÇÃO SUPABASE: MÓDULO KANBAN DE MANUTENÇÃO (ESTILO TRELLO) — RG TECH
-- Cole e execute este script no SQL Editor do seu projeto no Supabase.
-- Ele é 100% seguro (idempotente) e não apaga nenhum dado existente.
-- ============================================================================

-- 1. Remover constraint antiga de status na tabela ordem_servico (se existir)
ALTER TABLE public.ordem_servico
  DROP CONSTRAINT IF EXISTS ordem_servico_status_check;

-- 2. Adicionar novas colunas do Kanban na tabela ordem_servico
ALTER TABLE public.ordem_servico
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS posicao INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS problema_relatado TEXT,
  ADD COLUMN IF NOT EXISTS desconto NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS valor_total NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS condicoes_pagamento TEXT DEFAULT 'PIX ou Cartão';

-- 3. Tornar campos de equipamento e previsão com defaults seguros para permitir
--    a criação rápida de cartão pelo título (igual ao Trello)
ALTER TABLE public.ordem_servico
  ALTER COLUMN equipamento_tipo SET DEFAULT 'Equipamento',
  ALTER COLUMN equipamento_marca SET DEFAULT 'A definir',
  ALTER COLUMN data_entrega_prevista SET DEFAULT (CURRENT_DATE + 5);

-- 4. Migrar registros antigos para os novos status das 6 raias do Kanban
UPDATE public.ordem_servico SET status = 'em_analise' WHERE status = 'em_diagnostico';
UPDATE public.ordem_servico SET status = 'aprovado_execucao' WHERE status = 'em_execucao';
UPDATE public.ordem_servico SET status = 'finalizado' WHERE status IN ('pronto_retirada', 'entregue');

-- Preencher título nos registros antigos que ainda não têm título
UPDATE public.ordem_servico
SET titulo = TRIM(CONCAT(equipamento_tipo, ' ', equipamento_marca, ' ', COALESCE(equipamento_modelo, '')))
WHERE titulo IS NULL OR TRIM(titulo) = '';

-- 5. Adicionar nova constraint de status aceitando as 6 raias + legados para total compatibilidade
ALTER TABLE public.ordem_servico
  ADD CONSTRAINT ordem_servico_status_check
  CHECK (status IN (
    'recebido',
    'em_analise',
    'orcamento_enviado',
    'aprovado_execucao',
    'finalizado',
    'aguardando_peca',
    'em_diagnostico',
    'em_execucao',
    'pronto_retirada',
    'entregue',
    'cancelado'
  ));

-- 6. Permitir nome customizado nos itens da manutenção (os_itens)
ALTER TABLE public.os_itens
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT;

-- 7. Vincular lançamento financeiro diretamente à Ordem de Manutenção (os_id)
ALTER TABLE public.financeiro
  ADD COLUMN IF NOT EXISTS os_id UUID REFERENCES public.ordem_servico(id) ON DELETE SET NULL;

-- 8. Criar índices para deixar o carregamento e ordenação do Kanban instantâneos
CREATE INDEX IF NOT EXISTS idx_ordem_servico_status_posicao
  ON public.ordem_servico (status, posicao);

CREATE INDEX IF NOT EXISTS idx_financeiro_os_id
  ON public.financeiro (os_id);
