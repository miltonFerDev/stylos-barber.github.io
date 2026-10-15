# Spec — Sistema financiero sprint 10: fondos externos y adjuntos

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-9-cierres-conciliaciones.md` y de `src/finanzas/` creado en los sprints 1–9.
> Épica del backlog: **E4 — Tesorería operativa** (E4-09 y E4-10). Cierra la épica E4.

## 1. Resumen

Este sprint cierra E4 con dos piezas:
- **E4-09 fondos externos (MARI)**: registrar un gasto pagado por una cuenta/persona externa (EV-11) y su reintegro (EV-11b). El gasto se registra **una sola vez**; la contrapartida depende de `nature` (parámetro explícito, P7 no se asume).
- **E4-10 adjuntos**: vincular comprobantes privados a documentos operativos (metadatos + validación de mime/tamaño), sin almacenamiento real (eso es E8/Supabase).

## 2. Objetivo

- Modelar `external_settlements` y `attachments` (D1 §3.5, §3.7).
- `ExternalSettlementsService.registerExternalPayment` (EV-11) y `registerReimbursement` (EV-11b).
- `AttachmentsService.link` (validación + vínculo, siempre privado).
- Permisos, auditoría e idempotencia.

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/ER.md` | §3.5 `external_settlements`; §3.7 `attachments`; I-17. |
| `docs/diseno-financiero/matriz-contabilizacion.md` | §4.3 EV-11/EV-11b. |
| `docs/diseno-financiero/contratos-dominio.md` | §4.4 `ExternalSettlementsService`; §4.15 `AttachmentsService`; §5 errores. |
| `docs/diseno-financiero/plan-cuentas.md` | §5 tratamiento MARI externa (2.3/3.1). |
| `docs/diseno-financiero/backlog-desarrollo.md` | E4-09 y E4-10. |

## 4. Alcance incluido

- `ExternalSettlement`, `ExternalSettlementNature` (`PRESTAMO`/`APORTE`/`CUENTA_CORRIENTE`), `ExternalSettlementStatus`.
- `registerExternalPayment`: asiento EV-11 `Db 5.x / Hr contrapartida(2.3|3.1)`, sin movimiento en cuenta propia.
- `registerReimbursement`: asiento EV-11b `Db contrapartida / Hr 1.1.x` + movimiento `OUT`.
- `Attachment` + `AttachmentsService.link` (mime/size/checksum, siempre privado).

## 5. Alcance excluido

- Almacenamiento real de archivos (Supabase storage) — E8.
- Obligación objetivo (`targetRefType`): se modela egreso directo con `resultLineId`.
- Reversión de settlements.
- UI, Supabase, RLS, migraciones.

## 6. Cambios por archivo esperados

### Crear

| Archivo | Responsabilidad |
|---|---|
| `src/finanzas/domain/external-settlements.ts` | `ExternalSettlement`, nature, status, constantes. |
| `src/finanzas/domain/attachments.ts` | `Attachment`, constantes de mime/size, validador. |
| `src/finanzas/application/external-settlements-service.ts` | `ExternalSettlementsService`. |
| `src/finanzas/application/attachments-service.ts` | `AttachmentsService`. |
| `src/finanzas/domain/__tests__/attachments.test.ts` | Tests de validación de adjuntos. |
| `src/finanzas/application/__tests__/external-settlements-service.test.ts` | Tests de settlements. |
| `src/finanzas/application/__tests__/attachments-service.test.ts` | Tests de adjuntos. |

### Editar

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/permissions.ts` | `REGISTER_EXTERNAL_SETTLEMENT`, `LINK_ATTACHMENT`. |
| `src/finanzas/domain/types.ts` | `EXTERNAL_NATURE_UNDEFINED`, `UNSUPPORTED_MIME`, `ATTACHMENT_TOO_LARGE`, `SETTLEMENT_NOT_FOUND`, `SETTLEMENT_ALREADY_REINTEGRADO`. |
| `src/finanzas/domain/errors.ts` | Agregar a `DOMAIN_ERROR_CODES`. |
| `src/finanzas/domain/audit.ts` | `EXTERNAL_SETTLEMENT_CREATED`, `EXTERNAL_SETTLEMENT_REIMBURSED`, `ATTACHMENT_LINKED`. |
| `src/finanzas/index.ts` | Exportar nuevos módulos. |

## 7. Contratos a implementar

### 7.1 Fondos externos (`external-settlements.ts` + service)

```ts
export type ExternalSettlementNature = 'PRESTAMO' | 'APORTE' | 'CUENTA_CORRIENTE';
export type ExternalSettlementStatus = 'CONFIRMADO' | 'REINTEGRADO';

export type ExternalSettlement = {
  id: string;
  sourcePersonId: string;
  externalAccountId: string | null;
  resultLineId: string;
  concept: string;
  amount: Money;
  nature: ExternalSettlementNature;
  effectiveDate: string;
  status: ExternalSettlementStatus;
  note: string | null;
  idempotencyKey: string;
  source: 'REAL';
  createdBy: UserId;
  createdAt: string;
};

