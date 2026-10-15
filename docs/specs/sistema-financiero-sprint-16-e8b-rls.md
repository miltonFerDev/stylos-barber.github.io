# Spec — Sistema financiero sprint 16 (E8b): RLS, roles e inmutabilidad

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-15-e8a-schema.md` (migración 017 aplicada) y de `docs/specs/sistema-financiero-e8-cierre-decisiones.md` (P9/P10/P12 cerradas).
> Épica del backlog: **E8 — Seguridad, RLS, storage y backup**. Este sprint: funciones de rol + políticas RLS de lectura + triggers de inmutabilidad.

## 1. Resumen

Migración `018_finanzas_rls.sql` que agrega la capa de seguridad sobre las 29 tablas de 017:

- Función `has_role(role_code)` (SECURITY DEFINER) con soporte de delegación activa.
- Políticas RLS de **solo lectura** para `authenticated` (el cliente nunca escribe: las mutaciones van por `service_role`).
- Triggers de inmutabilidad: `audit_events` append-only y `journal_entries`/`journal_lines` inmutables.
- Fix: columna `journal_entries.reversed_at` (faltante en 017, la usa `markReversed`).

## 2. Modelo de acceso

- `anon`: sin acceso (RLS + sin policies).
- `authenticated`: **solo lectura** según rol (matriz D6 §2.1). **Sin políticas de escritura** → el cliente no escribe (S-1/S-2, D4 §2).
- `service_role`: bypasea RLS (usado por los repos en E8c).
- `CONTADOR`: sin policies (P10 cerrado: no en MVP).

## 3. Niveles de lectura (D6 §3)

| Nivel | Roles | Tablas |
|---|---|---|
| Operativo | DIRECCION + TESORERIA | persons, categories, subcategories, result_lines, ledger_accounts, accounts, accounting_periods, journal_entries, journal_lines, account_movements, obligations, payments, payment_applications, transfers, income_records, income_distributions, external_settlements, daily_closings, reconciliations, income_forecasts, investments, investment_evaluations, attachments |
| Sensible | DIRECCION | settings_parameters, roles, user_roles, role_delegations |
| Identidad | propio + DIRECCION | users |
| Auditoría | DIRECCION + TESORERIA | audit_events |

## 4. Contratos a implementar

### 4.1 Función `has_role(role_code text)`

```sql
CREATE OR REPLACE FUNCTION public.has_role(role_code text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (rol directo) OR EXISTS (delegación activa) $$;
```

- Rol directo: `user_roles` JOIN `roles` con `user_id = auth.uid()` y `code = role_code`.
- Delegación: `role_delegations` con `delegate_user_id = auth.uid()`, `role_code`, y `starts_at <= now() <= ends_at` (T-12: delegación vencida no opera).
- `REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated;`

### 4.2 Políticas RLS (solo SELECT, TO authenticated)

- Una policy por tabla según el nivel de §3: `USING (public.has_role('DIRECCION') OR public.has_role('TESORERIA'))`.
- Sensible: `USING (public.has_role('DIRECCION'))`.
- `users`: `USING (id = auth.uid() OR public.has_role('DIRECCION'))`.
- **Sin** policies `TO anon` ni `TO public` (no `USING (true)`).

### 4.3 Triggers de inmutabilidad

- `audit_events`: `BEFORE UPDATE OR DELETE` → `RAISE EXCEPTION` (S-7/T-09 append-only).
- `journal_lines`: `BEFORE UPDATE OR DELETE` → `RAISE EXCEPTION` (I-02).
- `journal_entries`: `BEFORE DELETE` → excepción; `BEFORE UPDATE` → excepción salvo que solo cambie `reversed_at` (el flujo de reversión setea `reversed_at`, no edita contenido).

### 4.4 Fix columna

- `ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS reversed_at timestamptz;`

## 5. Alcance excluido

- Storage privado (bucket) — E8c.
- Backup/restore — E8c/E8d.
- Triggers de balance (I-01) y límites de aplicación (I-09/I-10) — hardening (correctness, no seguridad).
- Matiz "Tesorería ve auditoría propia/operativa" (v1: Tesorería lee toda `audit_events`).
- Repos Supabase (E8c).

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `supabase/migrations/018_finanzas_rls.sql` | Crear (fix columna + función + triggers + policies). |

## 7. Criterios de aceptación

- `has_role` resuelve rol directo y delegación activa; delegación vencida no opera.
- `anon` sin acceso; `authenticated` solo lectura según rol; sin policies `USING (true)`.
- `audit_events` y `journal_lines` inmutables; `journal_entries` inmutable salvo `reversed_at`.
- No toca 001–017, ni `src/`, ni landing/`/prode`/deploy.

## 8. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto | Tratamiento |
|---|---|---|
| `has_role` ejecutable por cualquier `authenticated` | Info de rol propia | Aceptado: solo revela el rol de quien llama. |
| Inmutabilidad por trigger vs `service_role` | service_role bypasea RLS pero **no** triggers | Los triggers aplican también al service_role (correcto). |
| Lectura de `audit_events` por Tesorería | Ve auditoría de otros | Matiz "propia/operativa" diferido. |

## 9. Rollback

- `DROP FUNCTION has_role`, `DROP TRIGGER`/`DROP FUNCTION` de los 3 triggers, `DROP POLICY` de cada tabla, `ALTER TABLE ... DROP COLUMN reversed_at`.
- No afecta migraciones 001–017.
