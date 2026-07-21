# Spec: Finalización del Prode Mundial 2026

## Estado

Aprobado por plan — el plan cerró las decisiones clave (D1–D8). Listo para `apply`.

## Objetivo

El Mundial 2026 finalizó y el prode del sitio Stylo's Barber necesita un cierre limpio: dejar de promover la navegación activa del prode desde la landing, transformar `/prode` en un **dashboard final público** con la tabla general final y estadísticas globales, redirigir todas las subrutas internas al dashboard y preservar intacta la data y el acceso admin en el backend (Supabase/RLS). El objetivo es dar cierre formal al juego sin borrar nada y sin congelar al dueño.

## Decisiones cerradas

| # | Decisión | Resolución |
|---|----------|-----------|
| D1 | Auth en `/prode` | **Quitar** — página 100% pública, sin `AuthProvider` / `ProfileProvider` / guards (`AuthGuard`, `ProfileGuard`, `AdminGuard`) |
| D2 | Rutas internas | **Redirigir todas a `/prode/`** vía `<Navigate to="/" />` en la SPA: `fixture`, `predicciones`, `ranking`, `reglas`, `admin`, `onboarding`, `login`, `signup`, `reset-password` → `/` |
| D3 | `ProdeNav` | Reducir a marca (logo + nombre corto) + link "Volver a Stylo's Barber" (sin items internos, sin auth/usuario) |
| D4 | Total de predicciones | **Snapshot hardcodeado al cierre** — constante en código, no viaja a Supabase |
| D5 | Premio final | NO mencionar el monto del premio en el dashboard final (evita citar la discrepancia `$50.000` vs `$100.000`) |
| D6 | Admin post-cierre | El dueño conserva acceso admin — **no freeze RLS, no drop policies admin**. PERO la ruta UI `/prode/admin` se redirige a `/prode/` según D2. Gestión tardía vía panel Supabase si se requiere |
| D7 | `DashboardPage` viejo | **Reemplazar** por nuevo `FinalDashboardPage.tsx`; borrar el viejo `DashboardPage.tsx` |
| D8 | Tracking | Disparar `page_view` de `/prode` (migrar `sendPageView` de `false` a `true` en `prode.astro`) + evento nuevo `prode_final_view` |

## Alcance

### Incluido

- Quitar el link ⚽ Prode 2026 del menú mobile y desktop de la landing (`Navigation.astro`).
- Reescribir `ProdeShell.tsx` como SPA pública con una sola ruta `("/", FinalDashboardPage)` + redirects de todas las subrutas.
- Reemplazar `DashboardPage.tsx` por `FinalDashboardPage.tsx`.
- Simplificar `ProdeNav.tsx` (marca + link "Volver a Stylo's Barber").
- Crear componentes de presentación del dashboard final en `src/prode/components/dashboard/` (`FinalRankingTable`, `FinalStatsCard`, `FinalMessageCard`).
- Crear servicio `final-stats.service.ts` que combine `rankingService.getRankings()` + el snapshot hardcodeado + sumas de exactos/parciales.
- Agregar constante de snapshot en `src/prode/config/` (ver RT9).
- Actualizar SEO (title, description, canonical, og, twitter) en `prode.astro` y `[...path].astro`.
- Migrar `sendPageView` a `true` en `prode.astro` y disparar evento `prode_final_view`.
- Mantener el `FreshaCTA` como CTA secundario al pie del dashboard final.

### Excluido

- **No borrar datos**: `profiles`, `matches`, `predictions` quedan intactos en Supabase.
- **No congelar RLS admin**: no se dropean policies admin, no se modifica `is_admin()`.
- **No mencionar premio final ni ganador** en el dashboard.
- **No crear migration nueva** (ver "Migration / Supabase").
- **No agregar RPC nueva** ni alterar views `rankings` / `public_aliases`.
- **No tocar la landing principal** (`src/pages/index.astro`, `Hero`, `Beneficios`, `Servicios`, etc.) — solo `Navigation.astro`.
- **No tocar** `sync-matches`, `fixture-world-cup-2026.ts`, `competition.ts.prizes`.
- **No reconstruir el snapshot automáticamente**: es estático al cierre.

