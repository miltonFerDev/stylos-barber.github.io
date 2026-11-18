# Índice de documentación

Mapa de toda la app y dónde está documentada cada parte.

> **¿Querés saber cómo usar la app?** → [`guia-de-uso.md`](guia-de-uso.md) (manual de usuario, lenguaje simple). Este índice es para quien desarrolla o mantiene.

## 1. Landing (`/`)

Página principal de la barbería. Secciones: Hero, Beneficios, Servicios, Testimonios, Escuela (teaser), DondeEstamos, FAQ.

- **Estructura y componentes:** descritos en [`agents.md`](../agents.md) (tabla de secciones, componentes `src/components/layout/`, cambios recientes).
- **Precios remotos:** [`specs/actualizar-precios-remoto.md`](specs/actualizar-precios-remoto.md) — precios de Servicios leídos de `site_settings` en Supabase (migración `016`).
- **Tracking GA4:** [`agents.md`](../agents.md) §Sistema de tracking.

## 2. Escuela (`/escuela`)

Landing "Próximamente" + formulario de inscripción (Formspree). Componentes en `src/components/escuela/`.

> Sin spec dedicado todavía. La regla de producto es: **Escuela Stylo's no se implementa aún** (rechazado), solo existe el teaser/landing. Ver [`agents.md`](../agents.md).

## 3. Cortes (`/cortes`)

Galería "Próximamente". Los cortes viven en `src/content/cortes/` (markdown, sin usar por la página todavía).

> Sin spec dedicado. Página placeholder; la galería real está pendiente.

## 4. Prode (`/prode`)

Mini-app del Prode Mundial 2026 (SPA React con react-router). Arquitectura por capas en `src/prode/`.

- **Arquitectura, decisiones cerradas y reglas de scoring/locking:** [`agents.md`](../agents.md) §Feature Prode Mundial 2026.
- **Cierre del torneo (finalización):** [`specs/prode-finalization.md`](specs/prode-finalization.md).
- **Grupo "3er puesto + Final":** [`specs/prode-final-stage-group.md`](specs/prode-final-stage-group.md) (migración `015`).
- **Fixture real (104 partidos):** `src/prode/data/fixture-world-cup-2026.ts` + migración `009`.

## 5. Finanzas (`/finanzas`)

Mini-app de tesorería interna (React `client:only`, PWA instalable). La parte **mejor documentada** del repo.

- **Checkpoint / estado actual:** [`CHECKPOINT.md`](CHECKPOINT.md) — feature-complete, tests, pendientes, límites conocidos.
- **Diseño contable (D1–D9):** [`diseno-financiero/README.md`](diseno-financiero/README.md) — índice de ER, plan de cuentas, matriz de contabilización, contratos de dominio, prototipos, seguridad, previsión, migración, pruebas y backlog.
- **Specs incrementales (sprints 1–42):** [`specs/sistema-financiero-*.md`](specs/) — fundaciones, dominio, endpoints, UI, RLS, reversibilidad, comisiones, etc.
- **Decisiones de negocio:** [`specs/sistema-financiero-cierre-decisiones-negocio.md`](specs/sistema-financiero-cierre-decisiones-negocio.md) y [`specs/sistema-financiero-e8-cierre-decisiones.md`](specs/sistema-financiero-e8-cierre-decisiones.md).
- **Auditoría UX (heurísticas):** [`specs/sistema-financiero-audit-ux-heuristicas.md`](specs/sistema-financiero-audit-ux-heuristicas.md).
- **PWA instalable:** [`specs/finanzas-pwa.md`](specs/finanzas-pwa.md).

## 6. API (`/api/finanzas/*`)

Endpoints serverless (Vercel). La lista completa vive en `src/pages/api/finanzas/` y cada spec de sprint documenta sus endpoints.

## 7. Supabase / migraciones

- Migraciones en `supabase/migrations/` (001–035).
- **Prode (001–015):** tablas `profiles`/`matches`/`predictions`, views `public_aliases`/`rankings`, RLS.
- **Landing (016):** `site_settings` (precios remotos).
- **Finanzas (017–035):** esquema contable + RLS (`018`), seed de maestros, comisiones, depreciación, adjuntos (`029`).
- **RLS esperado y hardening:** [`agents.md`](../agents.md) §Estado esperado de Supabase y §Hardening de seguridad.

## 8. Analytics (GA4)

- [`agents.md`](../agents.md) §Sistema de tracking GA4 — listener global, diccionario de eventos, dual-fire legacy.
- `src/lib/analytics.ts` — constantes tipadas.

## 9. Deploy

- **Vercel** (`@astrojs/vercel`). Rewrites y cron en `vercel.json`.
- Detalle en el [`README.md`](../README.md#deploy).

## 10. Seguridad

- [`diseno-financiero/seguridad.md`](diseno-financiero/seguridad.md) — arquitectura de seguridad de finanzas.
- [`agents.md`](../agents.md) §Hardening de seguridad — `is_admin()`, `profiles_update_own` con `WITH CHECK`, reglas de RLS.

## 11. Flujo de trabajo

[`agents.md`](../agents.md) define el flujo del repo (Audit → Plan → Spec → Apply → Verify), convenciones, heurísticas de usabilidad y modelos por agente.

## 12. Futuro

- [`recepcion-virtual/viabilidad.md`](recepcion-virtual/viabilidad.md) — análisis de viabilidad de la recepción virtual (próxima feature).

---

## Gaps conocidos

- Landing, `/escuela` y `/cortes` no tienen spec dedicado (solo `agents.md`). Si crecen, conviene un `docs/specs/landing-*.md` por sección.
- La galería de `/cortes` tiene contenido (`src/content/cortes/`) pero la página es placeholder.
- `agents.md` aún menciona deploy a GitHub Pages; el deploy real es Vercel (ver README §Deploy).
