# Spec: Libro diario de finanzas (visualización de registros)

## Objetivo

Vista read-only, en formato tabla, de **todos los asientos contables** (`journal_entries`
+ `journal_lines`) para identificar de un vistazo inconsistencias en registros pasados
(p. ej. una comisión revertida que siga inflando un acumulado). Es el "libro diario".

## Alcance

- Nueva pantalla **Libro diario** en el nav de `/finanzas`, visible para roles con
  `VIEW_BALANCES` (misma autorización que el tablero).
- Solo lectura. No crea, edita ni revierte nada.

## Diseño

- **Endpoint** `GET /api/finanzas/libro` → `{ lines: [...] }` con las líneas aplanadas
  de cada asiento: `entryId, entryDate, description, sourceDocumentType, status,
  reversesEntryId, ledgerAccountId, accountName, debit, credit`.
- La fuente es `ReportsService.libroDiario(ctx)`, que lee todos los asientos con sus
  líneas vía `JournalEntryQueryRepository.findAll()`.
- El nombre de cuenta se resuelve mapeando el `ledger_account_id` (código del plan de
  cuentas) contra el maestro `ledger_accounts`.
- La UI (`LibroDiario.tsx`) renderiza una tabla: Fecha · Descripción · Tipo · Cuenta ·
  Debe · Haber · Estado, con marca visual cuando el asiento es una reversión
  (`reversesEntryId`) o está revertido (`reversedAt`).

## No incluye (fuera de alcance)

- Filtros, paginación, exportación, ni edición. Se agregan solo si se piden.

## Criterios de aceptación

- `npm run typecheck`, `npm run lint` y `npm test` pasan.
- La tabla muestra cada asiento con sus débitos y créditos balanceados y el nombre de
  cuenta legible.
- Un usuario sin `VIEW_BALANCES` recibe 403.
