# Spec: Fecha unificada "3er puesto y Final"

## Contexto

El Mundial 2026 tiene 104 partidos cargados en la tabla `matches` (migración `009_fixture_reset_2026.sql` ya aplicada en producción): 72 de fase de grupos y 32 eliminatorias, entre ellas `match_number=103` (`phase='third_place'`) y `match_number=104` (`phase='final'`).

Hoy cada "fecha" de predicción se modela como:

- Fase de grupos: combinación de `phase='groups'` + `matchday_order` (1, 2, 3).
- Eliminatorias: valor único de `phase` (`round_of_32`, `round_of_16`, `quarter_finals`, `semi_finals`, `third_place`, `final`).

Esto produce dos "fechas" separadas para 3er puesto y Final, cada una con un único partido. Producto quiere unificarlas en una sola fecha de predicción llamada **"3er puesto y Final"** para fixture, predicciones y rankings por fase, manteniendo un CTA secundario de reserva Fresha y un único premio por fase (50% de descuento).

Definición de la estructura de "fecha" vigente:
- `PhaseIdentifier = { phase: TournamentPhase; matchday: number | null }` en `src/prode/domain/types/ranking.ts`.

## Objetivo

Modelar una agrupación de predicción **opcional y ortogonal a `phase`** que permita colapsar los partidos 103 y 104 en una sola "fecha" llamada "3er puesto y Final", sin renombrar phases, sin tocar scoring, locking, RLS, la view `rankings`, ni `sync-matches`.

## Decisiones cerradas

1. **Enfoque: Opción A — columna `prediction_group`.** Se añade `prediction_group text NULL` a `matches`. Para `competition='world-cup-2026'`, los partidos con `match_number IN (103, 104)` reciben `prediction_group='final_stage'`. Todos los demás quedan `NULL` y el código los trata con la agrupación actual (`phase` + `matchday`).
2. **Bloqueo: independiente por partido.** No se toca RLS ni `002_prediction_lock.sql`. Cada `MatchRow` se bloquea por su propio kickoff (`m.matchDate > now()`). Pueden coexistir 3er puesto bloqueado y Final editable dentro de la misma "fecha".
3. **Label: "3er puesto y Final".** Se usa este texto en: tab de predicciones, acordeón de fixture y selector de ranking por fase.
4. **Premio: un solo 50% descuento (perPhase).** Se aplica `prizes.perPhase` sobre la suma de ambos partidos. La gift card de `prizes.final` (ranking general final) queda **exclusivamente para el ranking general**; no se entrega por la fecha unificada. No se toca `prizes.final` ni `competition.ts`.
5. **No se renombran phases.** `phase='third_place'` (count=1) y `phase='final'` (count=1) siguen existiendo; se mantiene el invariante de 104 partidos totales y los counts por phase.
6. **`sync-matches` intocable.** Para `world-cup-2026` sigue actualizando solo `home_score`, `away_score`, `status` de cualquier partido (incluidos 103 y 104). Nunca pisa `prediction_group`, equipos, dates, phase, match_number, ni group.

## Cambios técnicos

### Base de datos (migration 015)

Archivo nuevo: `supabase/migrations/015_final_stage_group.sql`.

Requisitos:
- Idempotente (`ADD COLUMN IF NOT EXISTS`).
- `ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS prediction_group text NULL;`
- `UPDATE public.matches SET prediction_group = 'final_stage' WHERE competition = 'world-cup-2026' AND match_number IN (103, 104);`
- Comentario informativo: `COMMENT ON COLUMN public.matches.prediction_group IS 'Grupo de predicción opcional (e.g. final_stage colapsa 3er puesto + Final). NULL = agrupación por phase + matchday.';`
- No tocar RLS, grants, indexes, views (`public_aliases`, `rankings`) ni `002_prediction_lock.sql`.
- No crear restricción `NOT NULL`: la columna debe permitir `NULL` para los 102 partidos restantes.

### Tipos y dominio

