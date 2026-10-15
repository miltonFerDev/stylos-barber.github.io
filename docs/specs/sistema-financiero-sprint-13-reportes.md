# Spec — Sistema financiero sprint 13: reportes operativos (disponibilidad, obligaciones, auditoría)

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-12-inversiones.md` y de `src/finanzas/` creado en los sprints 1–12.
> Épica del backlog: **E7 — Reportes y exportaciones** (E7-01, E7-02, E7-04).

## 1. Resumen

Este sprint construye la primera tanda de reportes de **solo lectura**, derivados de datos canónicos (sin totales manuales como fuente de verdad):

- `ReportsService.availabilityReport` — disponibilidad neta por cuenta (E7-01).
- `ReportsService.obligationsReport` — obligaciones por estado y vencimiento (E7-02).
- `ReportsService.auditHistory` — historial de auditoría por entidad (E7-04, solo roles autorizados).

## 2. Objetivo

- Derivar reportes de `account_movements`, `obligations` y `audit_events` (D1 §9: "los reportes se derivan de datos canónicos").
- Lógica de agrupación/vencimiento como helpers puros y testeables.
- Sin mutación: ningún reporte genera asiento, movimiento ni auditoría.

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/backlog-desarrollo.md` | E7-01, E7-02, E7-04. |
| `docs/diseno-financiero/ER.md` | §3.4 `account_movements`; §3.5 `obligations`; §4.1 `audit_events`. |
| `docs/diseno-financiero/seguridad.md` (D6) | `VIEW_BALANCES`, `VIEW_AUDIT`. |
| `docs/diseno-financiero/prototipos.md` (D5) | §3 tablero Dirección, §4 agenda Tesorería. |

## 4. Alcance incluido

- `availabilityReport`: saldo neto por cuenta (`movementNet`), con `totalAvailable` que **solo** suma cuentas `PROPIA` + `isAvailable` (excluye externas/restringidas, F-6).
- `obligationsReport`: lista de obligaciones con `status`, `dueDate`, importe (`finalAmount ?? estimatedAmount`) y flag `isOverdue`.
- `auditHistory`: eventos de auditoría para un `entityType`/`entityId`, ordenados por `occurredAt` descendente.

## 5. Alcance excluido

- **E7-03** estado de resultados interno (requiere agregación de asientos por línea de resultado) — sprint 14.
- **E7-05** exportación para contador — requiere P10.
- Alertas (§9 de D7), UI, Supabase, RLS, migraciones.
- Moneda múltiple: los totales se expresan en la moneda de referencia (shortcut; sin FX).

## 6. Cambios por archivo esperados

### Crear

| Archivo | Responsabilidad |
|---|---|
| `src/finanzas/domain/reports.ts` | Helpers puros: `isOverdue`, `obligationAmount`, `summarizeByStatus`, `overdueSummary`. |
| `src/finanzas/application/reports-service.ts` | `ReportsService` + repos (incluye `AuditQueryRepository`). |
| `src/finanzas/domain/__tests__/reports.test.ts` | Tests de helpers puros. |
| `src/finanzas/application/__tests__/reports-service.test.ts` | Tests del servicio con repos in-memory. |

### Editar

| Archivo | Cambio |
|---|---|
| `src/finanzas/index.ts` | Exportar `reports` (dominio) y `reports-service`. |

## 7. Contratos a implementar

### 7.1 Dominio (`reports.ts`)

```ts
export const REPORTABLE_OBLIGATION_STATUSES: readonly ObligationStatus[] = ['PENDIENTE', 'PROGRAMADA', 'PARCIAL', 'VENCIDA'];

export type ObligationBucket = { count: number; totalMinor: bigint };

export function obligationAmount(obligation: Obligation): Money;      // finalAmount ?? estimatedAmount
export function isOverdue(obligation: Obligation, at: string): boolean; // status activo y dueDate < at
export function summarizeByStatus(obligations: Obligation[]): Partial<Record<ObligationStatus, ObligationBucket>>;
export function overdueSummary(obligations: Obligation[], at: string): ObligationBucket;
```

