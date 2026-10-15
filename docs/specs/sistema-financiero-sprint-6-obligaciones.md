# Spec — Sistema financiero sprint 6: obligaciones

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-5-identidad-permisos-auditoria.md` y de `src/finanzas/` creado en los sprints 1–5.
> Épica del backlog: **E4 — Tesorería operativa** (primer incremento: E4-01 y E4-02).

## 1. Resumen

Este sprint agrega el documento central de tesorería: la **obligación** (compromiso futuro y saldo pendiente). Incluye el alta de obligación, la confirmación de importe definitivo (preservando el estimado original) y la anulación. Sigue siendo dominio/aplicación pura, sin UI, sin Supabase y sin migraciones SQL.

**Punto clave:** la obligación **no genera asiento** en este sprint. La política de reconocimiento (**P-REC**) sigue pendiente y el modelo por defecto es "reconocimiento al pago" (D3 EV-04 modelo A): crear/confirmar una obligación solo crea el documento; el gasto se reconoce recién en el pago (E4-03, sprint siguiente).

## 2. Objetivo

- Modelar `obligations` con sus campos y estados (D1 §3.5, §5.1).
- Implementar `ObligationsService.createObligation` (E4-01).
- Implementar `confirmDefinitiveAmount` (E4-02) preservando el estimado original vía `estimated_amount_version`.
- Implementar `annulObligation` con motivo y restricciones de estado.
- Validar maestros vigentes y período no cerrado.
- Detectar duplicados posibles (RF-033 aplicado a obligaciones).
- Integrar permisos y auditoría.
- Probar el ciclo de vida de la obligación sin base de datos.

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/ER.md` | §3.5 entidad `obligations`; §5.1 estados; invariantes I-11, I-16. |
| `docs/diseno-financiero/matriz-contabilizacion.md` | §4.3 EV-04 (obligación sin pago = sin asiento bajo modelo caja); §9 P-REC. |
| `docs/diseno-financiero/contratos-dominio.md` | §4.1 `ObligationsService`; §5 catálogo de errores. |
| `docs/diseno-financiero/backlog-desarrollo.md` | E4-01 y E4-02. |

## 4. Alcance incluido

- `Obligation`, `ObligationStatus`, `ObligationPriority` y validadores puros.
- `ObligationsService.createObligation`, `confirmDefinitiveAmount`, `annulObligation`.
- Repositorio port `ObligationRepository` + implementación in-memory en tests.
- Reuso de `MasterRepository` (validar vigencia) y `AccountingPeriodRepository` (validar período).
- Permiso `CREATE_OBLIGATION` y auditoría (`OBLIGATION_CREATED`, `OBLIGATION_CONFIRMED`, `OBLIGATION_ANNULLED`).
- Tests del ciclo de vida y de accesos/estados inválidos.

## 5. Alcance excluido

- Pagos y aplicación de pagos (E4-03/E4-04, próximo sprint).
- Generación de asientos por devengamiento (`RECOGNITION_POLICY_UNDEFINED`): no aplica porque no se postea hasta cerrar P-REC.
- Recurrencias (`recurrence_rules`, `scheduleRecurrence`): `recurrenceRuleId` queda `null`.
- Transferencias, ingresos, cierres, conciliaciones, fondos externos (resto de E4).
- UI, Supabase, RLS, migraciones.
- Cierre de P-REC, P11, P12, P13.

## 6. Cambios por archivo esperados

### Crear

| Archivo | Responsabilidad |
|---|---|
| `src/finanzas/domain/obligations.ts` | `Obligation`, `ObligationStatus`, `ObligationPriority`, helpers de estado y validadores. |
| `src/finanzas/application/obligations-service.ts` | `ObligationsService` + `ObligationRepository`. |
| `src/finanzas/domain/__tests__/obligations.test.ts` | Tests de estado y validadores. |
| `src/finanzas/application/__tests__/obligations-service.test.ts` | Tests del servicio con repos in-memory. |

### Editar

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/types.ts` | Agregar códigos de error de obligaciones. |
| `src/finanzas/domain/errors.ts` | Agregar los códigos a `DOMAIN_ERROR_CODES`. |
| `src/finanzas/domain/audit.ts` | Agregar acciones `OBLIGATION_CREATED`, `OBLIGATION_CONFIRMED`, `OBLIGATION_ANNULLED`. |
| `src/finanzas/domain/periods.ts` | Agregar `isPeriodClosed`. |
| `src/finanzas/index.ts` | Exportar nuevos módulos. |

## 7. Contratos a implementar

### 7.1 Tipos de dominio (`obligations.ts`)

```ts
export type ObligationStatus =
  | 'BORRADOR'
  | 'PENDIENTE'
  | 'PROGRAMADA'
  | 'PARCIAL'
  | 'PAGADA'
  | 'VENCIDA'
  | 'ANULADA';