`src/prode/domain/types/match.ts`:
- Añadir `predictionGroup?: string | null` a la interfaz `Match`.
- Mantener `phase='third_place' | 'final'` y `PHASE_LABELS` intactos.

`src/prode/domain/types/ranking.ts`:
- Introducir tipo `PredictionGroupId = string` (alias nominal para legibilidad).
- Añadir constantes de metadatos del grupo:
  - `FINAL_STAGE_GROUP: PredictionGroupId = 'final_stage'`
  - `FINAL_STAGE_LABEL = '3er puesto y Final'`
  - Diccionario `PREDICTION_GROUP_LABELS: Record<PredictionGroupId, string>` con entrada `final_stage: '3er puesto y Final'`.
- Mantener `PhaseIdentifier`, `phaseIdToString`, `getPhaseLabel` sin romper. Pueden convivir ambos modelos.

`src/prode/domain/logic/ranking.ts`:
- Añadir helper **puro** `getPredictionGroupId(match: Match): string`:
  - Si `match.predictionGroup` no es null/undefined, devolverlo.
  - Si `match.matchday !== null`, devolver `` `${match.phase}-${match.matchday}` `` (mismo formato que `phaseIdToString`).
  - Si no, devolver `match.phase`.
- Añadir helper de label `getPredictionGroupLabel(groupId: string): string`:
  - Si está en `PREDICTION_GROUP_LABELS`, devolverlo.
  - Si coincide con el patrón `${phase}-${matchday}` → derivar a `getPhaseLabel`.
  - Si coincide con un `phase` solo → devolver `PHASE_LABELS[phase]`.
  - Fallback: devolver el string tal cual.
- Refactor de `getCurrentPhaseIndex` para operar sobre **grupos colapsados** en vez de `PhaseIdentifier`:
  - Nueva firma: `getCurrentGroupIndex(matches: Match[], availableGroups: string[]): number`.
  - Mantiene la lógica: primer grupo con al menos un partido no `finished` es el activo; si todos `finished`, devuelve 0; si vacío, 0.
  - Se debe preservar la versión existente `getCurrentPhaseIndex` (deprecada o wrapper) para no romper tests existentes, o sustituirla si Apply confirma que todos los call-sites se migran. **Decisión de implementación diferida a Apply**; el spec exige no romper tests vigentes.
- Cualquier nueva función debe ser testeable sin Supabase (pura).

### Repositories

`src/prode/repositories/matches.repository.ts`:
- Extender `MatchRow` con `prediction_group: string | null`.
- En `rowToMatch`: mapear `predictionGroup: row.prediction_group ?? null`.
- En `create`: aceptar `predictionGroup?: string | null` en el argumento y persistirlo (`prediction_group: matchData.predictionGroup ?? null`). No es crítico para sync (NO se usa desde sync-matches), pero se mantiene para Admin CRUD consistente.

### Services

`src/prode/services/ranking.service.ts`:
- Extender `getPhaseRankings` (o añadir `getGroupRankings(groupId: string)`) para soportar el grupo unificado:
  - Si `groupId === 'final_stage'`: query a `matches` con `.in('phase', ['third_place', 'final'])` AND `.eq('competition', 'world-cup-2026')` (defensiva) — o equivalentemente `.eq('prediction_group', 'final_stage')`. **Preferir `.eq('prediction_group', groupId)`** como path principal, porque es la nueva fuente de verdad.
  - El resto del cálculo (sumar puntos de cada partido finalizado, mapear profiles, predictions, `calculatePoints`) se mantiene igual.
- No se toca `getRankings()` (view `rankings`): el ranking general sigue leyendo la view.

`src/prode/services/match.service.ts` y `prediction.service.ts`:
- Sin cambios funcionales. Si exponenhelpers de agrupación, deben consumir el nuevo `getPredictionGroupId` en vez de armar `phase-matchday` inline. Apply decide si es necesario.

### Hooks

