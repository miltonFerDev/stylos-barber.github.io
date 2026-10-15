# Spec — Sistema financiero sprint 8: transferencias e ingresos

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-7-pagos.md` y de `src/finanzas/` creado en los sprints 1–7.
> Épica del backlog: **E4 — Tesorería operativa** (E4-05 y E4-06).

## 1. Resumen

Este sprint agrega dos flujos de tesorería que generan movimientos y asientos pero **no tocan obligaciones**: las transferencias entre cuentas propias (E4-05) y el ingreso/cobranza diaria (E4-06). Con esto queda completo el núcleo de tesorería diaria (pagos, transferencias, ingresos) que alimenta el saldo teórico para los cierres (E4-07, siguiente).

## 2. Objetivo

- Modelar `transfers` (D1 §3.5) y `income_records`/`income_distributions` (D1 §3.5).
- Implementar `TransfersService.registerTransfer` (EV-06): asiento `Db 1.1.y / Hr 1.1.x`, sin resultado (I-08).
- Implementar `IncomesService.registerDailyIncome` (EV-02): asiento `Db 1.1.x / Hr 4.1+4.2`.
- Generar movimientos de entrada/salida y auditoría.
- Idempotencia en ambas operaciones.

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/ER.md` | §3.4 `account_movements`; §3.5 `transfers`, `income_records`, `income_distributions`; invariantes I-07, I-08. |
| `docs/diseno-financiero/matriz-contabilizacion.md` | §4.2 EV-02; §4.3 EV-06; invariantes M-05, M-06. |
| `docs/diseno-financiero/contratos-dominio.md` | §4.3 `TransfersService`; §4.5 `DailyIncomeService`; §5 catálogo de errores. |
| `docs/diseno-financiero/backlog-desarrollo.md` | E4-05 y E4-06. |

## 4. Alcance incluido

- `Transfer` + `TransferStatus`.
- `IncomeRecord`, `IncomeDistribution`, `IncomeStatus`.
- `TransfersService.registerTransfer`.
- `IncomesService.registerDailyIncome`.
- Helpers puros de ingreso (`distributionsMatchIncome`, `totalIncomeMinor`).
- Permiso `REGISTER_TRANSFER` (nuevo en RBAC) y `REGISTER_DAILY_INCOME` (existente).
- Movimientos (`AccountMovementRepository`, extraído a dominio para reuso).
- Auditoría (`TRANSFER_CREATED`, `INCOME_CREATED`).

## 5. Alcance excluido

- Puente `6.1` de transferencias (desfase temporal): `useBridge` queda fuera.
- `adjustIncome` (devolución/ajuste): sprint futuro.
- Cierres y conciliaciones (E4-07/E4-08).
- Fondos externos MARI (E4-09, P7).
- UI, Supabase, RLS, migraciones.

## 6. Cambios por archivo esperados

### Crear

| Archivo | Responsabilidad |
|---|---|
| `src/finanzas/domain/transfers.ts` | `Transfer`, `TransferStatus`. |
| `src/finanzas/domain/incomes.ts` | `IncomeRecord`, `IncomeDistribution`, `IncomeStatus`, helpers puros. |
| `src/finanzas/application/transfers-service.ts` | `TransfersService` + repos. |
| `src/finanzas/application/incomes-service.ts` | `IncomesService` + repos. |
| `src/finanzas/domain/__tests__/incomes.test.ts` | Tests de helpers de ingreso. |
| `src/finanzas/application/__tests__/transfers-service.test.ts` | Tests de transferencia. |
| `src/finanzas/application/__tests__/incomes-service.test.ts` | Tests de ingreso. |