export type ObligationPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type Obligation = {
  id: string;
  concept: string;
  personId: string;
  categoryId: string;
  resultLineId: string;
  plannedAccountId: string;
  estimatedAmount: Money;
  estimatedAmountVersion: number;
  finalAmount: Money | null;
  isEstimated: boolean;
  dueDate: string;
  expectedPaymentDate: string | null;
  priority: ObligationPriority;
  status: ObligationStatus;
  periodId: string;
  recurrenceRuleId: string | null;
  source: 'REAL';
  createdBy: UserId;
  createdAt: string;
  idempotencyKey: string;
};
```

Estados anulables / confirmables (D1 §5.1):

```ts
export const ANNULLABLE_STATUSES: readonly ObligationStatus[] = ['BORRADOR', 'PENDIENTE', 'PROGRAMADA'];
export const CONFIRMABLE_STATUSES: readonly ObligationStatus[] = ['BORRADOR', 'PENDIENTE', 'PROGRAMADA'];
```

Reglas:

- `BORRADOR / PENDIENTE / PROGRAMADA` pueden anularse (con motivo) y confirmarse.
- `PARCIAL / PAGADA` no se anulan ni se re-confirman (requieren reversión de pago primero).
- `VENCIDA` es un estado derivado (por `dueDate`); no se transiciona explícitamente en este sprint.

### 7.2 Servicio (`obligations-service.ts`)

```ts
export type CreateObligationCommand = {
  concept: string;
  personId: string;
  categoryId: string;
  resultLineId: string;
  plannedAccountId: string;
  amount: Money;
  isEstimated: boolean;
  dueDate: string;
  expectedPaymentDate?: string;
  priority?: ObligationPriority;
  periodId: string;
  confirmPossibleDuplicate?: boolean;
};

export type ConfirmDefinitiveAmountCommand = {
  obligationId: string;
  finalAmount: Money;
};

export type AnnulObligationCommand = {
  obligationId: string;
  reason: string;
};

export type ObligationRepository = {
  findById(id: string): Promise<Obligation | null>;
  findAll(): Promise<Obligation[]>;
  save(obligation: Obligation): Promise<Obligation>;
  update(obligation: Obligation): Promise<Obligation>;
};