`src/prode/hooks/useRankings.ts`:
- Sustituir `getAvailablePhases(matches): PhaseIdentifier[]` por `getAvailablePredictionGroups(matches): string[]` (o conviventodos). Requisito:
  - Recorre los `matches` y arma el set de group ids via `getPredictionGroupId`.
  - Garantiza que 3er puesto y Final colapsen en **una sola entrada** `final_stage` (no aparecen `third_place` ni `final` como grupos separados).
  - Orden: grupos (Fecha 1, Fecha 2, Fecha 3), R32, R16, QF, SF, `final_stage`. Reutilizar `knockoutOrder` actual extendido.
- Adaptar `useRankings` para trabajar con `selectedGroup: string | null` (o mantener `PhaseIdentifier` como internals y mutar Solo UI). **Decisión de nombres de estado diferida a Apply** siempre que AC1-AC9 se cumplan.
- `getCurrentPhaseIndex` se reemplaza por `getCurrentGroupIndex` sobre `availableGroups`.

### UI (pages)

`src/prode/pages/PredictionsPage.tsx`:
- Tabs por grupo (no por phase cruda).
- Para grupo `final_stage`: un único tab con label **"3er puesto y Final"** que renderiza **dos** `MatchRow` (match 103 y 104), cada uno con su propio bloqueo por kickoff.
- El botón "Guardar" persiste ambas filas `predictions` (una por match_id). No introduce transaccionalidad nueva: dos upserts RLS-allowed.
- Si un match está bloqueado y el otro no, el bloqueado se muestra como read-only y el editable permite input.

`src/prode/pages/FixturePage.tsx`:
- Acordeón con una entrada **"3er puesto y Final"** que contiene dos `MatchCard` (103 y 104) en el orden 3er → Final.
- Se preserva la info de `phase` dentro de cada card si la card la muestra (label interno "3er Puesto" / "Final" no se elimina a nivel partido; solo el header del acordeón usa el label unificado).

`src/prode/pages/RankingPage.tsx`:
- Selector "Por fase" expone una entrada "3er puesto y Final" (grupo `final_stage`).
- Suma puntos de ambos partidos finalizados (103 y 104). Mientras uno no esté `finished`, no suma (comportamiento already presente en `getPhaseRankings`).
- Premio mostrado: **50% de descuento** (`prizes.perPhase`). No mostrar la gift card. No tocar `prizes.final`.

`src/prode/config/competition.ts`:
- **NO se modifica.** Confirmar documentalmente que `prizes.perPhase` ya cubre la fecha unificada (es el mismo premio por fase estándar).

`src/prode/components/predictions/MatchRow.tsx` y `src/prode/components/fixture/MatchCard.tsx`:
- Sin cambios de API. Si leen `match.phase` para mostrar label, mantener sus labels internas. La unificación es a nivel de agrupador, no de partido individual.

### Tests

`src/prode/domain/logic/__tests__/` (vitest):

Nuevos tests:
1. `getPredictionGroupId`:
   - match con `predictionGroup='final_stage'` → `'final_stage'`.
   - match grupos `matchday=2` → `'groups-2'`.
   - match `phase='semi_finals'`, `matchday=null`, `predictionGroup=null` → `'semi_finals'`.
2. `getAvailablePredictionGroups`:
   - Con fixture completo de 104 partidos, el set de grupos incluye una sola entrada `final_stage` y NO incluye `third_place` ni `final` sueltos.
   - Orden esperado: `groups-1`, `groups-2`, `groups-3`, `round_of_32`, `round_of_16`, `quarter_finals`, `semi_finals`, `final_stage`.
3. `getCurrentGroupIndex`:
   - Caso: todos los grupos `finished` salvo `final_stage` (3er `finished`, Final `upcoming`) → devuelve el índice de `final_stage`. **Caso clave del plan.**
   - Caso: todo `finished` → devuelve 0.
   - Caso: fixture vacío → devuelve 0.
4. Tests existentes de `getCurrentPhaseIndex` siguen verde (o se migran al nuevo helper sin perder cobertura).

