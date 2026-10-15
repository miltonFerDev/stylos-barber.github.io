# Spec — Sistema financiero sprint 18: períodos contables (PeriodsService)

> Fase: desarrollo incremental. Cierra el bloqueo del audit: sin períodos abiertos no se puede registrar nada.
> Épica del backlog: **E3 — Libro, períodos, asientos y auditoría** (E3-01).

## 1. Resumen

`PeriodsService` con el ciclo de vida del período (D4 §4.8, CU-020):

- `openPeriod(code, startsOn, endsOn)` → `ABIERTO`.
- `submitForReview(periodId)` → `EN_REVISION`.
- `closePeriod(periodId)` → `CERRADO`.
- `reopenPeriod(periodId, reason)` → `ABIERTO` (motivo + Dirección).

## 2. Objetivo

- Permitir abrir/cerrar/reabrir períodos, desbloqueando las mutaciones que exigen `ABIERTO`.
- Transiciones de estado puras y testeables.

## 3. Alcance incluido

- `PeriodsService` + `PeriodRepository` (`findByCode`, `findById`, `save`, `update`).
- `SupabasePeriodRepository` (capa de repos E8c).
- Errores nuevos: `PERIOD_ALREADY_EXISTS`, `INVALID_STATE`.

## 4. Alcance excluido

- Verificación de **reconciliaciones pendientes** al cerrar (`PENDING_RECONCILIATIONS`) — `shortcut:` diferido; se agrega al consultar reconciliaciones por período.
- Auditoría de cierre/reapertura — se agrega cuando haya `PeriodsService` consumidor (E5).
- Matiz "Tesorería prepara / Dirección aprueba" (D6 §2.1) — v1: Dirección gestiona el ciclo completo.

## 5. Contratos

```ts
export type PeriodRepository = {
  findByCode(code: string): Promise<AccountingPeriod | null>;
  findById(id: string): Promise<AccountingPeriod | null>;
  save(period: AccountingPeriod): Promise<AccountingPeriod>;
  update(period: AccountingPeriod): Promise<AccountingPeriod>;
};
```

| Comando | Permiso | Transición | Errores |
|---|---|---|---|
| `openPeriod` | `CLOSE_PERIOD` (Dirección) | → `ABIERTO` | `PERIOD_ALREADY_EXISTS` (code duplicado), `MISSING_REQUIRED_FIELD` |
| `submitForReview` | `CLOSE_PERIOD` | `ABIERTO → EN_REVISION` | `PERIOD_NOT_FOUND`, `INVALID_STATE` |
| `closePeriod` | `CLOSE_PERIOD` | `EN_REVISION → CERRADO` | `PERIOD_NOT_FOUND`, `INVALID_STATE` |
| `reopenPeriod` | `REOPEN_PERIOD` (Dirección) | `CERRADO → ABIERTO` | `PERIOD_NOT_FOUND`, `INVALID_STATE`, `MISSING_REASON` |

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/application/periods-service.ts` | Crear. |
| `src/finanzas/domain/types.ts` + `errors.ts` | `PERIOD_ALREADY_EXISTS`, `INVALID_STATE`. |
| `src/finanzas/index.ts` | Exportar `periods-service`. |
| `src/finanzas/repositories/supabase-repositories.ts` | `SupabasePeriodRepository`. |
| `src/finanzas/application/__tests__/periods-service.test.ts` | Crear. |

## 7. Criterios de aceptación

- `npm run test` pasa; `npm run typecheck` pasa.
- Ciclo completo: abrir → revisar → cerrar → reabrir.
- No se postea en período `CERRADO` (ya cubierto por los servicios existentes con `isPeriodOpen`).

## 8. Riesgos

| Riesgo | Tratamiento |
|---|---|
| Cierre sin verificar reconciliaciones | `shortcut:` diferido; el dominio no expone reconciliaciones por período todavía. |
| Sin auditoría de cierre/reapertura | Diferido a E5 (hoy no hay consumidor). |
