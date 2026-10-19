# Spec — Sistema financiero sprint 21: E5 agenda Tesorería (read-only)

> Épica del backlog: **E5 — Interfaces operativas MVP** (`docs/diseno-financiero/backlog-desarrollo.md`, historia E5-02).
> Segundo slice de UI: **Agenda Tesorería de solo lectura**, reutilizando el reporte de obligaciones ya existente. Continúa el slice del tablero (sprint 20).

## 1. Problema

El tablero (sprint 20) muestra disponibilidad + obligaciones en bruto. Tesorería necesita una agenda operativa: qué vence, qué pagar y en qué orden de prioridad. La data ya está en `ReportsService.obligationsReport`, pero no expone `priority` ni `expectedPaymentDate`, y no hay una vista dedicada.

## 2. Objetivo

- Exponer `priority` y `expectedPaymentDate` en el reporte de obligaciones (ya vienen del dominio, no se calcula nada nuevo).
- Endpoint `GET /api/finanzas/agenda` → `{ obligations }`.
- Navegación mínima Tablero / Agenda en la shell de finanzas.
- Pantalla Agenda Tesorería: obligaciones activas partidas en **Vencidas** y **Próximas**, ordenadas por vencimiento, con badge de prioridad y monto.

## 3. Alcance incluido

| Ítem | Detalle |
|---|---|
| Enriquecer `ObligationLine` | Agregar `priority: ObligationPriority` y `expectedPaymentDate: string \| null` en `reports-service.ts` + su `map` en `obligationsReport`. |
| Endpoint | `GET /api/finanzas/agenda` → `{ obligations }` (reusa `obligationsReport`). |
| Shell + nav | `FinanzasShell` con tabs Tablero / Agenda (estado local `useState`, sin router). |
| Hook compartido | `useFinanzasFetch<T>(path)` extrae el patrón sesión → token → fetch → estados (lo usan Tablero y Agenda). |
| Pantalla Agenda | `AgendaTesorería.tsx`: filtra estados activos (`PENDIENTE`, `PROGRAMADA`, `PARCIAL`, `VENCIDA`), agrupa Vencidas vs Próximas por `dueDate`, ordena por fecha, muestra prioridad (P1–P4), concepto, vencimiento y monto. |
| Tests | `handleAgenda` con cliente falso: `401` sin token, `200` con token válido, `403` si deniega permiso. |

## 4. Alcance excluido (siguientes slices)

- **Pagos pendientes** y **cierres pendientes** como listas propias: hoy `payments` y `daily_closings` no tienen query de listado (solo `findBy...` puntual). Requieren trabajo de repos/E4, no de UI.
- Mutaciones monetarias (nada se escribe).
- Router (`react-router-dom`): se agrega cuando haya más de 2–3 pantallas.
- Login específico de finanzas.

## 5. Contratos

```ts
// reports-service.ts (ObligationLine crece)
export type ObligationLine = {
  id: string;
  concept: string;
  status: ObligationStatus;
  dueDate: string;
  amount: Money;
  isOverdue: boolean;
  priority: ObligationPriority;
  expectedPaymentDate: string | null;
};

// endpoint
GET /api/finanzas/agenda
  header: Authorization: Bearer <access_token>
  -> 200 { obligations: ObligationsReport }
  -> 401 { error: 'UNAUTHENTICATED' }
  -> 403 { error: 'PERMISSION_DENIED' }
```

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/application/reports-service.ts` | Agregar `priority` + `expectedPaymentDate` a `ObligationLine` y al `map`. |
| `src/finanzas/presentation/agenda.ts` | Crear `handleAgenda` (glue testeable). |
| `src/pages/api/finanzas/agenda.ts` | Crear endpoint. |
| `src/finanzas/ui/useFinanzasFetch.ts` | Crear hook compartido. |
| `src/finanzas/ui/FinanzasShell.tsx` | Crear shell con nav. |
| `src/finanzas/ui/TableroDireccion.tsx` | Refactor para usar el hook. |
| `src/finanzas/ui/AgendaTesorería.tsx` | Crear pantalla. |
| `src/pages/finanzas.astro` | Montar `FinanzasShell` en vez de `TableroDireccion`. |
| `src/finanzas/presentation/__tests__/agenda.test.ts` | Test del endpoint (cliente falso). |

## 7. Criterios de aceptación

- `npm run test` pasa; `npm run typecheck` pasa; `npm run build` produce build SSR sin error.
- `GET /api/finanzas/agenda` sin token → `401`; con token válido → `200` con `obligations`; sin rol → `403`.
- La Agenda no consulta Supabase directamente (solo el endpoint); muestra prioridad y fecha de pago esperada.
- Obligaciones `PAGADA`, `ANULADA` y `BORRADOR` no aparecen en la agenda.
- No se tocan landing, `/prode`, `/escuela`; sin mutaciones ni migrations/policies nuevas.

## 8. Riesgos

| Riesgo | Tratamiento |
|---|---|
| Duplicar el patrón sesión→fetch entre pantallas | Se extrae `useFinanzasFetch` (2 consumidores reales). |
| Agregar campos a `ObligationLine` rompe consumidores | El test de reports no asevera el shape por línea; el mapa agrega campos, no quita. |
| La agenda queda vacía sin datos | Igual que el tablero: sin seed de `obligations` no hay nada que listar (esperado en read-only). |
| Nav con `useState` sin router | Suficiente para 2 pantallas; se migra a router cuando E5 crezca. |