export class ObligationsService {
  createObligation(ctx: CommandContext, command: CreateObligationCommand): Promise<Result<Obligation>>;
  confirmDefinitiveAmount(ctx: CommandContext, command: ConfirmDefinitiveAmountCommand): Promise<Result<Obligation>>;
  annulObligation(ctx: CommandContext, command: AnnulObligationCommand): Promise<Result<Obligation>>;
}
```

### 7.3 Reglas de `createObligation`

1. `await authorize(ctx, 'CREATE_OBLIGATION')`; si falla, devolver `PERMISSION_DENIED`.
2. Validar: `concept` no vacío, `dueDate` no vacío (`MISSING_DUE_DATE`), `amount` válido, `personId`/`categoryId`/`resultLineId`/`plannedAccountId`/`periodId` no vacíos (`MISSING_REQUIRED_FIELD`).
3. Validar período existente y **no cerrado** (`PERIOD_NOT_FOUND` / `PERIOD_CLOSED`).
4. Validar referencias existentes (persona, categoría, línea de resultado, cuenta prevista) → `MASTER_NOT_FOUND`.
5. Validar vigencia de los maestros a `ctx.now` (`isCurrentAt`) → `MASTER_NOT_CURRENT` (I-16).
6. Detectar duplicado posible (misma persona + concepto + importe + vencimiento). Si hay candidatos y `confirmPossibleDuplicate !== true` → `POSSIBLE_DUPLICATE_OBLIGATION` (recuperable) con `details.candidates`.
7. Crear con `status='PENDIENTE'`, `estimatedAmountVersion=1`, `finalAmount = isEstimated ? null : amount`, `source='REAL'`, `recurrenceRuleId=null`, `priority` con default `P3`, `createdBy`/`createdAt`/`idempotencyKey` del ctx.
8. Registrar auditoría `OBLIGATION_CREATED`.

### 7.4 Reglas de `confirmDefinitiveAmount`

1. `await authorize(ctx, 'MODIFY_OBLIGATION')`.
2. `finalAmount` válido; obligación existente (`OBLIGATION_NOT_FOUND`); estado en `CONFIRMABLE_STATUSES` (`INVALID_OBLIGATION_STATE`).
3. Actualizar: `finalAmount`, `isEstimated=false`, `estimatedAmountVersion += 1`. El `estimatedAmount` original se conserva (E4-02: preserva el estimado original).
4. Registrar auditoría `OBLIGATION_CONFIRMED` con `reason` que indique el importe anterior y el nuevo.

### 7.5 Reglas de `annulObligation`

1. `await authorize(ctx, 'MODIFY_OBLIGATION')`.
2. `reason` no vacío (`MISSING_REASON`); obligación existente (`OBLIGATION_NOT_FOUND`); estado en `ANNULLABLE_STATUSES` (`INVALID_OBLIGATION_STATE`).
3. Actualizar `status='ANULADA'`.
4. Registrar auditoría `OBLIGATION_ANNULLED` con `reason`.

### 7.6 Errores nuevos

Agregar a `DomainErrorCode`:

| Código | Origen | Recuperable |
|---|---|---|
| `MISSING_DUE_DATE` | D4 §4.1 / §5 | sí |
| `POSSIBLE_DUPLICATE_OBLIGATION` | D4 §4.1 / §5 | sí |
| `OBLIGATION_NOT_FOUND` | nuevo (análogo a `ENTRY_NOT_FOUND`) | sí |
| `INVALID_OBLIGATION_STATE` | nuevo (análogo a `INVALID_STATE` de períodos) | sí |

## 8. Tests requeridos

### `obligations.test.ts`

- Estado anulable: `BORRADOR`/`PENDIENTE`/`PROGRAMADA` sí; `PARCIAL`/`PAGADA`/`ANULADA` no.
- Estado confirmable: `BORRADOR`/`PENDIENTE`/`PROGRAMADA` sí; `PARCIAL`/`PAGADA`/`ANULADA` no.

### `obligations-service.test.ts`

- Crea obligación `PENDIENTE` con `version=1` y `finalAmount=null` (estimada).
- Crea obligación definitiva con `finalAmount=amount` e `isEstimated=false`.
- Rechaza `dueDate` vacío → `MISSING_DUE_DATE`.
- Rechaza persona/categoría/línea/cuenta inexistente → `MASTER_NOT_FOUND`.
- Rechaza período cerrado → `PERIOD_CLOSED`.
- Rechaza maestro no vigente → `MASTER_NOT_CURRENT`.
- Rechaza duplicado posible sin confirmación → `POSSIBLE_DUPLICATE_OBLIGATION`.
- Crea con `confirmPossibleDuplicate=true` → ok.
- Rechaza sin permiso → `PERMISSION_DENIED` (vía `authorize`).
- Registra `OBLIGATION_CREATED`.
- `confirmDefinitiveAmount` fija `finalAmount`, `isEstimated=false` y sube `version`, conservando `estimatedAmount`.
- `confirmDefinitiveAmount` sobre inexistente → `OBLIGATION_NOT_FOUND`.
- `confirmDefinitiveAmount` sobre `PARCIAL` → `INVALID_OBLIGATION_STATE`.
- `annulObligation` sin motivo → `MISSING_REASON`.
- `annulObligation` sobre `PARCIAL` → `INVALID_OBLIGATION_STATE`.
- `annulObligation` deja `ANULADA` y registra `OBLIGATION_ANNULLED`.

## 9. Criterios de aceptación

- `npm run test` pasa.
- `npm run typecheck` pasa.
- `npm run lint` pasa.
- `ObligationsService` no importa React, Astro, Supabase ni navegador.
- Crear/confirmar una obligación **no genera asiento** (P-REC pendiente, modelo caja).
- El estimado original se conserva al confirmar definitivo (`estimatedAmountVersion`).
- Solo `BORRADOR`/`PENDIENTE`/`PROGRAMADA` se pueden confirmar o anular.
- Permisos y auditoría integrados.
- No se toca UI, rutas públicas, `/prode`, Supabase ni deploy.

## 10. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto en este sprint | Tratamiento |
|---|---|---|
| P-REC (caja vs devengamiento) | Define si confirmar definitivo postea asiento (EV-04). | Por defecto **no postea** (modelo caja). Se documenta; el `RECOGNITION_POLICY_UNDEFINED` se agrega cuando se implemente devengamiento. |
| P12 (límites de reversión) | Afecta reversión de pagos, no este sprint. | Fuera de alcance. |
| `VENCIDA` derivada | Se calcula por `dueDate`, no se transiciona. | Se deja como estado derivado, documentado. |
| Recurrencias | `recurrenceRuleId` queda `null`. | Sprint futuro (E4 + `recurrence_rules`). |

## 11. Rollback

Este sprint no toca datos ni producción. Rollback esperado:

- Eliminar `src/finanzas/domain/obligations.ts`, `src/finanzas/application/obligations-service.ts` y sus tests.
- Revertir códigos de error, acciones de auditoría, `isPeriodClosed` y exportaciones.
- No requiere cambios en Supabase, variables de entorno ni datos.
