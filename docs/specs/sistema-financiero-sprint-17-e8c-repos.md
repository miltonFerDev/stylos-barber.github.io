# Spec — Sistema financiero sprint 17 (E8c): repositorios Supabase

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-16-e8b-rls.md` (018 aplicada).
> Épica del backlog: **E8 — Seguridad, RLS, storage y backup**. Este sprint: capa de persistencia (repos) detrás de las interfaces ya definidas.

## 1. Resumen

Implementar los repositorios Supabase que materializan las interfaces `*Repository`/`AuditRecorder` usadas por los servicios de los sprints 1–14. Los repos usan un cliente **server-only con `service_role`** (bypasea RLS; las mutaciones no van por el cliente — D6 §3, §5).

## 2. Arquitectura

- **Cliente**: `src/finanzas/repositories/supabase-server.ts` — fábrica de cliente `service_role` con `SUPABASE_SERVICE_ROLE_KEY` (server-only; nunca en el bundle cliente).
- **Mapeo**: `src/finanzas/repositories/mapping.ts` — helpers puros y testeables:
  - `moneyToDb` / `dbToMoney` (`numeric(18,2) ↔ Money`).
  - Mappers de fila → tipo de dominio (Maestros + documentos + asientos).
- **Repos**: `src/finanzas/repositories/supabase-repositories.ts` — implementaciones finas de cada interfaz.

## 3. Mapeo (fuente de verdad del contrato)

| Dominio | DB | Nota |
|---|---|---|
| `Money` | `numeric(18,2)` + `currency text` | `dbToMoney(v, currency)` normaliza a 2 decimales; PostgREST devuelve `numeric` como string. |
| `camelCase` | `snake_case` | Mappers explícitos por entidad (no genéricos). |
| `ledgerAccountId` (string) | `ledger_account_id text` (código) | Sin conversión. |
| `id` (uuid string) | `uuid` | Sin conversión (string). |

## 4. Repos a implementar (interfaz → tabla)

| Interfaz | Métodos | Tabla(s) |
|---|---|---|
| `MasterRepository` | findById, findByCode, findAll, save | persons, categories, subcategories, result_lines, ledger_accounts, accounts |
| `AccountingPeriodRepository` | findById | accounting_periods |
| `JournalEntryRepository` | findByIdempotencyKey, findById, findReversalForEntry, save, markReversed | journal_entries, journal_lines |
| `AccountMovementRepository` | findByAccount, save | account_movements |
| `ObligationRepository` | findById, findAll, save, update | obligations |
| `DailyClosingRepository` | findByAccountAndDate, save | daily_closings |
| `ReconciliationRepository` | findById, save, update | reconciliations |
| `IncomeRecordRepository` | findByIdempotencyKey, save | income_records |
| `IncomeDistributionRepository` | save | income_distributions |
| `PaymentRepository` | findByIdempotencyKey, save | payments |
| `PaymentApplicationRepository` | findByObligation, save | payment_applications |
| `TransferRepository` | findByIdempotencyKey, save | transfers |
| `ExternalSettlementRepository` | findByIdempotencyKey, findById, save, update | external_settlements |
| `InvestmentRepository` | findById, save, update | investments |
| `InvestmentEvaluationRepository` | save | investment_evaluations |
| `RoleRepository` | findUserRoles, findActiveDelegations | user_roles+roles, role_delegations |
| `AuditRecorder` | record | audit_events |
| `Forecast*Repository` (5) | listAccounts, findLatestByAccount, listForScenario, listActive, getReserve | accounts, reconciliations, income_forecasts, obligations, settings_parameters |
| `AuditQueryRepository` | findByEntity | audit_events |
| `JournalEntryQueryRepository` | findByPeriod | journal_entries+lines |

## 5. Alcance excluido

- Wiring de servicios a endpoints/acciones (E5 — presentación).
- Storage de comprobantes (bucket) — E8d.
- Transacciones multi-tabla (BEGIN/COMMIT) — los servicios asumen repos atómicos por llamada; el patrón transaccional se cierra en E5/E10.
- UI, rutas públicas, `/prode`, deploy.

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/repositories/mapping.ts` | Crear (helpers puros). |
| `src/finanzas/repositories/supabase-server.ts` | Crear (cliente service_role). |
| `src/finanzas/repositories/supabase-repositories.ts` | Crear (repos). |
| `src/finanzas/repositories/__tests__/mapping.test.ts` | Crear (tests de mapeo). |

## 7. Criterios de aceptación

- `npm run test` pasa; `npm run typecheck` pasa.
- Los mappers redondean a 2 decimales y mapean `snake_case ↔ camelCase` correctamente.
- El cliente service_role no se importa desde código cliente (server-only).
- No rompe los servicios ni sus tests (las interfaces ya existen).

## 8. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto | Tratamiento |
|---|---|---|
| PostgREST devuelve `numeric` como string | Mapeo `Number(v).toFixed(2)` | Cubierto en `dbToMoney`. |
| Sin `Database` type generado | `SupabaseClient` sin genérico | Aceptado; cast de filas con `any` controlado. |
| Transacciones multi-tabla | Servicios asumen atomicidad | Diferido a E5/E10 (hoy sin UI no se ejercita). |

## 9. Rollback

- Eliminar `src/finanzas/repositories/` y sus tests.
- No afecta migraciones ni servicios (solo agrega persistencia).
