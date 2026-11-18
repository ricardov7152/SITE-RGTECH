-- ============================================================================
-- MIGRAÇÃO SUPABASE — FASE 2: KANBAN DO DIA A DIA — RG TECH
-- Cole e execute no SQL Editor do Supabase.
-- Script idempotente: pode rodar mais de uma vez e NÃO apaga dados.
-- ============================================================================

-- 1. Novas colunas na ordem_servico
--    arquivado          -> tira do quadro as OS já entregues (sem apagar)
--    status_alterado_em -> desde quando o cartão está na etapa atual ("há X dias")
ALTER TABLE public.ordem_servico
  ADD COLUMN IF NOT EXISTS arquivado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_alterado_em TIMESTAMPTZ DEFAULT now();

-- Preenche a data da etapa atual dos cartões existentes com a última atualização
UPDATE public.ordem_servico
SET status_alterado_em = COALESCE(atualizado_em, criado_em, now())
WHERE status_alterado_em IS NULL
   OR status_alterado_em >= now() - INTERVAL '5 minutes';

CREATE INDEX IF NOT EXISTS idx_ordem_servico_arquivado
  ON public.ordem_servico (arquivado);

-- 2. Histórico de mudanças de etapa (base para o tempo médio por etapa — Fase 3)
CREATE TABLE IF NOT EXISTS public.os_historico (
  id BIGSERIAL PRIMARY KEY,
  os_id UUID NOT NULL REFERENCES public.ordem_servico(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  alterado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id UUID DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_os_historico_os
  ON public.os_historico (os_id, alterado_em);

ALTER TABLE public.os_historico ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.os_historico FROM anon;
GRANT SELECT, INSERT ON public.os_historico TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.os_historico_id_seq TO authenticated;

DROP POLICY IF EXISTS "Permitir tudo autenticado (OS Historico)" ON public.os_historico;
CREATE POLICY "Permitir tudo autenticado (OS Historico)" ON public.os_historico
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Trigger: ao mudar de etapa, atualiza status_alterado_em e grava no histórico
CREATE OR REPLACE FUNCTION public.fn_os_status_alterado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_alterado_em := now();
    INSERT INTO public.os_historico (os_id, status_anterior, status_novo)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_os_status_alterado ON public.ordem_servico;
CREATE TRIGGER trg_os_status_alterado
  BEFORE UPDATE OF status ON public.ordem_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_os_status_alterado();

-- Registra a etapa inicial de cada cartão novo
CREATE OR REPLACE FUNCTION public.fn_os_criada()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.os_historico (os_id, status_anterior, status_novo, alterado_em)
  VALUES (NEW.id, NULL, NEW.status, COALESCE(NEW.status_alterado_em, now()));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_os_criada ON public.ordem_servico;
CREATE TRIGGER trg_os_criada
  AFTER INSERT ON public.ordem_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_os_criada();

-- 4. Ponto de partida do histórico para as OS que já existem
INSERT INTO public.os_historico (os_id, status_anterior, status_novo, alterado_em)
SELECT os.id, NULL, os.status, COALESCE(os.status_alterado_em, os.criado_em, now())
FROM public.ordem_servico os
WHERE NOT EXISTS (
  SELECT 1 FROM public.os_historico h WHERE h.os_id = os.id
);

-- ============================================================================
-- OPCIONAL: a coluna "Finalizado" passa a se chamar "Pronto p/ retirada" e
-- surge a coluna "Entregue". Se quiser que as OS finalizadas há mais de 7 dias
-- já apareçam como ENTREGUES, remova os dois traços (--) da linha abaixo:
-- ============================================================================
-- UPDATE public.ordem_servico SET status = 'entregue' WHERE status = 'finalizado' AND data_entrega_real < CURRENT_DATE - 7;
