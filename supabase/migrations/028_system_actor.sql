-- =====================================================
-- Migration 028: Finanzas — actor de sistema (depreciación automática)
-- =====================================================
-- El cron de depreciación postea asientos/auditoría sin un usuario real
-- (es una acción automática). Permite actor nulo en las dos tablas que lo
-- requieren: journal_entries.created_by y audit_events.actor_user_id.
-- El resto de las tablas sigue exigiendo un usuario real (created_by NOT NULL).
-- =====================================================

ALTER TABLE public.journal_entries ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.audit_events ALTER COLUMN actor_user_id DROP NOT NULL;