## Requisitos funcionales

- **RF1 — Quitar link del menú**
  Quitar el `<li><a href="/prode">⚽ Prode 2026</a></li>` del menú mobile (`src/components/layout/Navigation.astro:36`) y del desktop (`Navigation.astro:46`). Criterio: al renderizar la landing no aparece ninguna referencia al prode en el nav.

- **RF2 — URL `/prode` muestra dashboard final**
  La ruta `/prode` renderiza el dashboard final público, sin auth, sin guards. Criterio: usuario anónimo entra a `/prode` y ve la pantalla completa (sin redirección a login, sin `ProfileGuard`).

- **RF3 — Tabla general final del ranking**
  Se muestra la tabla completa del ranking general (todos los participantes con al menos 1 predicción), ordenada por puntos (descendente) y desempate según `buildRanking` (`src/prode/domain/logic/ranking.ts`). Datos desde `rankingService.getRankings()` (view `rankings`). Criterio: la tabla muestra tantos renglones como participantes haya con `points >= 0` y `alias` no nulo.

- **RF4 — Total de predicciones globales (snapshot)**
  Se muestra un número entero fijo tomado de la constante `FINAL_TOTAL_PREDICTIONS` (ver RT9), representando el `count(*)` de la tabla `predictions` al cierre. Criterio: el valor se hardcodea una sola vez en código; no se ejecuta query a Supabase para este número.

- **RF5 — Aciertos perfectos totales**
  Se muestra `Σ entry.exactPredictions` sobre el array devuelto por `rankingService.getRankings()`. Criterio: el número coincide con la suma de `exact_predictions` de la view `rankings` (3 pts c/u).

- **RF6 — Aciertos parciales totales**
  Se muestra `Σ entry.correctWinners` sobre el array devuelto por `rankingService.getRankings()`. Criterio: ya son **parciales puros** (no incluyen exactos) según `calculateUserStats` en `src/prode/services/ranking.service.ts:37-38` (`if (pts === 3) exactPredictions++; else if (pts === 1) correctWinners++;`). No sumar nada más.

- **RF7 — Mensaje de cierre literal**
  Se muestra el texto literal: `Gracias por participar con nosotros, a Stylo's Barber lo engrandece su comunidad` en el bloque de cierre del dashboard. Criterio: el string aparece idéntico (mayúsculas/minúsculas, coma, sin punto final extra).

- **RF8 — Redirección de subrutas a `/prode/`**
  Todas las subrutas internas redirigen a `/` (relativo al `basename="/prode"`): `login`, `signup`, `reset-password`, `onboarding`, `fixture`, `predicciones`, `ranking`, `reglas`, `admin` y `*` (catch-all). Criterio: al navegar manualmente a `/prode/admin`, `/prode/fixture`, etc., la URL termina en `/prode/` y se renderiza el dashboard final.

- **RF9 — No exponer datos privados**
  El dashboard solo consume la view pública `rankings` (alias, points, exact_predictions, correct_winners). No se leen `profiles`, `predictions` ni `matches` directamente desde el componente. Criterio: ninguna query a `profiles`, `predictions` o `matches` aparece en `FinalDashboardPage` ni en `final-stats.service.ts`. Solo `rankings` view.

- **RF10 — Mantener `FreshaCTA` como CTA secundario**
  El componente `FreshaCTA` (`src/prode/components/dashboard/FreshaCTA.tsx`) se incrusta al pie del dashboard final, sin cambios en su implementación. Criterio: el CTA de reserva Fresha aparece visible y dispara `trackEvent('click_prode_reservar', { location: 'prode_dashboard' })` como hoy.

