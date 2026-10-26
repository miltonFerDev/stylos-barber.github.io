# Spec — Sistema financiero sprint 29: performance nivel 2 (autorización única + cliente auth-js)

> Continuación del sprint 27. Ataca los dos costos que quedaron tras paralelizar:
> (1) la **doble autorización** en el dashboard y (2) el **peso de `@supabase/supabase-js`** en el bundle del cliente.

## 1. Problema

El trace mostró que `/api/finanzas/dashboard` tardaba ~847ms por hacer ~8 requests seriales a Supabase. Tras paralelizar (sprint 27) quedan dos ineficiencias:

1. **Doble autorización**: `availabilityReport` y `obligationsReport` llaman cada uno `authorize(ctx, 'VIEW_BALANCES')` → 4 queries de rol (2 por reporte) cuando el dashboard los necesita a ambos. Se resuelve con un solo `authorize`.
2. **Bundle cliente**: `client.ts` usa `@supabase/supabase-js`, que arrastra `postgrest`, `realtime`, `storage` y `functions`. El cliente de finanzas **solo usa `auth`** (`getSession`, `signInWithPassword`, `onAuthStateChange`, `signOut`). El trace mostró ~745ms de parse/compile de JS, en buena parte por este bundle.

## 2. Objetivo

- `ReportsService.dashboardReport(ctx)`: una sola autorización + un solo fetch de cuentas/movimientos/obligaciones, devolviendo `{ availability, obligations }`.
- Cliente de finanzas basado en `@supabase/auth-js` (solo auth), reduciendo el bundle cliente.

## 3. Cambios

### 3.1 Autorización única (server)

| Ítem | Detalle |
|---|---|
| `ReportsService.dashboardReport(ctx)` | `authorize(VIEW_BALANCES)` una vez → `masters.findAll('ACCOUNT')` → `Promise.all([findByAccountIds, obligations.findAll])` → computa ambos reportes. |
| Extraer helpers privados | `computeAvailability(...)` y `computeObligations(...)` para no duplicar la lógica con `availabilityReport`/`obligationsReport`. |
| `handleDashboard` | Usa `dashboardReport` (una llamada, sin `Promise.all` de reportes). |
| `availabilityReport` / `obligationsReport` | Se mantienen (los usa `handleAgenda`), delegando en los helpers. |

Resultado: de ~8 queries seriales a ~5 en ~3 rondas (authorize 2 → [masters] → [movements + obligations]).

### 3.2 Cliente `@supabase/auth-js` (bundle)

| Ítem | Detalle |
|---|---|
| `package.json` | Agregar `@supabase/auth-js` como dependencia directa. |
| `src/finanzas/presentation/client.ts` | Reemplazar `createClient` de `supabase-js` por `AuthClient` de `auth-js` (misma API de `.auth`), exponiendo `getSession`, `signInWithPassword`, `onAuthStateChange`, `signOut`. |
| `getFinanzasAccessToken` | Idéntico, pero sobre el cliente auth. |

**No** se toca el `supabase-js` server-side (`supabase-server.ts`) — ese necesita postgrest/service_role.

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/application/reports-service.ts` | `dashboardReport` + helpers privados. |
| `src/finanzas/presentation/dashboard.ts` | Usar `dashboardReport`. |
| `src/finanzas/presentation/client.ts` | Cliente `auth-js`. |
| `package.json` | `@supabase/auth-js`. |
| `src/finanzas/application/__tests__/reports-service.test.ts` | Test de `dashboardReport` (autoriza una vez, devuelve ambos). |

## 5. Criterios de aceptación

- `npm run test` / `typecheck` / `build` pasan.
- `dashboardReport` llama `authorize` **una vez** y `findByAccountIds`/`findAll` en paralelo.
- El cliente no importa `@supabase/supabase-js` (verificable en el bundle / `grep`).
- Login, sesión y logout funcionan igual que antes.
- Los resultados del dashboard son idénticos.

## 6. Riesgos

| Riesgo | Tratamiento |
|---|---|
| `auth-js` cambia sutilmente la API vs `.auth` de `supabase-js` | `supabase-js` envuelve exactamente `auth-js`; validar en login/logout manual. |
| `dashboardReport` duplica lógica | Extraer helpers privados; los tests existentes de `availabilityReport`/`obligationsReport` deben seguir pasando. |
| `auth-js` no cubre algo futuro (storage/edge functions cliente) | Finanzas no los usa; si aparecen, se evalúa volver. |
