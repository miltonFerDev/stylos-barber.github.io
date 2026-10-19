# Spec — Sistema financiero sprint 20: E5 tablero Dirección (read-only)

> Épica del backlog: **E5 — Interfaces operativas MVP** (`docs/diseno-financiero/backlog-desarrollo.md`).
> Primer slice de UI: **Tablero Dirección de solo lectura**, para probar el camino completo cliente → endpoint → `ReportsService` → Supabase. Continúa el walking skeleton del sprint 19.

## 1. Problema

El sprint 19 dejó el puente SSR (auth + RBAC server-side vía `GET /api/finanzas/me`), pero no hay ninguna pantalla ni endpoint de negocio. No existe evidencia de que la UI pueda consumir datos financieros reales por un endpoint protegido.

## 2. Objetivo

- Cablear `ReportsService` (ya implementado y testeado) en el composition root.
- Exponer `GET /api/finanzas/dashboard` que devuelve disponibilidad + obligaciones.
- Pantalla Tablero Dirección (read-only) que renderiza esos datos.
- Probar el camino end-to-end: UI → endpoint → auth server-side → `ReportsService` → repos → Supabase.

## 3. Alcance incluido

| Ítem | Detalle |
|---|---|
| Cablear `ReportsService` | `buildContainer` gana `reports: ReportsService`, cableando sus 5 repos (`SupabaseMasterRepository`, `SupabaseAccountMovementRepository`, `SupabaseObligationRepository`, `SupabaseAuditQueryRepository`, `SupabaseJournalEntryQueryRepository`) + `authorize`. |
| Endpoint | `GET /api/finanzas/dashboard` → `{ availability, obligations }`. |
| Ruta `/finanzas` | Página Astro que monta la mini-app React (mismo patrón que `/prode`). |
| Pantalla Tablero | Componente React read-only: disponibilidad total + cuentas, y lista de obligaciones (vencidas primero, monto + estado). |
| Cliente | Reutilizar el patrón de cliente browser Supabase (anon) para leer `access_token` y llamar el endpoint con `Authorization: Bearer`. Sin queries de datos directas a Supabase desde la UI. |
| Tests | Endpoint con cliente falso: `401` sin token, `200` con token válido y rol. |

## 4. Alcance excluido (siguientes slices)

- E5-02..E5-07 (agenda Tesorería, formularios, cierre/conciliación, mobile/desktop específicos).
- Cualquier mutación monetaria (nada se escribe desde la UI).
- Login específico de finanzas: se reutiliza la auth Supabase existente del proyecto.
- Storage/comprobantes (E8).

## 5. Contratos

```ts
// container.ts (crece, no se reescribe)
export type FinanzasContainer = {
  supabase: SupabaseClient;
  roles: RoleRepository;
  authorize: Authorizer;
  reports: ReportsService;
};

// endpoint
GET /api/finanzas/dashboard
  header: Authorization: Bearer <access_token>
  -> 200 { availability: AvailabilityReport, obligations: ObligationsReport }
  -> 401 { error: 'UNAUTHENTICATED' }   // resolveActor devuelve null
  -> 403 { error: 'FORBIDDEN' }          // authorize(ctx, 'VIEW_BALANCES') falla
```

Los tipos `AvailabilityReport` y `ObligationsReport` ya existen en `src/finanzas/application/reports-service.ts`; no se redefinen.

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/presentation/container.ts` | Cablear `ReportsService` + repos. |
| `src/pages/api/finanzas/dashboard.ts` | Crear endpoint. |
| `src/pages/finanzas.astro` | Crear ruta + mount React (patrón `/prode`). |
| `src/finanzas/presentation/client.ts` | Cliente browser Supabase (anon) mínimo para `getSession()`. |
| `src/finanzas/ui/TableroDireccion.tsx` | Pantalla read-only. |
| `src/finanzas/presentation/__tests__/dashboard.test.ts` | Test del endpoint (cliente falso). |

## 7. Criterios de aceptación

- `npm run test` pasa; `npm run typecheck` pasa; `npm run build` produce build SSR sin error.
- `GET /api/finanzas/dashboard` sin token → `401`; con token válido → `200` con `availability` y `obligations`; con token de usuario sin rol → `403`.
- El Tablero no consulta Supabase directamente (solo el endpoint); el token se obtiene de la sesión, no se hardcodea.
- No se tocan landing, `/prode`, `/escuela` ni sus componentes.
- Sin mutaciones monetarias en la UI; no se agregan migrations ni policies.

## 8. Riesgos

| Riesgo | Tratamiento |
|---|---|
| `buildContainer` crece y todos los endpoints pagan el cableado de `ReportsService` | Se crea solo lo que el endpoint usa; si más adelante pesa, se parte por endpoint (decisión en ese slice). |
| El cliente browser expone `PUBLIC_SUPABASE_ANON_KEY` | Ya expuesto hoy en `/prode`; el secreto `SUPABASE_SERVICE_ROLE_KEY` sigue server-only (`process.env`). |
| `resolveActor` valida el token contra el cliente service_role | Comportamiento ya validado en sprint 19; el test del endpoint lo cubre. |
| La ruta `/finanzas` queda accesible sin login | El shell es HTML estático; la seguridad vive en el endpoint (server-side), no en la página. |
