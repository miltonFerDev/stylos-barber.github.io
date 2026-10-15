# Spec — Sistema financiero sprint 19: E5 presentación (walking skeleton SSR)

> Épica del backlog: **E5 — Interfaces operativas MVP**.
> Primer slice: tender el puente servidor (decisión B: Astro SSR) y probar el camino completo cliente → endpoint → service_role → roles, antes de construir UI.

## 1. Problema

Los 12 servicios y 26 repos corren server-side con `service_role`, pero el sitio es **Astro estático** (GitHub Pages). No hay servidor donde correrlos. E5 es tender ese puente.

**Decisión cerrada (B):** pasar Astro a **SSR (adapter Vercel, `output: 'hybrid'`)** y exponer los servicios vía endpoints en `src/pages/api/finanzas/`. Landing y `/prode` siguen prerenderizados (no se tocan).

## 2. Objetivo de este slice

Un **walking skeleton**: de-risquear infra + auth + RBAC end-to-end antes de sumar features/UI.

- El endpoint verifica el token Supabase **server-side** (nunca confía en el cliente).
- Resuelve roles **server-side** (`SupabaseRoleRepository` → `user_roles`).
- Devuelve JSON.

## 3. Alcance incluido

| Ítem | Detalle |
|---|---|
| Adapter SSR | `@astrojs/vercel@^7` + `output: 'hybrid'` en `astro.config.mjs`. |
| Puente de auth | `src/finanzas/presentation/auth.ts`: `resolveActor()` (token → `userId`) y `commandContext()`. |
| Composition root | `src/finanzas/presentation/container.ts`: `buildContainer(client?)` cablea role repo + `PermissionService` + `authorize`. Crece por endpoint, no especula. |
| Endpoint | `GET /api/finanzas/me` → `{ userId, roles }` (prueba de auth + RBAC). |
| Env | `SUPABASE_SERVICE_ROLE_KEY` en `.env.example` (server-only). |
| Tests | `resolveActor` con cliente falso (401 sin token, userId con token válido). |

## 4. Alcance excluido (siguientes slices)

- UI React de finanzas (las 7 pantallas E5-01..E5-07).
- Endpoints de negocio (obligaciones, pagos, cierres, etc.) y sus mutaciones.
- Cambio del workflow de deploy (`deploy.yml` GitHub Pages → Vercel): se hace en paralelo, no en este slice.
- CORS/gestión de sesión por cookies (por ahora `Authorization: Bearer <token>`).

## 5. Contratos

```ts
// auth.ts
export async function resolveActor(supabase: SupabaseClient, token: string | null): Promise<UserId | null>;
export function commandContext(userId: UserId, idempotencyKey: string, now?: string): CommandContext;

// container.ts
export function buildContainer(client?: SupabaseClient): {
  supabase: SupabaseClient;
  roles: RoleRepository;
  authorize: Authorizer;
};
```

Endpoint: `GET /api/finanzas/me` → `200 { userId, roles: RoleCode[] }` | `401 { error: 'UNAUTHENTICATED' }`.

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `astro.config.mjs` | Agregar `adapter: vercel()` + `output: 'hybrid'`. |
| `package.json` | Agregar `@astrojs/vercel@^7`. |
| `src/finanzas/presentation/auth.ts` | Crear. |
| `src/finanzas/presentation/container.ts` | Crear. |
| `src/pages/api/finanzas/me.ts` | Crear. |
| `.env.example` | Agregar `SUPABASE_SERVICE_ROLE_KEY`. |
| `src/finanzas/presentation/__tests__/auth.test.ts` | Crear. |

## 7. Criterios de aceptación

- `npm run test` pasa; `npm run typecheck` pasa; `npm run build` produce build SSR sin error.
- `resolveActor` devuelve `null` sin token y `userId` con token válido (testeado con cliente falso).
- Landing y `/prode` siguen estáticos (prerenderizados) — no se modifican sus páginas.

## 8. Riesgos

| Riesgo | Tratamiento |
|---|---|
| `astro build` con Vercel adapter cambia el output (ya no GitHub Pages) | Esperado por decisión B; el workflow se actualiza en slice aparte. |
| `SUPABASE_SERVICE_ROLE_KEY` ausente en el entorno | `createServerSupabaseClient` ya lanza error claro; agregar var en Vercel antes de operar. |
| El endpoint lee el token del header `Authorization` | Contrato provisorio; cookies/refresh en slice de UI. |