- **RF11 — SEO actualizado**
  `src/pages/prode.astro` y `src/pages/prode/[...path].astro` actualizan `title`, `meta description`, `og:*`, `twitter:*` a: `Resultados finales del Prode Mundial 2026 · Stylo's Barber`. Canonical sigue `https://stylosbarber.com.ar/prode`. Criterio: ambas páginas Astro etiquetan el nuevo título y descripción.

- **RF12 — Tracking**
  `prode.astro` migra `sendPageView={false}` → `sendPageView={true}` para disparar `page_view` de `/prode` (GA4 base). Además, `FinalDashboardPage` dispara en `useEffect` (una vez por monteo) el evento `prode_final_view` con params `{ total_predictions, exact_total, partial_total, participants }`. Criterio: ambos eventos aparecen en GA Debug al cargar `/prode`. **Sin PII** (sin alias, sin user_id, sin emails).

- **RF13 — Admin del dueño se preserva**
  No se dropean ni modifican policies admin (`profiles_admin_*`, `predictions_admin_all`, `matches_admin_*`). No se modifica `is_admin()`. Criterio: `npm run typecheck` pasa y no hay edits en `supabase/migrations/`.

## Requisitos técnicos

- **RT1 — `ProdeShell` simplificado**
  `src/prode/components/layout/ProdeShell.tsx`: router con `BrowserRouter basename="/prode"` conteniendo una sola `Route path="/"` (element `<FinalDashboardPage />`) y una `Route path="*"` que renderiza `<Navigate to="/" replace />`. Quitar todas las demás rutas y los lazy imports de páginas obsoletas.

- **RT2 — Quitar providers y guards**
  Eliminar del JSX de `ProdeShell`: `AuthProvider`, `ProfileProvider`, `AuthGuard`, `ProfileGuard`, `AdminGuard`. Conservar `ErrorBoundary` y `Suspense` con fallback `BallLoader`. Quitar `trackPageView` del hook interno `usePageViews` (la página principal se trackea con `sendPageView={true}` y `prode_final_view`).

- **RT3 — `ProdeNav` reducido**
  `src/prode/components/layout/ProdeNav.tsx`: reescribir como header sticky simple con (a) logo `copa.jpg` + `worldCup2026.shortName` a la izquierda (link interno a `/`), y (b) a la derecha link `<a href="/">Volver a Stylo's Barber</a>` (link absoluto a la home, NO `react-router` `Link`). Quitar `navItems`, `useAuth`, `useProfile`, `AuthButtons`, `UserProfile`, lógica de admin, menú mobile. Same breakpoint `md:` que hoy.

- **RT4 — `FinalDashboardPage.tsx`**
  Crear `src/prode/pages/FinalDashboardPage.tsx` (exportación nombrada `FinalDashboardPage`). **Borrar** `src/prode/pages/DashboardPage.tsx`. La página:
  1. `useEffect` inicial: llama a `getFinalStats()` (ver RT6), setea estado `loading`, `error`, `stats`.
  2. `useEffect` secundario (cuando `stats` listo): dispara `trackEvent('prode_final_view', { total_predictions, exact_total, partial_total, participants })`.
  3. Render layout descrito en "UI propuesta".
  4. Importa `FreshaCTA` y lo renderiza al final sin cambios.

- **RT5 — Componentes nuevos en `src/prode/components/dashboard/`**
  - `FinalStatsCard.tsx` — primitiva reutilizable: props `{ label, value, accent }`, card con número grande + label chico.
  - `FinalRankingTable.tsx` — tabla de ranking. **Evaluar reutilizar** `RankingTable` de `RankingPage.tsx:12-77`: hoy está inline en la página y recibe `highlightAlias` (innecesario aquí). **Decisión RT5**: NO extraer el componente viejo (mantener `RankingPage.tsx` intacto por), crear `FinalRankingTable.tsx` nuevo y simplificado: props `{ entries: RankingEntry[] }` (sin `highlightAlias`), columnas `#`, Alias, Puntos, Exactos, Parciales (ver "UI propuesta"). Reutiliza el estilo de los medallas 🥇🥈🥉 para top 3.
  - `FinalMessageCard.tsx` — props `{ message: string }`, card destacada con el texto literal del cierre.

