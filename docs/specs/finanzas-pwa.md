# Spec — Finanzas instalable (PWA)

> Hacer `/finanzas` instalable como PWA (scope `/finanzas`), sin tocar la landing ni `/prode`.

## 1. Problema

`/finanzas` es una mini-app interna de uso frecuente pero no es instalable. Ya existen HTTPS (Vercel) y los iconos (`android-chrome-192/512`, `apple-touch-icon`). Falta un manifest real, un service worker y linkearlos.

## 2. Objetivo

- Manifest con `start_url` y `scope` = `/finanzas`, `display: standalone`.
- Service worker con `fetch` handler que cachea **solo el shell estático** (HTML/JS/CSS).
- Registrar el SW y linkear el manifest desde `finanzas.astro`.

## 3. Alcance incluido / excluido

**Incluido:** manifest scoped a `/finanzas`, SW de shell, registro en el `<head>`, meta de iOS (`apple-mobile-web-app-*`).

**Excluido:** cache de datos (`/api/finanzas/*` y Supabase quedan sin cachear — son sensibles y autenticados), offline de datos, PWA de la landing o de `/prode`, corrección del `site.webmanifest` vacío de la raíz (queda como deuda, no bloquea).

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `public/finanzas/manifest.webmanifest` | Crear. `name` "Stylo's Finanzas", `scope`/`start_url` `/finanzas`, iconos existentes, `theme_color` `#0F766E`, `background_color` `#F5F7FA`. |
| `public/finanzas/sw.js` | Crear. Cache del shell, `fetch` handler cache-first, skip `/api/` y orígenes externos (Supabase). |
| `src/pages/finanzas.astro` | Linkear manifest + meta iOS + script `is:inline` que registra el SW. Ajustar `theme-color` a `#F5F7FA` (fondo claro). |

## 5. Criterios de aceptación

- `/finanzas/manifest.webmanifest` sirve JSON válido con los 2 iconos y scope `/finanzas`.
- `/finanzas/sw.js` se registra sin error y cachea `/finanzas/` en la primera carga.
- No se cachea ninguna respuesta de `/api/*`.
- Lighthouse PWA: "Installable" pasa (Android/desktop); iOS queda manual (Añadir a pantalla de inicio).
- `npm run typecheck` y `npm run build` pasan.

## 6. Riesgos

| Riesgo | Tratamiento |
|---|---|
| Cachear datos financieros | El SW excluye `/api/` y orígenes externos; solo cachea el shell. |
| Scope incorrecto (instalaría toda la web) | Manifest y SW viven bajo `public/finanzas/`, por lo que el scope queda en `/finanzas`. |
| `site.webmanifest` vacío de la raíz | No se usa; queda como deuda a limpiar después. |