### Editar

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/account-movements.ts` | Agregar `AccountMovementRepository` (port compartido). |
| `src/finanzas/application/payments-service.ts` | Importar/re-exportar `AccountMovementRepository` desde dominio. |
| `src/finanzas/domain/permissions.ts` | Agregar `REGISTER_TRANSFER` a `PermissionAction` y `RBAC_MATRIX`. |
| `src/finanzas/domain/types.ts` | `TRANSFER_SAME_ACCOUNT`, `INCOME_DISTRIBUTION_MISMATCH`. |
| `src/finanzas/domain/errors.ts` | Agregar a `DOMAIN_ERROR_CODES`. |
| `src/finanzas/domain/audit.ts` | `TRANSFER_CREATED`, `INCOME_CREATED`. |
| `src/finanzas/index.ts` | Exportar nuevos módulos. |

## 7. Contratos a implementar

### 7.1 Transferencias (`transfers.ts` + `transfers-service.ts`)

```ts
export type TransferStatus = 'BORRADOR' | 'CONFIRMADO' | 'ANULADO' | 'REVERTIDO';

export type Transfer = {
  id: string;
  effectiveDate: string;
  fromAccountId: string;
  toAccountId: string;
  amount: Money;
  status: TransferStatus;
  idempotencyKey: string;
  source: 'REAL';
  createdBy: UserId;
  createdAt: string;
};

export type RegisterTransferCommand = {
  fromAccountId: string;
  toAccountId: string;
  amount: Money;
  effectiveDate: string;
  periodId: string;
};

export class TransfersService {
  registerTransfer(ctx: CommandContext, command: RegisterTransferCommand): Promise<Result<Transfer>>;
}
```

Reglas:

- `authorize(ctx, 'REGISTER_TRANSFER')`.
- Idempotencia → `DUPLICATE_IDEMPOTENCY`.
- `fromAccountId ≠ toAccountId` → si no, `TRANSFER_SAME_ACCOUNT`.
- Ambas cuentas `ownership='PROPIA'`, `isAvailable=true`, vigentes → si no, `ACCOUNT_NOT_AVAILABLE`.
- Período abierto → si no, `PERIOD_CLOSED`.
- Asiento EV-06: `Db to.ledgerAccountId / Hr from.ledgerAccountId` (mismo importe). **No toca cuentas de resultado** (I-08).
- Dos movimientos: `OUT` de origen e `IN` a destino.
- Auditoría `TRANSFER_CREATED`.

### 7.2 Ingresos (`incomes.ts` + `incomes-service.ts`)

```ts
export type IncomeStatus = 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';

export type IncomeRecord = {
  id: string;
  effectiveDate: string;
  serviceAmount: Money;
  productAmount: Money;
  status: IncomeStatus;
  periodId: string;
  adjustmentNote: string | null;
  idempotencyKey: string;
  source: 'REAL';
  createdBy: UserId;
  createdAt: string;
};

export type IncomeDistribution = {
  id: string;
  incomeRecordId: string;
  accountId: string;
  amount: Money;
};

export type RegisterDailyIncomeCommand = {
  effectiveDate: string;
  periodId: string;
  serviceAmount: Money;
  productAmount: Money;
  distributions: Array<{ accountId: string; amount: Money }>;
  adjustmentNote?: string;
};

