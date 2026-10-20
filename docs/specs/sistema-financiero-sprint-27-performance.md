# Spec — Sistema financiero sprint 27: performance (N+1, caching, lazy, memo)

> Optimización de la mini-app `/finanzas`. Solo toca código de finanzas; no se toca landing/prode/escuela.

## 1. Problemas detectados (audit)

1. **N+1 en `availabilityReport`**: por cada cuenta hace un `movements.findByAccount` (1 query extra por cuenta).
2. **N+1 en `findByPeriod`**: por cada asiento hace un query de `journal_lines`.
3. **Sin `Cache-Control`** en los endpoints de finanzas (datos financieros podrían quedar cacheados).
4. **Re-cómputo en render**: `sortAgenda` (agenda) y `overdueFirst` (tablero) no memoizados.
5. **Sin lazy loading** en las pantallas no-default (Agenda, Alta).

## 2. Cambios

| Ítem | Fix |
|---|---|
| `AccountMovementRepository` | Agregar `findByAccountIds(ids: string[])` (batch). |
| `SupabaseAccountMovementRepository` | Implementar `findByAccountIds` con `.in('account_id', ids)`. |
| `ReportsService.availabilityReport` | 1 query batch de movimientos, agrupados en memoria por `accountId`. |
| `SupabaseJournalEntryQueryRepository.findByPeriod` | 1 query batch de `journal_lines` con `.in('entry_id', ids)`. |
| `presentation/http.ts` | `Cache-Control: no-store` en `json()`. |
| `AgendaTesorería` / `TableroDireccion` | `useMemo` para el orden/filtrado. |
| `FinanzasShell` | `React.lazy` + `Suspense` para Agenda y Alta. |

## 3. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/account-movements.ts` | agregar `findByAccountIds`. |
| `src/finanzas/repositories/supabase-repositories.ts` | batch de movimientos + batch de líneas. |
| `src/finanzas/application/reports-service.ts` | usar batch. |
| `src/finanzas/presentation/http.ts` | `Cache-Control`. |
| `src/finanzas/ui/AgendaTesorería.tsx` | `useMemo`. |
| `src/finanzas/ui/TableroDireccion.tsx` | `useMemo`. |
| `src/finanzas/ui/FinanzasShell.tsx` | `React.lazy` + `Suspense`. |
| `src/finanzas/application/__tests__/reports-service.test.ts` | fake con `findByAccountIds`. |

## 4. Criterios de aceptación

- `npm run test` / `typecheck` / `build` pasan.
- `availabilityReport` y `findByPeriod` hacen 2 queries en vez de N+1.
- Endpoints devuelven `Cache-Control: no-store`.
- Resultados idénticos a antes (los tests existentes siguen pasando).

## 5. Riesgos

| Riesgo | Tratamiento |
|---|---|
| Cambiar la interfaz `AccountMovementRepository` rompe fakes | Actualizar el fake de `reports-service.test.ts`. |
| Lazy loading cambia el orden de carga | `Suspense` con fallback; el resultado visual es el mismo. |
| `no-store` en maestros (podría cachearse) | Se acepta: dato financiero no debe cachearse por seguridad. |