Tests de integración ranking service (si existen mocks):
- Si hay suite con `ranking.service` contra mocks, añadir caso `getPhaseRankings({ group: 'final_stage' })` (o equivalente) con 103 finalizado y 104 no, verificando que solo suma 103.

## Reglas y restricciones

- **No tocar** `src/prode/domain/logic/scoring.ts`, `src/prode/domain/logic/locking.ts`, `supabase/migrations/002_prediction_lock.sql`, view `rankings`, `src/prode/config/api.ts` (OpenLigaDB), `sync-matches` (edge function), RLS existente, `prizes.final`.
- **No renombrar** `phase='third_place'` ni `phase='final'`. Los counts deben seguir: 104 totales, `third_place`=1, `final`=1, `prediction_group='final_stage'`=2.
- **No mezclar datos beta** (`beta-liga-argentina`, mocks) con `world-cup-2026`. La migration 015 solo afecta `competition='world-cup-2026'`.
- **RLS**: la seguridad real vive en Supabase. La UI no es autorizadora. La fecha unificada **no cambia políticas de acceso**: las predicciones siguen protegidas por `predictions_select_own`, `predictions_insert_before_match`, `predictions_update_before_match`. La nueva columna `prediction_group` no se expone vía policy; es solo agrupador visual/de cálculo.
- **Rankings públicos**: no PII. El ranking por fase se construye con `public_alias` de `profiles` (no email, no whatsapp, no nombre real). El ranking general sigue leyendo view `rankings`.
- **Idempotencia**: la migration 015 debe poder correrse múltiples veces sin error.
- ** sync-matches untouched**: para `world-cup-2026` sigue sin insertar ni sobreescribir `prediction_group`. No se modifica el adapter ni el cron.
- **SSR / tipos**: el cliente Supabase y los tiposTS deben reflejar la nueva columna; cualquier generador de tipos automático (Supabase CLI) se puede correr pero Apply no es obliged — basta con el mapeo manual en `MatchRow`.

## Criterios de aceptación (AC1-AC9)

- **AC1**: En `/prode/predictions`, fase eliminatorias, un único tab **"3er puesto y Final"** con dos `MatchRow` (match 103 y 104). Guardar persiste ambas filas en `predictions` (una por `match_id`).
- **AC2**: En `/prode/fixture`, un acordeón **"3er puesto y Final"** con dos `MatchCard` (103 y 104).
- **AC3**: En `/prode/rankings` → "Por fase", una entrada **"3er puesto y Final"**; suma puntos de ambos partidos finalizados (mientras alguno no esté `finished`, ese partido no contribuye).
- **AC4**: Cada partido bloquea por su propio kickoff: si 3er (`matchDate=m1`) y Final (`matchDate=m2`) con `m1 < now() < m2`, el `MatchRow` de 3er está bloqueado y el de Final editable. **No se toca RLS.**
- **AC5**: `sync-matches` para `world-cup-2026` sigue actualizando solo `home_score`, `away_score`, `status` de los partidos 103 y 104; no pisa `prediction_group` (ni teams, dates, phase, match_number, group).
- **AC6**: `npm run typecheck`, `npm run lint`, `npm test` (existentes + nuevos), `astro build` — todos verde.
- **AC7**: Counts siguen: 104 partidos totales, `phase='third_place'`→1, `phase='final'`→1, `prediction_group='final_stage'`→2.
- **AC8**: Ranking general (view `rankings`) inalterado. La gift card de `prizes.final` sigue asociada solo al ranking general final.
- **AC9**: Premio por la fecha unificada = 50% descuento (`prizes.perPhase`), **no** gift card. La gift card queda exclusiva del ranking general final.

## Out of scope

- Renombrar phases (`third_place` / `final`).
- Crear tablas o views nuevas.
- Modificar `scoring.ts`, `locking.ts`, RLS, `002_prediction_lock.sql`, view `rankings`, `sync-matches`, `competition.ts`.
- Cambiar el algoritmo de desempate (exact predictions > correct winners > fechas participadas > sorteo).
- Integrar OpenLigaDB como fuente para `world-cup-2026`.
- Rediseñar la landing principal.
- Modificar `AGENTS.md` desde este spec (lo hará `apply` con una nota breve sobre `prediction_group`). Este spec **no** edita `AGENTS.md`.

