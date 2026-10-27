# Spec — Sistema financiero sprint 38: Fondos externos desde UI

> Expone la "cuenta corriente" del dueño (P7) en la UI. El dominio ya está (sprint 10 + sprint 35):
> `registerExternalPayment` (inyección) y `registerCurrentAccountWithdrawal` (retiro).

## 1. Problema

No hay forma de registrar desde la web cuándo el dueño inyecta plata (paga un gasto con su cuenta personal) ni cuándo retira el excedente de caja. El dominio existe pero no está cableado ni expuesto.

## 2. Objetivo

Pantalla **Fondos** con dos modos:
- **Inyección**: un gasto del negocio pagado por el dueño/tercero (`nature` = préstamo/aporte/cuenta corriente).
- **Retiro**: el dueño se lleva efectivo de una cuenta propia (baja la cuenta corriente).

## 3. Alcance incluido

- Cablear `ExternalSettlementsService` + repo en el contenedor.
- `GET /api/finanzas/fondos` → `{ persons, resultLines, accounts, periods }`.
- `POST /api/finanzas/fondos/inyeccion` → `registerExternalPayment`.
- `POST /api/finanzas/fondos/retiro` → `registerCurrentAccountWithdrawal`.
- Tab **Fondos** con los dos modos.
- Tests de handlers.

## 4. Alcance excluido

- **Reintegro** (`registerReimbursement`, devolver un préstamo): requiere listado de settlements para elegir; queda para un slice posterior.
- Reversión de inyecciones/retiros.
- Historial de movimientos de la cuenta corriente (reporte futuro).

## 5. Decisiones

| # | Decisión | Resolución |
|---|---|---|
| 1 | Permiso | `REGISTER_EXTERNAL_SETTLEMENT` (DIRECCION + TESORERIA). El GET autoriza `VIEW_BALANCES`. |
| 2 | Inyección | Campos: persona (`sourcePersonId`), línea de resultado (`resultLineId`), naturaleza (`PRESTAMO`/`APORTE`/`CUENTA_CORRIENTE`), concepto, monto, fecha, período, nota (opcional). |
| 3 | Retiro | Campos: persona (el dueño), cuenta **PROPIA** (`accountId`), concepto, monto, fecha, período, nota (opcional). |
| 4 | Naturaleza | Select con las 3 opciones, con label claro ("Cuenta corriente" default). |
| 5 | Cuentas del retiro | Solo `ownership = PROPIA` y `isAvailable`. |

## 6. Contratos

```ts
// GET /api/finanzas/fondos -> 200
{ persons, resultLines, accounts, periods } // accounts = PROPIA disponibles; periods = abiertos

// POST /api/finanzas/fondos/inyeccion
// body: { sourcePersonId, resultLineId, nature, concept, amount, currency, effectiveDate, periodId, note? }
// 201 { settlement } | 400 | 401 | 403

// POST /api/finanzas/fondos/retiro
// body: { sourcePersonId, accountId, concept, amount, currency, effectiveDate, periodId, note? }
// 201 { settlement } | 400 | 401 | 403
```

Errores reutilizados: `EXTERNAL_NATURE_UNDEFINED`, `MISSING_REQUIRED_FIELD`, `MASTER_NOT_FOUND`, `ACCOUNT_NOT_AVAILABLE`, `PERIOD_NOT_FOUND`, `PERIOD_CLOSED`, `PERMISSION_DENIED`.

## 7. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/presentation/container.ts` | Cablear `ExternalSettlementsService` + repo. |
| `src/finanzas/presentation/fondos.ts` | `handleFondos`, `handleInyeccion`, `handleRetiro` (nuevo). |
| `src/pages/api/finanzas/fondos.ts` | `GET`. |
| `src/pages/api/finanzas/fondos/inyeccion.ts` | `POST`. |
| `src/pages/api/finanzas/fondos/retiro.ts` | `POST`. |
| `src/finanzas/ui/Fondos.tsx` | Pantalla (nuevo). |
| `src/finanzas/ui/FinanzasShell.tsx` | Tab "Fondos". |
| `src/finanzas/presentation/__tests__/fondos.test.ts` | Tests (nuevo). |

## 8. Criterios de aceptación

- `npm run test` / `typecheck` / `lint` / `build` pasan.
- Inyección con `nature` válido → `201 { settlement }` + asiento EV-11 sin movimiento propio.
- Retiro → `201 { settlement }` con asiento `Db 2.3 / Hr 1.1.x` + movimiento `OUT`.
- `nature` inválido → `400 EXTERNAL_NATURE_UNDEFINED`; cuenta no propia en retiro → `400 ACCOUNT_NOT_AVAILABLE`.
- La UI muestra los dos modos y refresca tras cada operación.

## 9. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| `settlementLedgerAccounts` (2.3/3.1) hardcodeado | Config inyectada en el contenedor (como el resto). |
| No hay historial de cuenta corriente en la UI | Reporte futuro; el saldo se ve en el libro/ledger `2.3`. |

## 10. Rollback

Revertir handlers/rutas/UI, quitar `ExternalSettlementsService` del contenedor. Sin migraciones nuevas.