- **RT6 — Servicio `final-stats.service.ts`**
  Crear `src/prode/services/final-stats.service.ts`:
  - Exporta `interface FinalStats { ranking: RankingEntry[]; totalPredictions: number; exactTotal: number; partialTotal: number; participants: number; }`
  - Exporta `async function getFinalStats(): Promise<FinalStats>`:
    1. `const ranking = await rankingService.getRankings();`
    2. `const exactTotal = ranking.reduce((s, e) => s + e.exactPredictions, 0);`
    3. `const partialTotal = ranking.reduce((s, e) => s + e.correctWinners, 0);`
    4. `const totalPredictions = FINAL_TOTAL_PREDICTIONS;` (import de `config/competition.ts`)
    5. `const participants = ranking.length;`
    6. return `{ ranking, totalPredictions, exactTotal, partialTotal, participants }`
  - No toca Supabase directamente más allá de la llamada a `getRankings()`.

- **RT7 — `sendPageView` a `true` en `prode.astro`**
  `src/pages/prode.astro:9`: cambiar `<GoogleAnalytics sendPageView={false} />` → `<GoogleAnalytics sendPageView={true} />`. Mismo cambio en `src/pages/prode/[...path].astro:20` (por consistencia, aunque esas rutas terminen redirigiendo en cliente).

- **RT8 — `prode/[...path].astro` getStaticPaths mínima**
  `src/pages/prode/[...path].astro`: mantener como catch-all de Astro para cualquier subruta que un usuario pueda tener en su historial. La `getStaticPaths` actual lista 6 paths (`admin, fixture, predicciones, ranking, reglas, onboarding`); **extender** con `login, signup, reset-password` para que todas las subrutas历史icas resuelvan HTML y el SPA las redirija en cliente. Detalle: cada uno renderiza el mismo `<ProdeShell client:only="react" />`, y el router SPA (`path="*"` con `<Navigate>`) las manda a `/` en runtime. NOTA: si el build de Astro falla por rutas estáticas que el router ya cubre con `path="*"`, también considerar `<Route path="*" element={<Navigate to="/" replace />} />` como catch-all único — el router SPA ya cubre subrutas no pre-renderizadas en `client:only` (no hay hydration mismatch porque el shell se monta post-carga).

- **RT9 — Constante de snapshot**
  Agregar en `src/prode/config/competition.ts` (al final del objeto `worldCup2026` o como export independiente, ver preferencia del apply):
  ```ts
  export const FINAL_TOTAL_PREDICTIONS = 787; // count(*) FROM predictions al cierre del Mundial 2026
  ```
  Alternativa válida: archivo nuevo `src/prode/config/finalization.ts` con `export const FINAL_TOTAL_PREDICTIONS = 787;` y `export const FINAL_CLOSING_MESSAGE = 'Gracias por participar con nosotros, a Stylo's Barber lo engrandece su comunidad';` (recomendado, mantiene separación de concerns). El apply decide; el spec marca que la constante existe y se importa desde `final-stats.service.ts` y desde `FinalDashboardPage`.

- **RT10 — RLS intacta**
  **NO crear migration nueva**. **No tocar** policies admin (`profiles_admin_select`, `profiles_admin_update`, `predictions_admin_all`, `matches_admin_insert/update/delete`). **No alterar** views `rankings` / `public_aliases`. **No modificar** `is_admin()`. La próxima migration disponible sería `016_*.sql` pero esta feature no la usa.

## Fuente de datos

