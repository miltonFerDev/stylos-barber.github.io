-- =====================================================
-- Migration 038: Finanzas — reset de datos demo (transaccional)
-- =====================================================
-- Limpia TODA la operación de prueba para arrancar con datos reales.
-- Conserva maestros, identidad, períodos contables y configuración:
--   users, roles, user_roles, role_delegations,
--   persons, categories, subcategories, result_lines, ledger_accounts, accounts,
--   accounting_periods, settings_parameters.
-- Borra (TRUNCATE) todo lo transaccional y el log de auditoría demo.
--   Incluye los saldos de apertura seed (source='seed') de la migration 020,
--   que viven en account_movements.
-- Irreversible: no hay datos productivos aún (confirmado por el dueño).
-- =====================================================

TRUNCATE TABLE
  public.account_movements,
  public.daily_closings,
  public.reconciliations,
  public.journal_lines,
  public.journal_entries,
  public.commission_payment_distributions,
  public.commission_payments,
  public.commission_records,
  public.payment_applications,
  public.payments,
  public.transfers,
  public.income_distributions,
  public.income_records,
  public.external_settlements,
  public.obligations,
  public.income_forecasts,
  public.investment_evaluations,
  public.investments,
  public.attachments,
  public.audit_events
RESTART IDENTITY CASCADE;
