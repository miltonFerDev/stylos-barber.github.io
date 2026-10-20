# Spec — Sistema financiero sprint 26: design system UI (mobile-first + tipografía grande)

> Rediseño visual de la mini-app `/finanzas` con paleta propia (independiente de la landing) y
> prioridad en mobile-first y resiliencia a fuentes grandes (usuarios con "letras grandes" del teléfono).

## 1. Problema

La UI de finanzas reutiliza los tokens oscuros de la landing (`bg-primary`, `text-textLight`, acento índigo) y usa patrones que se rompen con fuentes grandes: `truncate`, `text-xs`, filas `flex justify-between` sin wrap, inputs con fuente < 16px (que disparan auto-zoom en iOS).

## 2. Objetivo

- Paleta clara de alto contraste, propia de finanzas, separada de la web.
- Tipografía y layout que **refluyan sin recortarse** al escalar la fuente.
- Mobile-first (single column, botones full-width, targets ≥48px).

## 3. Design tokens (nuevos, en Tailwind)

| Token | Valor | Uso |
|---|---|---|
| `finBg` | `#F5F7FA` | fondo |
| `finSurface` | `#FFFFFF` | tarjetas/superficies |
| `finBorder` | `#E2E8F0` | bordes |
| `finText` | `#0F172A` | texto principal |
| `finMuted` | `#475569` | texto secundario |
| `finAccent` | `#0F766E` | acción primaria |
| `finAccentHover` | `#115E59` | hover |
| `finPositive` | `#15803D` | dinero entrante/éxito |
| `finDanger` | `#B91C1C` | vencido/error |

## 4. Reglas de accesibilidad (obligatorias)

- Inputs/selects/textarea con `text-base` (16px) mínimo.
- Prohibido `truncate` y `whitespace-nowrap` en texto de datos; usar `break-words` + `min-w-0` en hijos flex.
- `min-h` en botones/filas (nunca `h` fijo que recorte al crecer la fuente).
- Botones `min-h-12` (48px) y full-width en mobile.
- Contraste ≥ 4.5:1 (texto `#0F172A` y muted `#475569` sobre blanco).
- El estado "vencido" no se comunica solo con color (label + ícono/símbolo).

## 5. Archivos

| Archivo | Cambio |
|---|---|
| `tailwind.config.mjs` | Agregar tokens `fin*`. |
| `src/pages/finanzas.astro` | Body con `bg-finBg text-finText`. |
| `src/finanzas/ui/FinanzasShell.tsx` | Nav clara, tabs con target táctil, mobile-first. |
| `src/finanzas/ui/Login.tsx` | Paleta nueva, inputs 16px, botón full-width. |
| `src/finanzas/ui/TableroDireccion.tsx` | Tarjetas claras, filas que wrappean. |
| `src/finanzas/ui/AgendaTesorería.tsx` | Badges de prioridad con texto (no solo color), wrap. |
| `src/finanzas/ui/AltaObligacion.tsx` | Form claro, inputs 16px, labels legibles. |

## 6. Criterios de aceptación

- `npm run test` / `typecheck` / `build` pasan.
- No se usa `truncate`/`whitespace-nowrap` en las pantallas de finanzas.
- Inputs/selects con `text-base`.
- La landing, `/prode` y `/escuela` no cambian (tokens nuevos, no se tocan los viejos).
- La UI funciona en 375px y con texto escalado (reflow, sin recortes).

## 7. Riesgos

| Riesgo | Tratamiento |
|---|---|
| Tocar tokens de la landing | Se agregan tokens `fin*` nuevos; no se modifican los existentes. |
| Demasiadas primitivas/componentes nuevos | Se usan clases Tailwind directas (sin librería de componentes nueva) para no sobredimensionar. |
