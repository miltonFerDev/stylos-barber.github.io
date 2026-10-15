-- =====================================================
-- Migration 018: Finanzas — RLS, roles e inmutabilidad (E8b)
-- =====================================================
-- 1. Fix: columna reversed_at faltante en 017.
-- 2. Función has_role(role_code) con delegación activa.
-- 3. Triggers de inmutabilidad (audit append-only, journal inmutable).
-- 4. Políticas RLS de solo lectura para authenticated.
--    El cliente no escribe: mutaciones por service_role (D4 §2, D6 §3).
-- =====================================================

-- =====================================================
-- 1. Fix columna
-- =====================================================
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz;

-- =====================================================
-- 2. Función has_role (rol directo + delegación activa)
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_role(role_code text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.code = role_code
    )
    OR EXISTS (
      SELECT 1
      FROM public.role_delegations d
      WHERE d.delegate_user_id = auth.uid()
        AND d.role_code = role_code
        AND d.starts_at <= now() AND now() <= d.ends_at
    );
$$;

REVOKE ALL ON FUNCTION public.has_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated;

-- =====================================================
-- 3. Triggers de inmutabilidad
-- =====================================================

-- 3.1 audit_events: append-only
CREATE OR REPLACE FUNCTION public.prevent_audit_events_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events es append-only (no se puede modificar ni borrar)';
END $$;

DROP TRIGGER IF EXISTS trg_audit_events_immutable ON public.audit_events;
CREATE TRIGGER trg_audit_events_immutable
  BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_events_mutation();

-- 3.2 journal_lines: inmutable
CREATE OR REPLACE FUNCTION public.prevent_journal_lines_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'journal_lines son inmutables (corregir por reversión, no por update)';
END $$;

DROP TRIGGER IF EXISTS trg_journal_lines_immutable ON public.journal_lines;
CREATE TRIGGER trg_journal_lines_immutable
  BEFORE UPDATE OR DELETE ON public.journal_lines
  FOR EACH ROW EXECUTE FUNCTION public.prevent_journal_lines_mutation();

-- 3.3 journal_entries: inmutable salvo reversed_at
CREATE OR REPLACE FUNCTION public.prevent_journal_entries_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'journal_entries son inmutables (no se pueden eliminar)';
  END IF;

  IF OLD.entry_date IS DISTINCT FROM NEW.entry_date
     OR OLD.posting_date IS DISTINCT FROM NEW.posting_date
     OR OLD.period_id IS DISTINCT FROM NEW.period_id
     OR OLD.source_document_type IS DISTINCT FROM NEW.source_document_type
     OR OLD.source_document_id IS DISTINCT FROM NEW.source_document_id
     OR OLD.description IS DISTINCT FROM NEW.description
     OR OLD.status IS DISTINCT FROM NEW.status
     OR OLD.reverses_entry_id IS DISTINCT FROM NEW.reverses_entry_id
     OR OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key
     OR OLD.created_by IS DISTINCT FROM NEW.created_by
     OR OLD.created_at IS DISTINCT FROM NEW.created_at
  THEN
    RAISE EXCEPTION 'journal_entries son inmutables (solo reversed_at puede cambiar)';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_journal_entries_immutable ON public.journal_entries;
CREATE TRIGGER trg_journal_entries_immutable
  BEFORE UPDATE OR DELETE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_journal_entries_mutation();

-- =====================================================
-- 4. Políticas RLS de solo lectura (authenticated)
-- =====================================================
-- 4.1 Lectura operativa: DIRECCION + TESORERIA
-- =====================================================
CREATE POLICY finanzas_select_persons ON public.persons
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_categories ON public.categories
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_subcategories ON public.subcategories
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_result_lines ON public.result_lines
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_ledger_accounts ON public.ledger_accounts
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_accounts ON public.accounts
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_accounting_periods ON public.accounting_periods
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_journal_entries ON public.journal_entries
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_journal_lines ON public.journal_lines
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_account_movements ON public.account_movements
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_obligations ON public.obligations
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_payments ON public.payments
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_payment_applications ON public.payment_applications
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_transfers ON public.transfers
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_income_records ON public.income_records
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_income_distributions ON public.income_distributions
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_external_settlements ON public.external_settlements
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_daily_closings ON public.daily_closings
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_reconciliations ON public.reconciliations
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_income_forecasts ON public.income_forecasts
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_investments ON public.investments
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_investment_evaluations ON public.investment_evaluations
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_attachments ON public.attachments
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

-- =====================================================
-- 4.2 Lectura sensible: solo DIRECCION
-- =====================================================
CREATE POLICY finanzas_select_settings_parameters ON public.settings_parameters
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION'));

CREATE POLICY finanzas_select_roles ON public.roles
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION'));

CREATE POLICY finanzas_select_user_roles ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION'));

CREATE POLICY finanzas_select_role_delegations ON public.role_delegations
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION'));

-- =====================================================
-- 4.3 Identidad: propio + DIRECCION
-- =====================================================
CREATE POLICY finanzas_select_users ON public.users
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role('DIRECCION'));

-- =====================================================
-- 4.4 Auditoría: DIRECCION + TESORERIA
-- =====================================================
CREATE POLICY finanzas_select_audit_events ON public.audit_events
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

-- Done!