| Dato | Origen | Campo/función | Comentario |
|------|--------|---------------|------------|
| Ranking general | View `rankings` (Supabase) | `rankingService.getRankings()` | Ordenado por puntos desc. |
| Aciertos perfectos totales | Cálculo en cliente | `Σ entry.exactPredictions` | `entry.exactPredictions` viene de la view `rankings` (columna `exact_predictions`) |
| Aciertos parciales totales | Cálculo en cliente | `Σ entry.correctWinners` | `entry.correctWinners` **ya son parciales puros** (view `rankings`, columna `correct_winners`) |
| Total de predicciones | Constante en código | `FINAL_TOTAL_PREDICTIONS` | Snapshot hardcodeado al cierre; **PENDIENTE cargar valor real** |
| Mensaje de cierre | Constante en código | `FINAL_CLOSING_MESSAGE` (o inline) | Texto literal, sin variantes |
| Participantes | Cálculo en cliente | `ranking.length` | Coincide con cantidad de renglones de la view |

## Cálculo de aciertos

Confirmado contra `src/prode/services/ranking.service.ts:37-38`:

```ts
if (pts === 3) exactPredictions++;
else if (pts === 1) correctWinners++;
```

Es decir, `correctWinners` se incrementa **solo cuando `pts === 1`** (ganador correcto sin resultado exacto). Por lo tanto:

- **Aciertos perfectos totales** = `Σ exactPredictions` (cada uno vale 3 pts, score exacto).
- **Aciertos parciales totales** = `Σ correctWinners` (cada uno vale 1 pt, ganador correcto no exacto).
- **No hay overlap**: un participante no suma a ambos contadores por la misma predicción.

La view `rankings` de Supabase ya refleja esta lógica. No se necesitan queries extra ni RPC.

## UI propuesta — layout del dashboard final

```
[ProdeNav reducido]
  copa.jpg + "Prode Mundial"   ···   "Volver a Stylo's Barber"

<main max-w-2xl>

  <h1>Prode Mundial 2026 — Resultados finales</h1>
  <p text-textMuted>El Mundial terminó. Acá están los resultados finales.</p>

  [Grid 3 columnas en desktop, 1 columna en mobile]
    <FinalStatsCard label="Predicciones totales"  value={totalPredictions} accent="accent" />
    <FinalStatsCard label="Aciertos perfectos"    value={exactTotal}      accent="emerald" />
    <FinalStatsCard label="Aciertos parciales"   value={partialTotal}    accent="amber" />

  <h2>Tabla general final</h2>
  <FinalRankingTable entries={ranking} />
    columnas:  #  |  Alias  |  Puntos  |  Exactos  |  Parciales
    renglones: una por participante
    top 3 con medallas 🥇🥈🥉 en columna #
    scroll vertical si excede viewport

  <FinalMessageCard message=FINAL_CLOSING_MESSAGE />
    card destacada, texto centrado, padding amplio

  <FreshaCTA />
    sin cambios, location="prode_dashboard"

</main>
```

Estado de carga: si `loading === true` mostrar `<BallLoader text="Cargando resultados finales..." />`. Si `error` mostrar `<ErrorMessage>` reutilizando el de `ui/ErrorMessage`. Si `ranking.length === 0` mostrar mensaje "Todavía no hay resultados publicados." (caso borde, no debería pasar post-cierre).

## Tracking

- `page_view` de `/prode` — al migrar `sendPageView={true}` en `prode.astro`, GoogleAnalytics carga GA4 y dispara la primera vista automáticamente.
- `prode_final_view` (evento nuevo, vía `trackEvent` de `src/prode/utils/analytics.ts`): params:
  - `total_predictions: number`
  - `exact_total: number`
  - `partial_total: number`
  - `participants: number`
- Se dispara una sola vez en `FinalDashboardPage` cuando `stats` está listo (deps: `[stats]` en el `useEffect` pero con guard `if (!stats) return;` para no disparar en blanco).
- **Sin PII**: ningún alias, email, teléfono, user_id o nombre real se envía a GA4.
- No se agregan legacy events (no hay dual-fire necesario, es evento nuevo).
- Para registrar el evento en el diccionario de AGENTS.md: agregarlo en la tabla de eventos cuando se actualice ese doc (fuera de scope de este spec pero se menciona como tarea post-apply).

## Archivos a tocar

