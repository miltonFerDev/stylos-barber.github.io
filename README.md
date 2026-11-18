# Stylo's Barber — sitio + mini-apps

Web de **Stylo's Barber** (barbería en Ituzaingó, Buenos Aires). Un solo repo que contiene la landing pública y dos mini-apps: **Prode Mundial 2026** y **Finanzas** (tesorería interna).

## Mapa de la app

| Ruta | Qué es | Tipo | Acceso |
|---|---|---|---|
| `/` | Landing de la barbería (servicios, beneficios, FAQ, contacto) | Astro estático | Público |
| `/cortes` | Galería de cortes — "Próximamente" | Astro estático | Público |
| `/escuela` | Escuela Stylo's — "Próximamente" + formulario | Astro estático (Formspree) | Público |
| `/prode` | Prode Mundial 2026 (SPA con react-router) | React `client:only` | Público (login Google) |
| `/finanzas` | Tesorería interna (tablero, pagos, comisiones, inversiones…) | React `client:only` · **PWA instalable** | Privado (email/password) |
| `/finanzas/ayuda` | Wiki de ayuda de finanzas | Astro (content collection) | Privado |
| `/api/finanzas/*` | API interna (serverless en Vercel) | Astro endpoints | Privado (Bearer) |

## Stack

- **Astro 5** + **React 18** + **TypeScript** + **Tailwind CSS**
- **Supabase** (auth, base de datos, RLS, storage)
- **Vercel** (adapter `@astrojs/vercel`, serverless functions + cron)
- **Vitest** (tests de dominio y aplicación)

## Estructura del repo

```text
src/
  components/            # Astro components (landing + escuela + analítica)
    layout/              #   secciones de la landing
    escuela/             #   secciones de la escuela
  pages/                 # rutas
    index.astro          #   landing
    cortes.astro         #   /cortes
    escuela.astro        #   /escuela
    prode.astro          #   /prode (+ prode/[...path].astro)
    finanzas.astro       #   /finanzas
    finanzas/ayuda/      #   /finanzas/ayuda (wiki)
    api/finanzas/        #   API serverless
  config/site.ts         # FRESHA_BOOKING_URL y constantes compartidas
  lib/                   # analytics (GA4), supabase (site settings), cortes
  styles/                # CSS global (Tailwind)
  prode/                 # mini-app Prode (domain, services, hooks, pages, components)
  finanzas/              # mini-app Finanzas (domain, application, presentation, ui)
  content/
    cortes/              #   galería de cortes (markdown)
    ayuda/               #   wiki de finanzas (markdown)
supabase/migrations/     # migraciones 001–035
docs/                    # documentación (ver docs/README.md)
public/                  # estáticos (íconos, manifest, service worker de finanzas)
```

### Las dos mini-apps comparten arquitectura por capas

- **`prode/`**: `domain/` (lógica pura + tests) · `services/` · `repositories/` · `hooks/` · `pages/` · `components/` · `config/` · `data/`.
- **`finanzas/`**: `domain/` (lógica pura + tests) · `application/` (servicios) · `repositories/` · `presentation/` (HTTP + auth) · `ui/` (React).

Regla: los componentes visuales **no** consultan Supabase ni calculan puntajes/saldos; eso vive en domain/services. Las queries viven en repositories.

## Setup

1. Clonar e instalar:
   ```sh
   npm install
   ```
2. Copiar `.env.example` a `.env` y completar:
   ```sh
   PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   FORMSPREE_ENDPOINT_ESCUELA=https://formspree.io/f/...
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   ```
   - `CRON_SECRET` se setea solo en Vercel (protege el cron de depreciación).
3. Levantar en dev:
   ```sh
   npm run dev      # localhost:4321
   ```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Dev server en `localhost:4321` |
| `npm run build` | `astro check` + build de producción |
| `npm run typecheck` | Verificación de tipos (`astro check`) |
| `npm run test` | Tests unitarios (Vitest) |
| `npm run preview` | Previsualizar el build local |

## Supabase

- Migraciones en `supabase/migrations/` (001–035), dos dominios:
  - **Prode** (001–015): `profiles`, `matches`, `predictions` + views `public_aliases`, `rankings`.
  - **Landing** (016): `site_settings` (precios remotos de Servicios).
  - **Finanzas** (017–035): esquema contable/tesorería (29+ tablas) + RLS + bucket de adjuntos.
- La seguridad real vive en **RLS**, no en la UI. Acciones admin protegidas por `is_admin()`.

## Deploy

**Vercel** → `stylosbarber.com.ar`. Push a `main` dispara el deploy.

- `vercel.json`: rewrite de `/prode/:match*` → `/prode/index.html` y **cron** mensual `GET /api/finanzas/depreciacion` (depreciación automática, protegida por `CRON_SECRET`).
- Repo en GitHub (`miltonFerDev/stylos-barber.github.io`).

## Analytics (GA4)

Tracking declarativo con `data-analytics-*` + un listener global en `GoogleAnalytics.astro`. Eventos nuevos en minúsculas + guion bajo; los legacy (`click:turno`, etc.) se disparan en paralelo. Ver `src/lib/analytics.ts` y `agents.md` para el diccionario completo.

## Documentación

- **Cómo usar la app** (manual de usuario): [`docs/guia-de-uso.md`](docs/guia-de-uso.md).
- **Índice técnico** por área: [`docs/README.md`](docs/README.md). Los specs de finanzas y el diseño contable viven en `docs/specs/` y `docs/diseno-financiero/`.
