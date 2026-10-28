# Spec — Sistema financiero sprint 42: Reversibilidad de registros (UX)

> Agrega "ir para atrás" (reversión formal) a los registros que hoy son inmutables. Hoy solo **Pagos** se puede revertir. Un error de tipeo en transferencias, ingresos, comisiones, fondos, inversiones o cierre obliga a "arreglarlo a mano".

## 1. Problema

El usuario no puede deshacer la mayoría de los registros. Faltan operaciones de reversión. Esto es un problema de UX (no hay salida ante un error) y de **solidez** (sin reversión, la tentación es editar/borrar datos, lo que rompe la trazabilidad).

## 2. Principio

- **Inmutabilidad + reversión por asiento reverso.** Ningún registro se **edita** ni se **borra**. Un error se corrige con una **reversión** que deja rastro: asiento reverso (débitos/créditos invertidos) + motivo obligatorio + auditoría.
- **No hay "soft undo".** Aunque UX-mente "deshacer" es tentador, en un sistema financiero la corrección debe quedar auditada. La reversión formal ES el "ir para atrás".
- Reutiliza el mecanismo que ya existe en el dominio: `createReversalDraft` + `markReversed` + `reversesEntryId` (lo que ya usa la reversión de pagos).

## 3. Estado actual

| Registro | ¿Reversible hoy? | Endpoint / UI |
|---|---|---|
| Pago | ✅ Sí | `POST /pagos/{id}/revertir` + botón "Revertir" |
| Obligación | ❌ No (dominio tiene `OBLIGATION_ANNULLED`, sin UI) | — |
| Transferencia | ❌ No | — |
| Ingreso | ❌ No | — |
| Comisión (devengo) | ❌ No | — |
| Comisión (pago) | ❌ No | — |
| Fondo (inyección/retiro) | ❌ No (dominio tiene `REINTEGRADO`, sin UI) | — |
| Inversión (pago) | ❌ No | — |
| Cierre / conciliación | ❌ No (solo "resolver", sin deshacer) | — |

## 4. Mecanismo común de reversión

Cada entidad reversible expone un endpoint con la misma forma que pagos:

```
POST /api/finanzas/<entidad>/{id}/revertir
  { reason: string, reversalDate: string, periodId: string }
```

Pasos (en orden, todos dentro del mismo flujo):
1. Validar permiso + que el registro exista y esté en estado reversible (no ya revertido).
2. Postear **asiento reverso** (`createReversalDraft`: invierte débito/crédito) y marcar el original `REVERTIDO` (`markReversed`).
3. Registrar **movimientos inversos** en las cuentas financieras (dirección opuesta).
4. Marcar el registro como `REVERTIDO` (o equivalente según entidad).
5. Restaurar estado dependiente (ver tabla).
6. Auditoría (`<ENTIDAD>_REVERTED`) + motivo.

## 5. Alcance por entidad

| Entidad | Asiento reverso | Movimientos inversos | Estado dependiente a restaurar |
|---|---|---|---|
| Transferencia | invierte `1.1.x ↔ 1.1.y` | OUT/IN invertidos | — |
| Ingreso | invierte `4.x ↔ 1.1.x` | IN → OUT por cuenta | — |
| Comisión (devengo) | invierte `5.1 ↔ 2.1.1` | — | baja el saldo pendiente del barbero |
| Comisión (pago) | invierte `2.1.1 ↔ 1.1.x` | OUT → IN por cuenta | sube el saldo pendiente del barbero |
| Fondo (inyección) | invierte `5.x ↔ 2.3/3.1` | — | marca el settlement `REINTEGRADO` |
| Fondo (retiro) | invierte `2.3 ↔ 1.1.x` | OUT → IN | marca el settlement `REINTEGRADO` |
| Inversión (pago) | invierte `1.3/5.11 ↔ 1.1.x` | OUT → IN | vuelve a `APROBADA` (y deshace la capitalización/depreciación si aplica) |
| Obligación | anular (sin asiento si no fue pagada) | — | estado `ANULADA` |
| Cierre/conciliación | — | — | reabrir conciliación a `PENDIENTE` |