| Archivo | Acción | Detalle |
|---------|--------|---------|
| `src/components/layout/Navigation.astro` | Editar | Quitar `<li>` línea 36 (mobile) y `<li>` línea 46 (desktop) |
| `src/prode/components/layout/ProdeShell.tsx` | Reescribir | Quitar providers/guards, una sola ruta + catch-all Navigate, eliminar lazy imports obsoletos |
| `src/prode/components/layout/ProdeNav.tsx` | Reescribir | Header simple con marca + link "Volver a Stylo's Barber" |
| `src/prode/pages/DashboardPage.tsx` | **Borrar** | Reemplazado por `FinalDashboardPage.tsx` |
| `src/prode/pages/FinalDashboardPage.tsx` | **Crear** | Nuevo dashboard final |
| `src/prode/components/dashboard/FinalStatsCard.tsx` | **Crear** | Primitiva de stat card |
| `src/prode/components/dashboard/FinalRankingTable.tsx` | **Crear** | Tabla de ranking final (sin `highlightAlias`) |
| `src/prode/components/dashboard/FinalMessageCard.tsx` | **Crear** | Card con mensaje de cierre literal |
| `src/prode/services/final-stats.service.ts` | **Crear** | Combina `getRankings()` + snapshot + sumas |
| `src/prode/config/finalization.ts` | **Crear** (recomendado) o editar `competition.ts` | Constantes `FINAL_TOTAL_PREDICTIONS` y `FINAL_CLOSING_MESSAGE` |
| `src/pages/prode.astro` | Editar | `sendPageView={true}` + actualizar meta/OG/twitter title & description |
| `src/pages/prode/[...path].astro` | Editar | `sendPageView={true}` + actualizar meta + extender `getStaticPaths` con `login`, `signup`, `reset-password` |

## Archivos que NO se tocan

- `src/pages/index.astro` y todos los componentes de la landing (`Hero.astro`, `Beneficios.astro`, `Servicios.astro`, `CardServicios.astro`, `Testimonios.astro`, `DondeEstamos.astro`, `FAQ.astro`, `Footer.astro`, `Button.astro`).
- `src/prode/data/fixture-world-cup-2026.ts` y `src/prode/data/mocks.ts`.
- `src/prode/repositories/predictions.repository.ts` (sin cambios).
- `src/prode/repositories/profiles.repository.ts` y `matches.repository.ts` (sin cambios).
- `src/prode/services/ranking.service.ts` (sin cambios).
- `src/prode/services/auth.service.ts`, `match.service.ts`, `prediction.service.ts`, `admin.service.ts` (sin cambios).
- `src/prode/domain/**` (sin cambios — tipos y lógica se reutilizan).
- `src/prode/components/auth/**` (sin cambios — se dejan de usar desde `ProdeShell` pero no se borran, por si se reactiva auth en el futuro).
- `src/prode/components/dashboard/ProfileCard.tsx`, `PredictionCountCard.tsx`, `RankingPreviewCard.tsx`, `RulesPreviewCard.tsx` (sin cambios — ya no se montan pero no se eliminan, mantienen el bundle lazy-split).
- `src/prode/components/dashboard/FreshaCTA.tsx` (sin cambios — se reutiliza).
- `src/prode/components/feedback/BugReportButton.tsx` (decisión apply: mantener o quitar. Provisional: dejar, no molesta).
- `src/prode/pages/RankingPage.tsx`, `FixturePage.tsx`, `PredictionsPage.tsx`, `RulesPage.tsx`, `AdminPage.tsx`, `OnboardingPage.tsx`, `LoginPage.tsx`, `SignupPage.tsx`, `ResetPasswordPage.tsx`, `NotFoundPage.tsx` (sin cambios — ya no se importan desde `ProdeShell`. `RankingPage.tsx` contiene `RankingTable` interna: NO extraer, crear `FinalRankingTable` nuevo).
- `supabase/migrations/*.sql` (todas, sin cambios).
- `src/prode/config/supabase.ts`, `src/prode/config/api.ts` (sin cambios).

## Migration / Supabase