- `isOverdue`: `REPORTABLE_OBLIGATION_STATUSES.includes(status) && dueDate < at` (comparación ISO `YYYY-MM-DD`).
- Los buckets suman `toMinor(obligationAmount(...))` (moneda-agnóstico).

### 7.2 Servicio (`reports-service.ts`)

```ts
export type AuditQueryRepository = {
  findByEntity(entityType: string, entityId: string): Promise<AuditEvent[]>;
};

export type AvailabilityLine = {
  accountId: string;
  name: string;
  kind: AccountKind;
  ownership: AccountOwnership;
  currency: Currency;
  balance: Money;
  isAvailable: boolean;
};
export type AvailabilityReport = { lines: AvailabilityLine[]; totalAvailable: Money; currency: Currency };

export type ObligationLine = {
  id: string; concept: string; status: ObligationStatus; dueDate: string; amount: Money; isOverdue: boolean;
};
export type ObligationsReport = {
  lines: ObligationLine[];
  byStatus: Partial<Record<ObligationStatus, ObligationBucket>>;
  overdue: ObligationBucket;
  currency: Currency;
};

export type AuditHistoryReport = { entityType: string; entityId: string; events: AuditEvent[] };
```

Dependencias: `{ masters: MasterRepository, movements: AccountMovementRepository, obligations: ObligationRepository, auditHistory: AuditQueryRepository, authorize: Authorizer }`.

**`availabilityReport(ctx)`:**
1. `authorize(ctx, 'VIEW_BALANCES')`.
2. `masters.findAll('ACCOUNT')` → por cada cuenta, `movements.findByAccount(id)` → `movementNet` → saldo.
3. `totalAvailable` suma solo `ownership === 'PROPIA' && isAvailable` (F-6).
4. Devuelve el reporte (sin mutar).

**`obligationsReport(ctx)`:**
1. `authorize(ctx, 'VIEW_BALANCES')`.
2. `obligations.findAll()` → líneas con `isOverdue` (`ctx.now`) + `byStatus` + `overdue`.

**`auditHistory(ctx, { entityType, entityId })`:**
1. `authorize(ctx, 'VIEW_AUDIT')`.
2. `entityType`/`entityId` no vacíos → `MISSING_REQUIRED_FIELD`.
3. `auditHistory.findByEntity(...)` → eventos.

### 7.3 Errores

Sin códigos nuevos: reusa `PERMISSION_DENIED` y `MISSING_REQUIRED_FIELD`.

## 8. Tests requeridos

### `reports.test.ts`

- `isOverdue` verdadero solo para status activos con `dueDate < at`.
- `obligationAmount` usa `finalAmount` si existe, si no `estimatedAmount`.
- `summarizeByStatus` agrupa por estado con count y total.
- `overdueSummary` cuenta solo las vencidas.

### `reports-service.test.ts`

- `availabilityReport`: cuenta `PROPIA`+`isAvailable` suma al total; externa/restringida se lista pero no suma al total.
- `obligationsReport`: marca `isOverdue`, agrupa por estado.
- `auditHistory`: devuelve eventos de la entidad; sin permiso → `PERMISSION_DENIED`.
- Ningún reporte genera asiento/movimiento/auditoría.

## 9. Criterios de aceptación

- `npm run test` pasa; `npm run typecheck` pasa.
- `totalAvailable` excluye cuentas externas/restringidas (F-6).
- Reportes derivados de datos canónicos, sin totales editables (D1 §9).
- No se toca UI, rutas públicas, `/prode`, Supabase ni deploy.

## 10. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto | Tratamiento |
|---|---|---|
| Moneda múltiple | Totales en una sola moneda de referencia. | `shortcut:` sin FX; totales en ARS por defecto. |
| Vigencia de cuentas | Se listan todas las cuentas devueltas por `findAll('ACCOUNT')`. | `shortcut:` sin filtro `validTo`; se agrega al filtrar por vigencia en reportes. |
| E7-03 / E7-05 | Resultado interno y export no incluidos. | Sprints siguientes. |

## 11. Rollback

- Eliminar `reports.ts`, `reports-service.ts` y sus tests; revertir `index.ts`.
- No requiere cambios en Supabase, variables de entorno ni datos.