export class IncomesService {
  registerDailyIncome(ctx: CommandContext, command: RegisterDailyIncomeCommand): Promise<Result<IncomeRecord>>;
}
```

Helpers puros:

```ts
export function totalIncomeMinor(serviceAmount: Money, productAmount: Money): bigint;
export function distributionsMatchIncome(distributions: Money[], serviceAmount: Money, productAmount: Money): boolean;
```

Reglas:

- `authorize(ctx, 'REGISTER_DAILY_INCOME')`.
- Idempotencia → `DUPLICATE_IDEMPOTENCY`.
- `totalIncomeMinor > 0` (al menos uno de servicios/productos positivo).
- `Σ distributions == serviceAmount + productAmount` → si no, `INCOME_DISTRIBUTION_MISMATCH`.
- Cada cuenta receptora `ownership='PROPIA'`, `isAvailable=true`, vigente → si no, `ACCOUNT_NOT_AVAILABLE`.
- Período abierto → si no, `PERIOD_CLOSED`.
- Asiento EV-02:
  - Débitos: `Db account.ledgerAccountId` por cada distribución (importe distribuido).
  - Créditos: `Hr serviciosLedgerAccountId` por `serviceAmount` (si > 0) y `Hr productosLedgerAccountId` por `productAmount` (si > 0). Los ledger de servicios/productos se inyectan como configuración (D2 §3: `4.1` servicios, `4.2` productos).
- Movimientos `IN` por cada distribución.
- Guardar `income_record` + `income_distributions`.
- Auditoría `INCOME_CREATED`.

### 7.3 Errores nuevos

| Código | Origen | Recuperable |
|---|---|---|
| `TRANSFER_SAME_ACCOUNT` | D4 §5 / I-07 | sí |
| `INCOME_DISTRIBUTION_MISMATCH` | D4 §5 / CU-012 | sí |

### 7.4 Movimiento de port

`AccountMovementRepository` se mueve de `payments-service.ts` a `domain/account-movements.ts` (port compartido por pagos, transferencias e ingresos). `payments-service.ts` lo re-exporta para no romper el barrel/tests existentes.

## 8. Tests requeridos

### `incomes.test.ts`

- `totalIncomeMinor` suma servicios + productos.
- `distributionsMatchIncome`: `true` si la suma de distribuciones iguala el ingreso; `false` si no.

### `transfers-service.test.ts`

- Transferencia válida → `CONFIRMADO`, dos movimientos (`OUT`/`IN`), asiento `Db destino / Hr origen`, auditoría `TRANSFER_CREATED`.
- `from == to` → `TRANSFER_SAME_ACCOUNT`.
- Cuenta no disponible → `ACCOUNT_NOT_AVAILABLE`.
- Reintento con misma clave → `DUPLICATE_IDEMPOTENCY`.
- Sin permiso → `PERMISSION_DENIED`.

### `incomes-service.test.ts`

- Ingreso válido → `CONFIRMADO`, movimientos `IN`, asiento balanceado, auditoría `INCOME_CREATED`.
- Distribuciones que no suman el ingreso → `INCOME_DISTRIBUTION_MISMATCH`.
- Cuenta receptora no disponible → `ACCOUNT_NOT_AVAILABLE`.
- Reintento con misma clave → `DUPLICATE_IDEMPOTENCY`.
- Sin permiso → `PERMISSION_DENIED`.

## 9. Criterios de aceptación

- `npm run test` pasa.
- `npm run typecheck` pasa.
- `npm run lint` pasa.
- Transferencia no afecta resultado (asiento solo toca cuentas `1.1.x`).
- Ingreso genera débitos por cuenta y créditos por servicios/productos.
- `Σ distribuciones == ingreso` (CU-012).
- Idempotencia y auditoría integradas.
- No se toca UI, rutas públicas, `/prode`, Supabase ni deploy.

## 10. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto en este sprint | Tratamiento |
|---|---|---|
| Puente `6.1` (transferencia en tránsito) | `useBridge` fuera de alcance. | Se modela transferencia directa; puente futuro. |
| Cuentas de ingresos `4.1`/`4.2` | Se inyectan como config. | Estables según D2 §3; P-CUENTAS no las cambia. |
| `UNIQUE(effective_date)` de ingreso diario | Control de duplicado de día. | Se difiere; solo idempotencia por clave. |
| Concurrencia real | Transacción en DB futura. | Servicio secuencial; documentado. |

## 11. Rollback

- Eliminar archivos nuevos (`transfers.ts`, `incomes.ts`, servicios y tests).
- Revertir `AccountMovementRepository` (mover de vuelta a payments-service si fuera necesario), permisos, códigos de error, auditoría y exportaciones.
- No requiere cambios en Supabase, variables de entorno ni datos.