**Ninguna migration nueva en esta feature.** El snapshot de total de predicciones es estático (constante en código) y no requiere tablas/columnas nuevas. Las policies admin se preservan íntegras. Las views `rankings` y `public_aliases` se consumen como están. No se agregan RPC.

Si durante `apply` se detectara que `rankings` no devuelve datos finales (ej. por issues en la view), el problema se trata como bug de la view existente — **no** se crea migration en este scope.

## Criterios de aceptación

Post-implementación, verificar:

- [ ] `npm run typecheck` pasa sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run build` (o `astro build`) pasa sin errores.
- [ ] `npm test` pasa (los tests de scoring/locking/ranking existentes siguen verde — no se toca dominio).
- [ ] En la landing principal no aparece el link ⚽ Prode 2026 en mobile ni desktop.
- [ ] Navegar a `/prode` estando logueado y estando anónimo: en ambos casos se ve el dashboard final, sin redirect a login, sin `ProfileGuard`.
- [ ] El dashboard final muestra la tabla general completa ordenada por puntos.
- [ ] El dashboard final muestra 3 stats: predicciones totales, aciertos perfectos, aciertos parciales.
- [ ] El dashboard final muestra el mensaje literal: "Gracias por participar con nosotros, a Stylo's Barber lo engrandece su comunidad".
- [ ] El `FreshaCTA` aparece al pie y al clickearlo dispara `click_prode_reservar` (verificar con GA Debug).
- [ ] Navegar manualmente a `/prode/admin`, `/prode/fixture`, `/prode/predicciones`, `/prode/ranking`, `/prode/reglas`, `/prode/onboarding`, `/prode/login`, `/prode/signup`, `/prode/reset-password`: la URL termina en `/prode/` y se ve el dashboard final.
- [ ] El título de la pestaña dice "Resultados finales del Prode Mundial 2026 · Stylo's Barber".
- [ ] GA Debug muestra `page_view` para `/prode` al cargar.
- [ ] GA Debug muestra `prode_final_view` con params `{total_predictions, exact_total, partial_total, participants}` (sin PII).
- [ ] No se mencionan premios ni monto ($50k/$100k) en el dashboard final.
- [ ] No se modificó ninguna policy admin, `is_admin()`, views `rankings`/`public_aliases` ni ninguna migration SQL.
- [ ] No se borró data de `profiles`, `matches`, `predictions`.
- [ ] Desde el panel Supabase el dueño puede seguir haciendo consultas/correcciones admin (RLS intacta).

## Pendientes antes de Apply — RESUELTOS

- ~~**Confirmar valor numérico del snapshot `FINAL_TOTAL_PREDICTIONS`**~~ → **Confirmado: `787`** (corrido por el usuario: `SELECT count(*) FROM predictions`). Hardcodear en la constante.
- ~~**Confirmar mensaje literal final**~~ → Confirmado literal: `Gracias por participar con nosotros, a Stylo's Barber lo engrandece su comunidad`.
- ~~**Confirmar estrategia de redirección de subrutas**~~ → Decisión: **Opción A** — SPA con `<Route path="*" element={<Navigate to="/" replace />} />` + extender `getStaticPaths` en `[...path].astro` con `login`, `signup`, `reset-password` además de las 6 existentes, para que cualquier URL histórica resuelva HTML y redirija en cliente.

## Out of scope

- Congelar RLS admin (queda abierto adrede para el dueño).
- Borrar data del prode (`profiles`, `matches`, `predictions`).
- Mencionar ganador final o monto de premio en el dashboard.
- Crear RPC nueva en Supabase.
- Snapshot de total de predicciones auto-actualizable (es estático al cierre).
- Re-abrir el prode para una nueva competición.
- Borrar las páginas internas (`RankingPage.tsx`, `FixturePage.tsx`, etc.) — se dejan sin referenciar desde el router. Si在未来 se quiere limpiar el repo, tarea aparte.
- Actualizar la tabla de eventos en AGENTS.md ( tarea post-apply, fuera de este spec).