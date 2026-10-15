# Spec — Sistema financiero sprint 3: reversión mínima de asientos

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-2-libro-periodos.md`.

## 1. Resumen

Este sprint agrega reversión mínima de asientos confirmados mediante asiento inverso. No modifica el asiento original y evita doble reversión del mismo asiento.

## 2. Objetivo

- Implementar `JournalService.reverseEntry`.
- Crear asiento inverso balanceado.
- Mantener el asiento original inmutable.
- Bloquear una segunda reversión directa del mismo asiento.
- Exigir período abierto para la reversión.

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/ER.md` | Invariantes I-02 e I-03. |
| `docs/diseno-financiero/contratos-dominio.md` | `ReversalService`, `JournalService.reverseEntry`, errores tipados. |
| `docs/diseno-financiero/pruebas.md` | REV-01, REV-02, REV-03, REV-07. |

## 4. Alcance incluido

- Tipar `REVERSAL_ALREADY_EXISTS`, `ENTRY_NOT_FOUND` y `MISSING_REASON`.
- Agregar `reversesEntryId` opcional a `JournalEntry`.
- Agregar `reversedAt` opcional al asiento original para marcarlo sin editar importes ni líneas.
- Implementar comando `ReverseJournalEntryCommand`.
- Agregar métodos de repositorio necesarios.
- Agregar tests unitarios con repositorio in-memory.

## 5. Alcance excluido

- Reversión de pagos, obligaciones o movimientos financieros.
- Auditoría persistida.
- SQL, RLS o triggers.
- UI.
- Permisos por rol reales.

## 6. Reglas

- Solo se puede revertir un asiento existente.
- El asiento inverso invierte débito/crédito línea por línea.
- El asiento inverso referencia al original con `reversesEntryId`.
- Un original puede tener como máximo una reversión directa.
- Revertir requiere `reason` no vacío.
- La reversión se postea contra un período abierto.
- El asiento original no cambia sus líneas, importes, fecha ni descripción.

## 7. Tests requeridos

- Revertir un asiento crea asiento inverso con `reversesEntryId`.
- El asiento original conserva líneas e importes.
- Segunda reversión del mismo original devuelve `REVERSAL_ALREADY_EXISTS`.
- Reversión sin motivo devuelve `MISSING_REASON`.
- Reversión de asiento inexistente devuelve `ENTRY_NOT_FOUND`.
- Reversión en período cerrado devuelve `PERIOD_CLOSED`.

## 8. Criterios de aceptación

- `npm run test` pasa.
- `npm run typecheck` pasa.
- `npm run lint` pasa.
- No se toca UI, Supabase, landing ni `/prode`.

## 9. Rollback

Revertir cambios en `src/finanzas/application/journal-service.ts`, `src/finanzas/domain/journal.ts`, `src/finanzas/domain/types.ts`, `src/finanzas/domain/errors.ts` y eliminar tests agregados si hiciera falta.
