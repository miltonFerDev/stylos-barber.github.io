-- =====================================================
-- Migration 017: Finanzas — schema (E8a)
-- =====================================================
-- Crea el subconjunto de tablas del sistema financiero
-- usadas por los servicios de los sprints 1-14 (ER.md D1).
-- Solo schema + constraints baratas (CHECK/UNIQUE/NOT NULL).
-- RLS: habilitado (deny-all). Políticas y grants en E8b.
-- Triggers de invariantes complejas (balance, inmutabilidad,
-- límites de aplicación): sprint de hardening posterior.
-- =====================================================

-- =====================================================
-- 1. Identidad y acceso
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.roles (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id    uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES public.users(id),
  UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.role_delegations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code         text NOT NULL,
  delegate_user_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  starts_at         timestamptz NOT NULL,
  ends_at           timestamptz NOT NULL,
  reason            text,
  created_by        uuid REFERENCES public.users(id)
);

-- =====================================================
-- 2. Maestros (con vigencia)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.persons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('PERSONA','EMPRESA')),
  tax_id       text,
  valid_from   date NOT NULL,
  valid_to     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL,
  name       text NOT NULL,
  nature     text NOT NULL CHECK (nature IN ('OPERATIVA','EXTRAORDINARIA','FINANCIERA')),
  valid_from date NOT NULL,
  valid_to   date,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.subcategories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id),
  code        text NOT NULL,
  name        text NOT NULL,
  valid_from  date NOT NULL,
  valid_to    date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  nature       text NOT NULL CHECK (nature IN ('ACTIVO','PASIVO','PATRIMONIO','INGRESO','GASTO','PUENTE')),
  parent_id    uuid REFERENCES public.ledger_accounts(id),
  is_postable  boolean NOT NULL DEFAULT true,
  valid_from   date NOT NULL,
  valid_to     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.result_lines (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL,
  name              text NOT NULL,
  nature            text NOT NULL CHECK (nature IN ('INGRESO','COSTO','GASTO','NO_RESULTADO')),
  "order"           integer NOT NULL DEFAULT 0,
  ledger_account_id text NOT NULL, -- código del plan de cuentas (ej. '4.1'), sin FK
  valid_from        date NOT NULL,
  valid_to          date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  kind                 text NOT NULL CHECK (kind IN ('EFECTIVO','BANCO','BILLETERA','TRANSITORIA')),
  ownership            text NOT NULL CHECK (ownership IN ('PROPIA','EXTERNA','RESTRINGIDA')),
  financial_institution text,
  currency             text NOT NULL,
  ledger_account_id    text NOT NULL, -- código del plan de cuentas (ej. '1.1.1'), sin FK
  is_available         boolean NOT NULL DEFAULT false,
  is_reconcilable      boolean NOT NULL DEFAULT false,
  valid_from           date NOT NULL,
  valid_to             date,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid REFERENCES public.users(id)
);

-- =====================================================
-- 3. Libro (períodos y asientos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  starts_on       date NOT NULL,
  ends_on         date NOT NULL,
  status          text NOT NULL CHECK (status IN ('ABIERTO','EN_REVISION','CERRADO')),
  closed_at       timestamptz,
  closed_by       uuid REFERENCES public.users(id),
  reopened_reason text
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date           date NOT NULL,
  posting_date         timestamptz NOT NULL DEFAULT now(),
  period_id            uuid NOT NULL REFERENCES public.accounting_periods(id),
  source_document_type text NOT NULL,
  source_document_id   text NOT NULL,
  description          text NOT NULL,
  status               text NOT NULL DEFAULT 'CONFIRMADO' CHECK (status IN ('CONFIRMADO','REVERTIDO')),
  reverses_entry_id    uuid REFERENCES public.journal_entries(id),
  idempotency_key      text NOT NULL UNIQUE,
  created_by           uuid NOT NULL REFERENCES public.users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reverses_entry_id)
);

-- I-04: un documento confirmado real genera a lo sumo un asiento canónico
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_source_once
  ON public.journal_entries (source_document_type, source_document_id)
  WHERE reverses_entry_id IS NULL;

