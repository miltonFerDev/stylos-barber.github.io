-- =====================================================
-- Migration 020: Finanzas — seed de maestros y cuentas (desarrollo)
-- =====================================================
-- Datos de ejemplo para que el tablero deje de estar vacío.
-- NO es dato productivo: saldos de apertura marcados source='seed'.
-- Regla AGENTS.md: no mezclar beta con productivo.
--
-- P3 (parcial, 2026-10-19):
--   - Santander WASHINGTON -> EXTERNA (como MARI), no disponible.
--   - BaPro MILTON          -> PROPIA, disponible.
--   - MARI y subcuentas finales siguen PENDIENTE (ver plan-cuentas.md D2).
--
-- Idempotente: UUIDs fijos + ON CONFLICT DO NOTHING.
-- Aplicar con `supabase db push` o desde el Dashboard.
-- =====================================================

-- 1. Período contable abierto
INSERT INTO public.accounting_periods (id, code, starts_on, ends_on, status)
VALUES
  ('bbbbbbbb-0000-4000-8000-000000000001', '2026-10', '2026-10-01', '2026-10-31', 'ABIERTO')
ON CONFLICT (code) DO NOTHING;

-- 2. Cuentas financieras
INSERT INTO public.accounts (
  id, name, kind, ownership, financial_institution, currency,
  ledger_account_id, is_available, is_reconcilable, valid_from
) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Efectivo',             'EFECTIVO',  'PROPIA',  NULL,              'ARS', '1.1.1', true,  true,  '2026-10-01'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Santander DENNYS',     'BANCO',     'PROPIA',  'Santander',       'ARS', '1.1.2', true,  true,  '2026-10-01'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'Mercado Pago Dennys',  'BILLETERA', 'PROPIA',  'Mercado Pago',    'ARS', '1.1.3', true,  true,  '2026-10-01'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Mercado Pago MAI',     'BILLETERA', 'PROPIA',  'Mercado Pago',    'ARS', '1.1.3', false, true,  '2026-10-01'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'Mercado Pago MARI',    'BILLETERA', 'EXTERNA', 'Mercado Pago',    'ARS', '6.3',   false, false, '2026-10-01'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'Santander WASHINGTON', 'BANCO',     'EXTERNA', 'Santander',       'ARS', '6.3',   false, false, '2026-10-01'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 'BaPro MILTON',         'BANCO',     'PROPIA',  'Banco Provincia', 'ARS', '1.1.2', true,  true,  '2026-10-01')
ON CONFLICT (id) DO NOTHING;

-- 3. Movimientos de apertura (saldos de ejemplo, source='seed')
-- Solo cuentas PROPIAS + disponibles; las EXTERNA no computan disponibilidad.
INSERT INTO public.account_movements (
  id, account_id, effective_date, amount, direction, currency,
  source_document_type, source_document_id, idempotency_key
) VALUES
  ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '2026-10-01', 50000.00,  'IN', 'ARS', 'seed', 'apertura-efectivo',         'seed-apertura-efectivo'),
  ('cccccccc-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', '2026-10-01', 180000.00, 'IN', 'ARS', 'seed', 'apertura-santander-dennys', 'seed-apertura-santander-dennys'),
  ('cccccccc-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000003', '2026-10-01', 90000.00,  'IN', 'ARS', 'seed', 'apertura-mp-dennys',        'seed-apertura-mp-dennys'),
  ('cccccccc-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000007', '2026-10-01', 40000.00,  'IN', 'ARS', 'seed', 'apertura-bapro-milton',     'seed-apertura-bapro-milton')
ON CONFLICT (idempotency_key) DO NOTHING;
