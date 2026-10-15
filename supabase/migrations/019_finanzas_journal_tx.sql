-- =====================================================
-- Migration 019: Finanzas — asiento + líneas atómico (E10 / audit #3)
-- =====================================================
-- Un asiento confirmado y sus líneas se insertan en UNA transacción.
-- Evita el asiento huérfano (sin líneas) o el libro desbalanceado
-- si una inserción intermedia falla.
--
-- SECURITY INVOKER (default): corre con los privilegios del llamador.
-- El repos usa service_role (bypasea RLS). Otros roles no pueden escribir
-- journal_entries porque no hay policies de escritura (deny-all de 018).
-- =====================================================

CREATE OR REPLACE FUNCTION public.insert_journal_entry(p_entry jsonb, p_lines jsonb)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  v_id := (p_entry->>'id')::uuid;

  INSERT INTO public.journal_entries (
    id, entry_date, posting_date, period_id, source_document_type, source_document_id,
    description, status, reverses_entry_id, idempotency_key, created_by, created_at
  ) VALUES (
    v_id,
    (p_entry->>'entry_date')::date,
    (p_entry->>'posting_date')::timestamptz,
    (p_entry->>'period_id')::uuid,
    p_entry->>'source_document_type',
    p_entry->>'source_document_id',
    p_entry->>'description',
    p_entry->>'status',
    CASE WHEN p_entry->>'reverses_entry_id' IS NULL OR p_entry->>'reverses_entry_id' = ''
         THEN NULL ELSE (p_entry->>'reverses_entry_id')::uuid END,
    p_entry->>'idempotency_key',
    (p_entry->>'created_by')::uuid,
    (p_entry->>'created_at')::timestamptz
  );

  INSERT INTO public.journal_lines (entry_id, ledger_account_id, debit, credit, currency)
  SELECT
    v_id,
    l->>'ledger_account_id',
    (l->>'debit')::numeric,
    (l->>'credit')::numeric,
    l->>'currency'
  FROM jsonb_array_elements(p_lines) AS l;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.insert_journal_entry(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_journal_entry(jsonb, jsonb) TO service_role;

-- Done!