CREATE TABLE IF NOT EXISTS public.journal_lines (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id          uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  ledger_account_id text NOT NULL, -- código del plan de cuentas, sin FK
  debit             numeric(18,2) NOT NULL DEFAULT 0,
  credit            numeric(18,2) NOT NULL DEFAULT 0,
  currency          text NOT NULL,
  CHECK (debit >= 0 AND credit >= 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);

-- =====================================================
-- 4. Tesorería
-- =====================================================
CREATE TABLE IF NOT EXISTS public.account_movements (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           uuid NOT NULL REFERENCES public.accounts(id),
  effective_date       date NOT NULL,
  amount               numeric(18,2) NOT NULL CHECK (amount > 0),
  direction            text NOT NULL CHECK (direction IN ('IN','OUT')),
  currency             text NOT NULL,
  source_document_type text NOT NULL,
  source_document_id   text NOT NULL,
  journal_entry_id     uuid REFERENCES public.journal_entries(id),
  idempotency_key      text NOT NULL UNIQUE,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_closings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid NOT NULL REFERENCES public.accounts(id),
  closing_date date NOT NULL,
  real_balance numeric(18,2) NOT NULL,
  currency     text NOT NULL,
  status       text NOT NULL CHECK (status IN ('BORRADOR','CONFIRMADO')),
  created_by   uuid NOT NULL REFERENCES public.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, closing_date)
);

CREATE TABLE IF NOT EXISTS public.reconciliations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES public.accounts(id),
  period_id           uuid NOT NULL REFERENCES public.accounting_periods(id),
  as_of               date NOT NULL,
  theoretical_balance numeric(18,2) NOT NULL,
  real_balance        numeric(18,2) NOT NULL,
  difference          numeric(18,2) NOT NULL,
  currency            text NOT NULL,
  is_shortfall        boolean NOT NULL DEFAULT false,
  status              text NOT NULL CHECK (status IN ('PENDIENTE','RESUELTA')),
  resolution_note     text,
  resolved_by         uuid REFERENCES public.users(id)
);

