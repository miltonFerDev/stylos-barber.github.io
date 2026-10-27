# Spec — Sistema financiero sprint 37: wiki de uso (ayuda)

> Guía de uso de la mini-app de finanzas, detrás del login, para que quien la abra aprenda a operar y no cometa errores de registro.

## 1. Problema

La app tiene conceptos contables no triviales (cuenta corriente vs préstamo vs aporte, retiro vs gasto, capitalizar vs gasto, cierre teórico vs real, reversión vs edición). Sin una guía, el usuario va a registrar mal.

## 2. Objetivo

Una **wiki en Markdown** (Content Collections de Astro) accesible en `/finanzas/ayuda`, **detrás del login**, con dos secciones en el primer corte: **Conceptos** y **Recetas**.

## 3. Alcance incluido

- Colección `ayuda` en `src/content/config.ts`.
- Contenido: 5 conceptos + 4 recetas (solo operaciones expuestas hoy en UI).
- Ruta `/finanzas/ayuda/[...slug]` + índice, con sidebar agrupado por sección.
- Gate de sesión client-side (reusa `finanzasSupabase`).
- Link "Ayuda" en el nav de `FinanzasShell`.

## 4. Alcance excluido

- Recetas de operaciones sin UI aún (retiro, inyección, inversiones) — se agregan cuando se expongan.
- Ayuda contextual campo por campo (fase 2).
- Pantallas detalladas (fase posterior; el primer corte es Conceptos + Recetas).

## 5. Decisiones

| # | Decisión | Resolución |
|---|---|---|
| 1 | Ubicación | `/finanzas/ayuda` (dentro del área autenticada), no en la landing. |
| 2 | Auth | Gate **client-side** (la sesión vive en localStorage, no cookies). La wiki no expone datos, así que es guard de UX, no de seguridad. |
| 3 | Contenido | Markdown en `src/content/ayuda/`, separado de `docs/` (esos son specs de desarrollo). |
| 4 | Primer corte | Conceptos (reglas de negocio) + Recetas (operaciones actuales). |
| 5 | Render | Astro `render(entry)` + estilos prose mínimos (sin dependencias nuevas). |

## 6. Estructura del contenido

**Conceptos** (`section: 'conceptos'`):
1. `cuenta-corriente-prestamo-aporte` — la diferencia entre los tres `nature`.
2. `retiro-vs-gasto-vs-sueldo` — el error clásico.
3. `capitalizar-vs-gasto` — umbral P-CAP.
4. `periodo-contable` — abierto/en revisión/cerrado.
5. `reversion-vs-edicion` — no se edita, se revierte.

**Recetas** (`section: 'recetas'`):
1. `registrar-pago` — pago aplicado o egreso directo.
2. `cierre-diario` — teórico vs real + resolución de diferencias.
3. `alta-obligacion` — crear una obligación.
4. `revertir-pago` — revertir un pago confirmado.

Cada receta termina con **"⚠️ Errores comunes"**.

## 7. Archivos

| Archivo | Cambio |
|---|---|
| `src/content/config.ts` | Colección `ayuda` (`title`, `section`, `order`, `description?`). |
| `src/content/ayuda/*.md` | 9 páginas (5 conceptos + 4 recetas). |
| `src/pages/finanzas/ayuda/index.astro` | Índice (ToC agrupado). |
| `src/pages/finanzas/ayuda/[...slug].astro` | Página con sidebar + contenido. |
| `src/finanzas/ui/AyudaGate.tsx` | Guard de sesión (React island). |
| `src/finanzas/ui/FinanzasShell.tsx` | Link "Ayuda" en el nav. |

## 8. Criterios de aceptación

- `npm run typecheck` / `lint` / `build` pasan.
- `/finanzas/ayuda` lista los conceptos y recetas agrupados.
- Cada `/finanzas/ayuda/<slug>` renderiza el Markdown con sidebar.
- Sin sesión → se muestra "Iniciá sesión" con link a `/finanzas` (contenido oculto).
- Con sesión → contenido visible.

## 9. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| Contenido desactualizado al cambiar reglas | Se versiona en git junto al código; actualizar en el mismo commit. |
| Gate client-side no es seguridad real | Aceptado: la wiki no expone datos financieros, solo instrucciones. |

## 10. Rollback

Eliminar la colección `ayuda`, las rutas `/finanzas/ayuda/*`, el `AyudaGate` y el link del nav.
