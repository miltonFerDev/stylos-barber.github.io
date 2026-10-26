-- =====================================================
-- Migration 024: external_settlements.result_line_id nullable
-- =====================================================
-- P7 (retiro contra cuenta corriente): un retiro es un flujo del dueño sin
-- gasto asociado, por lo que no tiene línea de resultado. Se relaja el NOT NULL
-- manteniendo la FK (permite NULL). Solo lo usan los retiros de CUENTA_CORRIENTE.
-- =====================================================
ALTER TABLE public.external_settlements
  ALTER COLUMN result_line_id DROP NOT NULL;