## Verificación

1. Aplicar migration `015_final_stage_group.sql` en Supabase.
2. Verificar con query:
   ```sql
   SELECT match_number, phase, prediction_group
   FROM matches
   WHERE competition = 'world-cup-2026' AND match_number IN (103, 104);
   -- Debe devolver dos filas ambas con prediction_group='final_stage'
   ```
3. Counts globales:
   ```sql
   SELECT COUNT(*) FROM matches WHERE competition='world-cup-2026'; -- 104
   SELECT phase, COUNT(*) FROM matches WHERE competition='world-cup-2026' GROUP BY phase; -- third_place=1, final=1
   SELECT prediction_group, COUNT(*) FROM matches WHERE competition='world-cup-2026' GROUP BY prediction_group; -- final_stage=2, NULL=102
   ```
4. UI:
   - `/prode/predictions` → un tab "3er puesto y Final" con dos MatchRow.
   - `/prode/fixture` → un acordeón "3er puesto y Final" con dos MatchCard.
   - `/prode/rankings` → "Por fase" con entrada "3er puesto y Final" y premio 50% descuento.
5. Bloqueo por partido: cambiar manualmente `date` de 103 a pasado y 104 a futuro; verificar que solo el 3er se muestre bloqueado.
6. `npm run typecheck` ✅
7. `npm run lint` ✅
8. `npm test` ✅ (incluye tests nuevos de `getPredictionGroupId`, `getAvailablePredictionGroups`, `getCurrentGroupIndex`)
9. `astro build` ✅
10. `sync-matches` (si se ejecuta manualmente o vía cron) no cambia `prediction_group` de 103/104. Verificar log de la edge function.

## Riesgos

- **R1 — Doble tab por migración parcial**: si la migration 015 se aplica pero el frontend no se deploya, la UI vieja seguirá mostrando dos tabs separados. **Mitigación**: deployar backend y frontend en la misma ventana; la columna es nullable y no rompe la UI vieja (solo no la colapsa).
- **R2 — Inconsistencia entre `.eq('prediction_group', ...)` y `.in('phase', ...)`**: si un partido 103/104 llega a tener `prediction_group=NULL` por un reseed, el query por `prediction_group` no lo trería. **Mitigación**: la migration 015 es idempotente y aplica el UPDATE cada corrida; el query del service puede usar `.in('phase', ['third_place','final'])` como fallback defensivo.
- **R3 — `getCurrentPhaseIndex` vs `getCurrentGroupIndex`**: migrar todos los call-sites sin dejar dobles firmas puede romper tests existentes. **Mitigación**: Apply puede mantener ambas firmas (wrapper deprecado) durante esta iteración y limpiar en prossimo hardening.
- **R4 — Confusión de premio**: usuario podría pensar que la fecha unificada entrega gift card. **Mitigación**: RankingPage muestra explícitamente "50% de descuento" en la entrada del grupo, no la gift card. Documentar en AGENTS.md (tarea de apply).
- **R5 — Sync posterior**: si FutbolContexto o un sync futuro inscribe partidos nuevos con `match_number` 103/104 distinto, el UPDATE de la migration 015 los encontraría y los marcaría `final_stage` erróneamente. **Mitigación**: el WHERE incluye `competition='world-cup-2026'` y `match_number IN (103, 104)`; sync-matches para `world-cup-2026` no inserta nuevos (skip con warning). Cobertura suficiente.
- **R6 — RLS no cubre `prediction_group`**: la columna es world-writable vía admin update (RLS `matches_admin_update`). Como `prediction_group` es solo agrupador visual y no habilita acceso a datos privados, el impacto de seguridad es nulo. Documentar igual en AGENTS.md.