export const EXTERNAL_SETTLEMENT_NATURES: readonly ExternalSettlementNature[] = ['PRESTAMO', 'APORTE', 'CUENTA_CORRIENTE'];
```

`registerExternalPayment(ctx, command)`:
- `authorize(ctx, 'REGISTER_EXTERNAL_SETTLEMENT')`; idempotencia → `DUPLICATE_IDEMPOTENCY`.
- `nature` válido → si no, `EXTERNAL_NATURE_UNDEFINED`.
- `resultLineId` existe y vigente → si no, `MASTER_NOT_FOUND`/`MASTER_NOT_CURRENT`.
- Período abierto → `PERIOD_CLOSED`.
- Asiento EV-11: `Db resultLine.ledgerAccountId / Hr settlementLedgerAccounts[nature]`. **Ninguna línea toca una cuenta `1.1.x` propia** (I-17).
- Sin movimiento en cuenta propia.
- Auditoría `EXTERNAL_SETTLEMENT_CREATED`.

`registerReimbursement(ctx, command)`:
- `authorize(ctx, 'REGISTER_EXTERNAL_SETTLEMENT')`; idempotencia.
- Settlement existente y `CONFIRMADO` → si no, `SETTLEMENT_NOT_FOUND` / `SETTLEMENT_ALREADY_REINTEGRADO`.
- Cuenta propia disponible → `ACCOUNT_NOT_AVAILABLE`.
- Asiento EV-11b: `Db settlementLedgerAccounts[nature] / Hr account.ledgerAccountId`.
- Movimiento `OUT` de la cuenta propia.
- Marcar `REINTEGRADO`; auditoría `EXTERNAL_SETTLEMENT_REIMBURSED`.

Config inyectada: `settlementLedgerAccounts: Record<ExternalSettlementNature, string>` (p. ej. `PRESTAMO: '2.3'`, `CUENTA_CORRIENTE: '2.3'`, `APORTE: '3.1'`).

### 7.2 Adjuntos (`attachments.ts` + service)

```ts
export type Attachment = {
  id: string;
  entityType: string;
  entityId: string;
  storageKey: string;
  checksum: string;
  mime: string;
  sizeBytes: number;
  isPrivate: boolean;
  uploadedBy: UserId;
  createdAt: string;
};

export const ALLOWED_MIME_TYPES: readonly string[] = ['application/pdf', 'image/png', 'image/jpeg'];
export const MAX_ATTACHMENT_BYTES = 10_000_000;
```

`AttachmentsService.link(ctx, command)`:
- `authorize(ctx, 'LINK_ATTACHMENT')`.
- `mime` en whitelist → si no, `UNSUPPORTED_MIME`.
- `sizeBytes ≤ MAX_ATTACHMENT_BYTES` → si no, `ATTACHMENT_TOO_LARGE`.
- `checksum`/`storageKey` no vacíos; `entityType`/`entityId` no vacíos.
- Guardar con `isPrivate=true`; auditoría `ATTACHMENT_LINKED`.

### 7.3 Errores nuevos

| Código | Origen | Recuperable |
|---|---|---|
| `EXTERNAL_NATURE_UNDEFINED` | D4 §5 / P7 | sí |
| `UNSUPPORTED_MIME` | D4 §5 | sí |
| `ATTACHMENT_TOO_LARGE` | D4 §5 | sí |
| `SETTLEMENT_NOT_FOUND` | nuevo | sí |
| `SETTLEMENT_ALREADY_REINTEGRADO` | nuevo | no |

## 8. Tests requeridos

### `attachments.test.ts`

- `mime` permitido → ok; `mime` no permitido → `UNSUPPORTED_MIME`.
- `sizeBytes` dentro del límite → ok; excedido → `ATTACHMENT_TOO_LARGE`.

### `external-settlements-service.test.ts`

- Pago externo `PRESTAMO` → asiento `Db 5.6 / Hr 2.3`, sin movimiento propio.
- Pago externo `APORTE` → asiento `Db 5.6 / Hr 3.1`.
- `nature` inválido → `EXTERNAL_NATURE_UNDEFINED`.
- Reintegro → asiento `Db 2.3 / Hr 1.1.1` + movimiento `OUT` + estado `REINTEGRADO`.
- Reintegro de ya reintegrado → `SETTLEMENT_ALREADY_REINTEGRADO`.
- Sin permiso → `PERMISSION_DENIED`.

### `attachments-service.test.ts`

- Vincula adjunto privado → `isPrivate=true`, auditoría `ATTACHMENT_LINKED`.
- `mime` no permitido → `UNSUPPORTED_MIME`.
- Sin permiso → `PERMISSION_DENIED`.

## 9. Criterios de aceptación

- `npm run test` pasa; `npm run typecheck` pasa; `npm run lint` pasa.
- Un pago externo no toca cuentas propias ni genera movimiento propio (I-17).
- `nature` es parámetro explícito (P7 no se asume).
- Adjuntos siempre privados y validados (mime/tamaño).
- No se toca UI, rutas públicas, `/prode`, Supabase ni deploy.

## 10. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto | Tratamiento |
|---|---|---|
| P7 (naturaleza de MARI) | Define qué `nature` usar por defecto. | `nature` explícito por transacción; no se asume. |
| Almacenamiento real de comprobantes | E8/Supabase. | Aquí solo metadatos y vínculo. |
| `targetRefType` (obligación objetivo) | Se modela egreso directo. | Obligación objetivo diferida. |

## 11. Rollback

- Eliminar archivos nuevos y revertir permisos/códigos/auditoría/exportaciones.
- No requiere cambios en Supabase, variables de entorno ni datos.
