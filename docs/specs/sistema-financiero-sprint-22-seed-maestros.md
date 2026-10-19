# Spec — Sistema financiero sprint 22: seed de maestros y cuentas (desarrollo)

> Habilita la validación visual de E5 (tablero y agenda) con datos de ejemplo.
> No es dato productivo: saldos de apertura marcados `source='seed'`.
> Registra la decisión **P3 (parcial)**: Santander WASHINGTON = EXTERNA, BaPro MILTON = PROPIA.

## 1. Problema

El tablero (`GET /api/finanzas/dashboard`) y la agenda quedan vacíos porque no hay seed de `accounts` ni `account_movements`. Además, dos cuentas tenían titularidad PENDIENTE (P3), lo que impedía sembrarlas sin inventar `ownership`.

## 2. Objetivo

- Migration `020_finanzas_seed_maestros.sql` con: período contable abierto, cuentas financieras (P3 resuelta) y movimientos de apertura de ejemplo.
- Registrar P3 (parcial) en `docs/diseno-financiero/plan-cuentas.md` (D2).

## 3. Alcance incluido

| Ítem | Detalle |
|---|---|
| `accounting_periods` | 1 período `ABIERTO` (`2026-10`). |
| `accounts` | 7 cuentas: Efectivo, Santander DENNYS, MP Dennys, MP MAI (inactiva), MP MARI (externa), Santander WASHINGTON (externa), BaPro MILTON (propia). |
| `account_movements` | Apertura de ejemplo solo en cuentas PROPIA (`source_document_type='seed'`), idempotente por `idempotency_key`. |
| Idempotencia | `ON CONFLICT ... DO NOTHING` con UUIDs fijos, para re-ejecutar sin duplicar. |
| P3 | Actualizar D2 §4 y §8: WASHINGTON EXTERNA, MILTON PROPIA. |

## 4. Alcance excluido

- `ledger_accounts`, `persons`, `categories`, `result_lines`, `obligations`: se siembran cuando llegue E5-03 (alta de obligación) o con un script dev con usuario real (`obligations.created_by` exige `auth.users`).
- Datos productivos reales (eso es E9).

## 5. Decisiones registradas

| # | Decisión | Resolución |
|---|---|---|
| P3 (parcial) | Santander WASHINGTON | **EXTERNA** (como MARI): `is_available=false`, `is_reconcilable=false`. |
| P3 (parcial) | BaPro MILTON | **PROPIA**: `is_available=true`, `is_reconcilable=true`. |
| P3 (resto) | MARI, MP MAI, subcuentas finales | Sigue PENDIENTE en D2. |

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `supabase/migrations/020_finanzas_seed_maestros.sql` | Crear. |
| `docs/diseno-financiero/plan-cuentas.md` | Actualizar §4 (WASHINGTON/MILTON) y §8 (P3). |

## 7. Criterios de aceptación

- La migration es idempotente (`ON CONFLICT` sobre PK / `idempotency_key`).
- Solo cuentas `PROPIA` + `is_available` tienen saldo de apertura; las `EXTERNA` quedan sin movimientos (no computan disponibilidad).
- El tablero debe mostrar 4 cuentas propias con saldo y 2 externas sin computar.
- `git status` limpio salvo los archivos listados; no toca `src/`, landing, `/prode`, `/escuela`.

## 8. Riesgos

| Riesgo | Tratamiento |
|---|---|
| Saldos de ejemplo confundidos con reales | `source_document_type='seed'` explícito + comentario en la migration. |
| `ledger_account_id` de cuentas externas provisional (`6.3`) | Es texto sin FK; P7 definirá la contrapartida definitiva. |
| No se aplica sin `supabase db push` | La migration es estática; la corre el usuario con CLI o Dashboard. |
