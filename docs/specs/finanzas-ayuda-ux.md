# Spec — Ayuda de finanzas: navegación y mobile-first

> Mejora de UX de la docu interna (`/finanzas/ayuda`). No se toca contenido ni lógica de auth.

## 1. Problema

La wiki de ayuda es navegable en escritorio (sidebar) pero en móvil queda **sin navegación**: la sidebar está `hidden md:block`, no hay menú, ni "volver", ni prev/next. Además las tablas de markdown desbordan en pantallas chicas (rompen el layout).

## 2. Objetivo

- Menú de navegación en móvil (drawer/dropdown con la lista de artículos) + "← Finanzas" siempre visible.
- Tablas con scroll horizontal en móvil.
- Prev/next al final de cada artículo.
- Reusar un único componente de nav (sidebar escritorio + menú móvil).

## 3. Alcance incluido / excluido

**Incluido:** navegación móvil, scroll de tablas, prev/next, extraer la nav a un componente.

**Excluido:** cambiar contenido de los artículos, búsqueda, cambios en `/finanzas` (app) ni en la wiki de Prode.

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `src/components/AyudaNav.astro` | Crear. Renderiza las listas "Conceptos" y "Recetas" (con estado activo). |
| `src/components/AyudaLayout.astro` | Header sticky móvil (← Finanzas + `<details>` "Índice"), sidebar escritorio reusa `AyudaNav`, CSS de tablas con `overflow-x: auto`, ocultar marker del `<summary>`. |
| `src/pages/finanzas/ayuda/[...slug].astro` | Prev/next al final del artículo (orden: conceptos → recetas). |

## 5. Criterios de aceptación

- En móvil: header sticky con "← Finanzas" y menú "Índice" que lista conceptos y recetas.
- Tablas no desbordan (scroll horizontal) en 360px.
- Prev/next navega entre artículos; sin prev en el primero ni next en el último.
- `npm run typecheck` y `npm run build` pasan.

## 6. Riesgos

| Riesgo | Tratamiento |
|---|---|
| Dropdown `<details>` no cierra al tocar fuera | Es navegación full-page (cada link recarga), se cierra al navegar o al re-tocar "Índice". |
| `display: block` en tablas rompe layout | Solo aplica `overflow-x: auto`; las filas mantienen table layout interno. |