-- =====================================================
-- 5. Operación (documentos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.obligations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept                 text NOT NULL,
  person_id               uuid NOT NULL REFERENCES public.persons(id),
  category_id             uuid NOT NULL REFERENCES public.categories(id),
  result_line_id          uuid NOT NULL REFERENCES public.result_lines(id),
  planned_account_id      uuid NOT NULL REFERENCES public.accounts(id),
  estimated_amount        numeric(18,2) NOT NULL CHECK (estimated_amount > 0),
  estimated_amount_version integer NOT NULL DEFAULT 1,
  final_amount            numeric(18,2) CHECK (final_amount IS NULL OR final_amount > 0),
  currency                text NOT NULL,
  is_estimated            boolean NOT NULL DEFAULT false,
  due_date                date NOT NULL,
  expected_payment_date   date,
  priority                text NOT NULL DEFAULT 'P3' CHECK (priority IN ('P1','P2','P3','P4')),
  status                  text NOT NULL CHECK (status IN ('BORRADOR','PENDIENTE','PROGRAMADA','PARCIAL','PAGADA','VENCIDA','ANULADA')),
  period_id               uuid NOT NULL REFERENCES public.accounting_periods(id),
  recurrence_rule_id      text,
  source                  text NOT NULL DEFAULT 'REAL',
  created_by              uuid NOT NULL REFERENCES public.users(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  idempotency_key         text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date      date NOT NULL,
  account_id          uuid NOT NULL REFERENCES public.accounts(id),
  amount              numeric(18,2) NOT NULL CHECK (amount > 0),
  currency            text NOT NULL,
  status              text NOT NULL CHECK (status IN ('BORRADOR','CONFIRMADO','CONCILIADO','ANULADO','REVERTIDO')),
  attachment_required boolean NOT NULL DEFAULT false,
  idempotency_key     text NOT NULL UNIQUE,
  source              text NOT NULL DEFAULT 'REAL',
  created_by          uuid NOT NULL REFERENCES public.users(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_applications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id     uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  obligation_id  uuid NOT NULL REFERENCES public.obligations(id),
  applied_amount numeric(18,2) NOT NULL CHECK (applied_amount > 0),
  currency       text NOT NULL,
  UNIQUE (payment_id, obligation_id)
);

CREATE TABLE IF NOT EXISTS public.transfers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date   date NOT NULL,
  from_account_id  uuid NOT NULL REFERENCES public.accounts(id),
  to_account_id    uuid NOT NULL REFERENCES public.accounts(id),
  amount           numeric(18,2) NOT NULL CHECK (amount > 0),
  currency         text NOT NULL,
  status           text NOT NULL CHECK (status IN ('BORRADOR','CONFIRMADO','ANULADO','REVERTIDO')),
  idempotency_key  text NOT NULL UNIQUE,
  source           text NOT NULL DEFAULT 'REAL',
  created_by       uuid NOT NULL REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (from_account_id <> to_account_id)
);

CREATE TABLE IF NOT EXISTS public.income_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date  date NOT NULL,
  service_amount  numeric(18,2) NOT NULL,
  product_amount  numeric(18,2) NOT NULL,
  currency        text NOT NULL,
  status          text NOT NULL CHECK (status IN ('BORRADOR','CONFIRMADO','ANULADO')),
  period_id       uuid NOT NULL REFERENCES public.accounting_periods(id),
  adjustment_note text,
  idempotency_key text NOT NULL UNIQUE,
  source          text NOT NULL DEFAULT 'REAL',
  created_by      uuid NOT NULL REFERENCES public.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.income_distributions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  income_record_id uuid NOT NULL REFERENCES public.income_records(id) ON DELETE CASCADE,
  account_id       uuid NOT NULL REFERENCES public.accounts(id),
  amount           numeric(18,2) NOT NULL CHECK (amount > 0),
  currency         text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.external_settlements (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_person_id   uuid NOT NULL REFERENCES public.persons(id),
  external_account_id uuid REFERENCES public.accounts(id),
  result_line_id     uuid NOT NULL REFERENCES public.result_lines(id),
  concept            text NOT NULL,
  amount             numeric(18,2) NOT NULL CHECK (amount > 0),
  currency           text NOT NULL,
  nature             text NOT NULL CHECK (nature IN ('PRESTAMO','APORTE','CUENTA_CORRIENTE')),
  effective_date     date NOT NULL,
  status             text NOT NULL CHECK (status IN ('CONFIRMADO','REINTEGRADO')),
  note               text,
  idempotency_key    text NOT NULL UNIQUE,
  source             text NOT NULL DEFAULT 'REAL',
  created_by         uuid NOT NULL REFERENCES public.users(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 6. Planificación y proyección
-- =====================================================
CREATE TABLE IF NOT EXISTS public.income_forecasts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario      text NOT NULL CHECK (scenario IN ('CONSERVADOR','BASE','OPTIMISTA')),
  forecast_date date NOT NULL,
  amount        numeric(18,2) NOT NULL,
  currency      text NOT NULL,
  source        text NOT NULL CHECK (source IN ('CONFIRMADO','RECURRENTE','MANUAL','PROMEDIO','ESCENARIO')),
  confidence    text NOT NULL CHECK (confidence IN ('ALTA','MEDIA','BAJA')),
  account_id    uuid REFERENCES public.accounts(id)
);

CREATE TABLE IF NOT EXISTS public.investments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept       text NOT NULL,
  amount        numeric(18,2) NOT NULL CHECK (amount > 0),
  currency      text NOT NULL,
  tentative_date date NOT NULL,
  status        text NOT NULL CHECK (status IN ('BORRADOR','EVALUADA','APROBADA','POSTERGADA','RECHAZADA')),
  decision_note text,
  created_by    uuid NOT NULL REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investment_evaluations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id         uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  scenario              text NOT NULL CHECK (scenario IN ('CONSERVADOR','BASE','OPTIMISTA')),
  min_projected_balance numeric(18,2) NOT NULL,
  capacity_amount       numeric(18,2) NOT NULL,
  currency              text NOT NULL,
  confidence            text NOT NULL CHECK (confidence IN ('ALTA','MEDIA','BAJA')),
  evaluated_at          timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 7. Soporte transversal
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attachments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id   text NOT NULL,
  storage_key text NOT NULL,
  checksum    text NOT NULL,
  mime        text NOT NULL,
  size_bytes  integer NOT NULL,
  is_private  boolean NOT NULL DEFAULT true,
  uploaded_by uuid NOT NULL REFERENCES public.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   text NOT NULL,
  entity_id     text NOT NULL,
  action        text NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES public.users(id),
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  reason        text
);

CREATE TABLE IF NOT EXISTS public.settings_parameters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL,
  value       text NOT NULL,
  valid_from  date NOT NULL,
  valid_to    date,
  approved_by uuid REFERENCES public.users(id)
);

-- =====================================================
-- 8. Índices para queries frecuentes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_account_movements_account ON public.account_movements(account_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_obligations_status ON public.obligations(status);
CREATE INDEX IF NOT EXISTS idx_obligations_due_date ON public.obligations(due_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON public.journal_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON public.journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_payments_account ON public.payments(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_income_forecasts_scenario ON public.income_forecasts(scenario);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);

-- =====================================================
-- 9. RLS habilitado (deny-all por defecto)
--    Políticas y grants: sprint E8b.
-- =====================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','roles','user_roles','role_delegations',
    'persons','categories','subcategories','result_lines','ledger_accounts','accounts',
    'accounting_periods','journal_entries','journal_lines',
    'account_movements','daily_closings','reconciliations',
    'obligations','payments','payment_applications','transfers','income_records','income_distributions','external_settlements',
    'income_forecasts','investments','investment_evaluations',
    'attachments','audit_events','settings_parameters'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- Done!