> **Excluido del alcance inicial:** reversión de **depreciación** (se regenera por cron) y reversión de **evaluaciones** de inversión (son de solo lectura, se pueden re-emitir).

## 6. UX

- Un patrón visual único: **botón "Revertir"** (o "Deshacer") en cada listado de registros, igual que "Pagos recientes".
- Al tocar: modal/inline con **motivo obligatorio** + confirmación ("esto genera un asiento reverso, no se borra nada").
- Después de revertir: el registro queda marcado "Revertido" y se refresca la vista.
- Los registros ya revertidos no muestran el botón.

## 7. Decisiones

| # | Decisión | Resolución (propuesta) |
|---|---|---|
| 1 | Editar vs revertir | **Reversión** (nunca editar/borrar). |
| 2 | Permiso | Un único `REVERSE_RECORD` (DIRECCION, TESORERIA). Pagos mantiene `REVERSE_PAYMENT` (o se unifica — a confirmar). |
| 3 | Motivo | Obligatorio en toda reversión. |
| 4 | Moneda | La del registro original. |
| 5 | Período de reversión | El usuario lo elige (abierto), igual que pagos. |
| 6 | Cierre/conciliación | "Deshacer resolución" reabre a `PENDIENTE` (solo si el período sigue abierto). |

## 8. Roadmap por fases

| Fase | Alcance | Prioridad |
|---|---|---|
| **F1** | Transferencias, Ingresos, Comisiones (devengo + pago) | Alta — errores de tipeo frecuentes, monto alto |
| **F2** | Fondos (inyección/retiro → reintegro), Inversión (pago) | Media |
| **F3** | Obligación (anular), Cierre/conciliación (deshacer resolución) | Media-baja |

## 9. Archivos esperados

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/types.ts` | error `RECORD_ALREADY_REVERTED` (o equivalente). |
| `src/finanzas/domain/audit.ts` | acciones `*_REVERTED`. |
| `src/finanzas/domain/permissions.ts` | `REVERSE_RECORD`. |
| `src/finanzas/application/*-service.ts` | método `revert*` por entidad (F1). |
| `src/finanzas/repositories/*` | `findById` + `update(status)` donde falte. |
| `src/pages/api/finanzas/<entidad>/[id]/revertir.ts` | endpoint por entidad (F1). |
| `src/finanzas/ui/*.tsx` | botón "Revertir" en cada listado. |
| `src/finanzas/*/__tests__/*` | tests de reversión por entidad. |

## 10. Criterios de aceptación

- `npm run test` / `typecheck` / `lint` / `build` pasan.
- Revertir una transferencia → asiento reverso + movimientos inversos + estado `REVERTIDO`.
- Revertir un ingreso → anula el ingreso (asiento reverso) y los movimientos.
- Revertir un devengo de comisión → baja el pendiente del barbero.
- Revertir un pago de comisión → sube el pendiente del barbero.
- Revertir un registro ya revertido → error `RECORD_ALREADY_REVERTED`.
- Todo con motivo obligatorio + auditoría.

## 11. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| Reversión de inversión pagada arrastra depreciación ya posteada | Hay que revertir también los posteos de depreciación de ese activo (F2). |
| Cierre/conciliación deshecha puede desincronizar saldos conciliados | Reabrir solo si el período sigue abierto (F3). |
| Idempotencia | Cada reversión usa su propio `idempotencyKey`; revertir dos veces la misma es `RECORD_ALREADY_REVERTED`. |

## 12. Rollback

Reversión es aditiva (nuevos endpoints/UI/métodos). Rollback = revertir handlers/rutas/UI. Sin migraciones destructivas (solo columnas `status` si faltan).
