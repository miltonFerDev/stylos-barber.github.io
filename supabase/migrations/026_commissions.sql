-- =====================================================
-- Migration 026: Finanzas — comisiones a barberos
-- =====================================================
-- Comisión a barberos independientes, devengado diario + pago (diario/semanal).
--   Devengo: Db 5.1 Comisiones a barberos / Hr 2.1.1 Comisiones a pagar.
--   Pago:    Db 2.1.1 / Hr 1.1.x (reparto por cuenta).
-- Pasivo: sub-cuenta 2.1.1 "Comisiones a pagar a barberos" (código de plan, sin FK).
-- Idempotente: UUIDs fijos + ON CONFLICT DO NOTHING.
-- =====================================================

-- 1. Barberos (persons, kind PERSONA)
INSERT INTO public.persons (id, display_name, kind, valid_from) VALUES
  ('77777777-0000-4000-8000-000000000001', 'Ezequiel', 'PERSONA', '2026-10-01'),
  ('77777777-0000-4000-8000-000000000002', 'Aaron',    'PERSONA', '2026-10-01'),
  ('77777777-0000-4000-8000-000000000003', 'Elias',    'PERSONA', '2026-10-01'),
  ('77777777-0000-4000-8000-000000000004', 'Pedro',    'PERSONA', '2026-10-01')
ON CONFLICT (id) DO NOTHING;

-- 2. Línea de resultado "Comisiones a barberos" (COSTO -> 5.1)
INSERT INTO public.result_lines (id, code, name, nature, "order", ledger_account_id, valid_from) VALUES
  ('55555555-0000-4000-8000-000000000001', '5.1', 'Comisiones a barberos', 'COSTO', 5, '5.1', '2026-10-01')
ON CONFLICT (id) DO NOTHING;

-- 3. Devengos de comisión (un registro por barbero por día)
CREATE TABLE IF NOT EXISTS public.commission_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id       uuid NOT NULL REFERENCES public.persons(id),
  effective_date  date NOT NULL,
  amount          numeric(18,2) NOT NULL CHECK (amount > 0),
  currency        text NOT NULL,
  period_id       uuid NOT NULL REFERENCES public.accounting_periods(id),
  idempotency_key text NOT NULL UNIQUE,
  created_by      uuid NOT NULL REFERENCES public.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 4. Pagos de comisión (total saldado al barbero)
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id       uuid NOT NULL REFERENCES public.persons(id),
  effective_date  date NOT NULL,
  amount          numeric(18,2) NOT NULL CHECK (amount > 0),
  currency        text NOT NULL,
  period_id       uuid NOT NULL REFERENCES public.accounting_periods(id),
  idempotency_key text NOT NULL UNIQUE,
  created_by      uuid NOT NULL REFERENCES public.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 5. Reparto por cuenta de cada pago (efectivo / MP / …)
CREATE TABLE IF NOT EXISTS public.commission_payment_distributions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_payment_id uuid NOT NULL REFERENCES public.commission_payments(id) ON DELETE CASCADE,
  account_id            uuid NOT NULL REFERENCES public.accounts(id),
  amount                numeric(18,2) NOT NULL CHECK (amount > 0),
  currency              text NOT NULL
);

-- 6. RLS (lectura DIRECCION/TESORERIA; escritura vía service_role)
ALTER TABLE public.commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payment_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY finanzas_select_commission_records ON public.commission_records
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_commission_payments ON public.commission_payments
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));

CREATE POLICY finanzas_select_commission_payment_distributions ON public.commission_payment_distributions
  FOR SELECT TO authenticated USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'));
