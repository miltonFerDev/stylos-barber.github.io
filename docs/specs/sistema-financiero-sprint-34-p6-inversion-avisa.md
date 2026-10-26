# Spec — Sistema financiero sprint 34: P6 inversión "avisa" (no bloquea)

> Decisión de negocio P6 (cerrada 2026-10-20): una inversión que supera la capacidad de caja **avisa, no bloquea** — advertencia recuperable + confirmación explícita.

## 1. Problema

`InvestmentsService.decide` con `APROBADA` devuelve `INVESTMENT_EXCEEDS_CAPACITY` como bloqueo duro cuando `minProjectedBalance − reserve − protectedFunds < 0`. P6 ya está cerrada: debe ser advertencia recuperable.

## 2. Objetivo

Degradar el bloqueo a advertencia recuperable: si el usuario manda `confirmExceedsCapacity = true`, la aprobación sigue adelante; si no, se devuelve el error recuperable (mismo patrón que `confirmPossibleDuplicate` en obligaciones/maestros).

## 3. Alcance incluido

- `DecideCommand` += `confirmExceedsCapacity?: boolean`.
- `decide`: gate `if (raw < 0n && command.confirmExceedsCapacity !== true)`.
- Test: aprobación con `confirmExceedsCapacity: true` supera la capacidad.

## 4. Alcance excluido

- UI de confirmación (no hay pantalla de inversiones expuesta aún; es solo dominio).
- Registrar en auditoría el flag de excedido (no lo pide P6; el `reason` ya queda en `decisionNote`).

## 5. Decisiones

| # | Decisión | Resolución |
|---|---|---|
| 1 | Patrón | Replica `confirmPossibleDuplicate`: flag opcional, error recuperable si falta. |
| 2 | Semántica del error | `INVESTMENT_EXCEEDS_CAPACITY` sigue devolviéndose (recuperable) cuando no se confirma. |

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/application/investments-service.ts` | `DecideCommand` += flag + gate en `decide`. |
| `src/finanzas/application/__tests__/investments-service.test.ts` | Test nuevo de confirmación. |

## 7. Criterios de aceptación

- `npm run test` / `typecheck` pasan.
- Aprobar excediendo capacidad sin flag → `INVESTMENT_EXCEEDS_CAPACITY` (recuperable).
- Aprobar excediendo capacidad con `confirmExceedsCapacity: true` → `APROBADA`.

## 8. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| El dueño aprueba sin mirar | Confirmación explícita en el flag; la auditoría `INVESTMENT_DECIDED` + `decisionNote` deja traza. |
| No hay UI de inversiones aún | El flag lo mandará la UI futura (E6-06); hoy es contrato de dominio. |

## 9. Rollback

Quitar el flag y restablecer el `if (raw < 0n)` como bloqueo.
