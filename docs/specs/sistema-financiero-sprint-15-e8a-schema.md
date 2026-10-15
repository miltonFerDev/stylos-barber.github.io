# Spec — Sistema financiero sprint 15 (E8a): schema y migración Supabase

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-e8-cierre-decisiones.md` (decisiones P9/P10/P12 cerradas) y de los sprints 1–14.
> Épica del backlog: **E8 — Seguridad, RLS, storage y backup**. Este sprint cubre solo el **schema** (tablas + constraints). RLS, repos reales, storage y backup van en sprints siguientes (E8b/E8c/E8d).

## 1. Resumen

Crear la migración SQL `supabase/migrations/017_finanzas_schema.sql` con el **subconjunto de tablas que usan los servicios de los sprints 1–14**, derivado de `docs/diseno-financiero/ER.md` (D1) y de los tipos del dominio (`src/finanzas/domain/*`).

**No se crean todavía:** RLS policies, repos Supabase, storage, triggers de invariantes complejas.

## 2. Subconjunto de tablas (29)

Solo las tablas con servicio/dominio existente. Se difieren las de épicas futuras.

| Grupo | Tablas | Usado por (sprint) |
|---|---|---|
| Identidad | `users`, `roles`, `user_roles`, `role_delegations` | identity, permission (1, 5) |
| Maestros | `persons`, `categories`, `subcategories`, `result_lines`, `ledger_accounts`, `accounts` | masters (4) |
| Libro | `accounting_periods`, `journal_entries`, `journal_lines` | journal, periods (2, 3) |
| Tesorería | `account_movements`, `daily_closings`, `reconciliations` | closings (9) |
| Operación | `obligations`, `payments`, `payment_applications`, `transfers`, `income_records`, `income_distributions`, `external_settlements` | obligations, payments, transfers, incomes, external-settlements (6–8, 10) |
| Proyección | `income_forecasts`, `investments`, `investment_evaluations` | forecast, investments (11, 12) |
| Soporte | `attachments`, `audit_events`, `settings_parameters` | attachments, audit, forecast-reserve (5, 10, 11) |

**Diferidas (no creadas ahora):** `recurrence_rules`, `expenses`, `commissions`, `owner_withdrawals`, `contributions`, `budgets`, `budget_lines`, `account_ledger_map` — no tienen servicio todavía.

## 3. Convenciones de tipos (ER.md §6)

| Aspecto | Regla |
|---|---|
| PK | `uuid` (generada por la app; `gen_random_uuid()` como default de conveniencia). |
| Importes | `numeric(18,2)` NOT NULL + columna `currency text` NOT NULL (ISO-4217). |
| Fechas | `date` para fechas efectivas/vencimiento (`YYYY-MM-DD`); `timestamptz` para registración/creación. |
| Naming | `snake_case`. El dominio usa `camelCase`; el mapeo lo harán los repos (E8c). |
| Auditoría | `created_at timestamptz`, `created_by uuid` en todas. |
| Idempotencia | `idempotency_key text` UNIQUE en tablas con efecto monetario. |
| Vigencia | `valid_from date`, `valid_to date NULL` en maestros. |

## 4. Mapeo dominio → columnas (deltas respecto de ER.md §3)

Donde el dominio ya fija la forma, la migración sigue al dominio (fuente de verdad de lo que escriben los servicios):

- `account_movements`: `amount numeric(18,2)` + `direction text CHECK IN ('IN','OUT')` (el dominio usa `amount` + `direction`, no `signed_amount`).
- `journal_lines`: `debit numeric(18,2)`, `credit numeric(18,2)`, `currency` (el dominio usa `debit: Money`, `credit: Money` por línea). Solo `ledger_account_id`; los FK opcionales `person_id`/`category_id`/`result_line_id`/`account_id` se omiten en v1 (el dominio no los escribe).
- `external_settlements`: `source_person_id`, `external_account_id NULL`, `result_line_id`, `concept`, `amount`, `currency`, `nature CHECK IN ('PRESTAMO','APORTE','CUENTA_CORRIENTE')`, `effective_date`, `status CHECK IN ('CONFIRMADO','REINTEGRADO')`, `note`, `idempotency_key`, `source`, `created_by`, `created_at` (sprint 10). Sin `target_ref_type/id` (se modeló egreso directo).
- `investments`: `concept`, `amount`, `currency`, `tentative_date`, `status CHECK IN ('BORRADOR','EVALUADA','APROBADA','POSTERGADA','RECHAZADA')`, `decision_note NULL`, `created_by`, `created_at` (sprint 12).
- `investment_evaluations`: `investment_id`, `scenario`, `min_projected_balance`, `capacity_amount`, `confidence`, `evaluated_at` (sprint 12). `earliest_date`/`assumptions` se omiten (diferidos).
- `income_forecasts`: `scenario`, `forecast_date`, `amount`, `currency`, `source`, `confidence`, `account_id NULL` (sprint 11).
- `attachments`: `entity_type`, `entity_id`, `storage_key`, `checksum`, `mime`, `size_bytes`, `is_private`, `uploaded_by`, `created_at` (sprint 10).
- `audit_events`: `entity_type`, `entity_id`, `action`, `actor_user_id`, `occurred_at`, `reason` (sprint 5). `before`/`after` jsonb se omiten (el dominio no los escribe).
- `settings_parameters`: `key`, `value`, `valid_from`, `valid_to`, `approved_by` (reserva/retention/etc. versionados).

El resto sigue `ER.md` §3 literalmente.

## 5. Constraints a aplicar ahora (baratas, sin triggers)

| # | Invariante | SQL |
|---|---|---|
| I-06 | Importes exactos | tipo `numeric(18,2)` |
| I-07 | Transferencia `from <> to` | `CHECK (from_account_id <> to_account_id)` |
| I-11 | Importe positivo | `CHECK (amount > 0)` en importes operativos |
| I-13/I-20 | Idempotencia | `UNIQUE (idempotency_key)` |
| I-04 | Un asiento canónico por documento | `UNIQUE (source_document_type, source_document_id)` |
| I-03 | Una reversión por original | `UNIQUE (reverses_entry_id)` |
| — | Cierres sin duplicar | `UNIQUE (account_id, closing_date)` en `daily_closings` |
| — | Aplicación única pago↔obligación | `UNIQUE (payment_id, obligation_id)` en `payment_applications` |

**Diferidos a un sprint de hardening (triggers):** I-01 (balance Σ debit = Σ credit), I-02 (inmutabilidad de `CONFIRMADO`), I-09/I-10 (límites de aplicación).

## 6. Puntos de integración (a confirmar)

1. **`users` vs Supabase Auth**: `users.id` referencia `auth.users(id)`. Existe ya `profiles` (del prode) que también mapea a `auth.users`. **Propuesta:** crear `users` como tabla de identidad de finanzas (`id uuid PRIMARY KEY REFERENCES auth.users(id)`), sin fusionar con `profiles` en este sprint; reconciliar después si conviene.
2. **Env**: el cliente ya existe (`src/prode/config/supabase.ts`, `PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_ANON_KEY`). No se agregan variables en este sprint (no hay repos todavía).
3. **Esquema**: `public` (mismo esquema que prode). Sin esquema dedicado por ahora.

## 7. Archivos

| Archivo | Cambio |
|---|---|
| `supabase/migrations/017_finanzas_schema.sql` | Crear (29 tablas + constraints + índices). |

## 8. Criterios de aceptación

- La migración crea exactamente las 29 tablas del subconjunto, con `snake_case`, `uuid`, `numeric(18,2)`, `timestamptz`.
- Los CHECK/UNIQUE de §5 están presentes.
- No incluye RLS, triggers, repos ni storage (sprints siguientes).
- No rompe las migraciones existentes 001–016.
- No toca `src/`, landing, `/prode` ni deploy.

## 9. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto | Tratamiento |
|---|---|---|
| Subconjunto vs ER completo | Si falta una tabla luego, migración aditiva. | Solo las usadas; el resto se agrega cuando exista su servicio. |
| `users` vs `profiles` | Posible duplicación de identidad. | Propuesta §6.1; reconciliar antes de RLS (E8b). |
| Invariantes por trigger | I-01/I-02 sin enforcement en DB todavía. | Diferidas; el dominio ya valida balance/inmutabilidad. |

## 10. Rollback

- `DROP` de las 29 tablas (orden inverso de FKs) o revert de la migración.
- No afecta migraciones 001–016 ni datos productivos.
