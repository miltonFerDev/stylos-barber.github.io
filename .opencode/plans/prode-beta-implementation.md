# Plan de Implementación: Prode Beta Liga Argentina

## Resumen de decisiones

| Decisión | Resolución |
|----------|------------|
| birth_date en profiles | Agregar columna a la DB |
| points en predictions | Eliminar columna (se calcula dinámicamente) |
| group como matchday | Usar columna "group" existente |
| first_name/last_name | Agregar columnas, mantener full_name temporalmente |
| Premios | Sin premios reales (beta de prueba) |
| Ranking | Semanal + General (probar ambos) |
| Partidos | Placeholder hasta confirmar fixture real |
| Conexión Supabase | Prioridad, antes que UI |

## Fase 1: SQL Migration (ejecutar en Supabase SQL Editor)

Ver archivo: `supabase/migrations/001_prode_beta.sql`

Cambios principales:
- Agregar `first_name`, `last_name`, `birth_date` a `profiles`
- Remover default `gen_random_uuid()` de `profiles.id` (debe ser `auth.uid()`)
- Agregar `competition` a `matches`
- Remover default y hacer NOT NULL `match_id` en `predictions`
- Eliminar columna `points` de `predictions`
- Habilitar RLS en las 3 tablas
- Crear policies: profiles (own + admin), matches (public read, admin write), predictions (own + admin)
- Crear vista `rankings` para ranking público sin exponer predicciones individuales
- Seed 4 partidos placeholder

## Fase 2: Competition Config

Nuevo archivo `src/prode/config/competition.ts`:
```ts
export const competition = {
  id: 'beta-liga-argentina',
  name: 'Prode Beta Liga Argentina',
  shortName: 'Prode Beta',
  subtitle: 'Cuartos de final - Torneo Apertura',
  rules: {
    exactScore: 3,
    correctWinner: 1,
    incorrect: 0,
    penaltyNote: 'Resultado a los 90 minutos. Penales no cuentan.',
  },
  prizes: {
    perMatchday: null,
    final: null,
    note: 'Competencia de prueba - sin premios reales',
  },
} as const;
```

## Fase 3: Repositories

### `src/prode/repositories/profiles.repository.ts`

Mapeo DB → TS:
- `id` → `id`
- `first_name` + `last_name` → `firstName`, `lastName`
- `full_name` → `_fullName` (interno, para generar si faltan first/last)
- `public_alias` → `alias`
- `birth_date` → `birthDate`
- `whatsapp` → `whatsapp`
- `email` → `email`
- `is_admin` → `role` ('admin' | 'user')
- `accepted_rules_at` → `acceptedRulesAt` + derivar `acceptedRules`
- `created_at` → `createdAt`

Operaciones:
- `getById(userId)` → SELECT from profiles WHERE id = userId
- `create(userId, data)` → INSERT con id = userId
- `update(userId, data)` → UPDATE where id = userId
- `getByAlias(alias)` → SELECT where public_alias = alias (para ranking)

### `src/prode/repositories/matches.repository.ts`

Mapeo DB → TS:
- `id` → `id` (UUID a string)
- `date` → `matchDate`
- `home_team` → `teamA`
- `away_team` → `teamB`
- `home_score` → `scoreA`
- `away_score` → `scoreB`
- `"group"` → `matchday`
- `competition` → `competition`
- Derivar `status`: si home_score IS NOT NULL → 'finished', else 'upcoming'

Operaciones:
- `getAll(competition?)` → SELECT, filtrar por competition
- `getById(id)` → SELECT WHERE id
- `create(data)` → INSERT (admin)
- `updateResult(id, homeScore, awayScore)` → UPDATE scores + status
- `resetMatch(id)` → UPDATE scores null + status 'upcoming'

### `src/prode/repositories/predictions.repository.ts`

Mapeo DB → TS:
- `id` → `id`
- `user_id` → `userId`
- `match_id` → `matchId`
- `home_score` → `predictedScoreA`
- `away_score` → `predictedScoreB`

Operaciones:
- `getByUserId(userId)` → SELECT WHERE user_id
- `getByUserIdAndMatchId(userId, matchId)` → SELECT WHERE both
- `upsert(userId, matchId, homeScore, awayScore)` → INSERT ON CONFLICT UPDATE
- `getAll()` → SELECT all (solo admin via RLS, pero usamos la vista rankings)
- `getAllForFinishedMatches(competition?)` → JOIN predictions + matches WHERE finished (para ranking)

## Fase 4: Services Update

### `profile.service.ts`
- `getProfile(userId)` → llama `profilesRepository.getById(userId)`
- `createProfile(userId, data)` → genera alias, llama `profilesRepository.create(userId, data)`
- `hasProfile(userId)` → llama `profilesRepository.getById(userId)` y check null
- Remover localStorage

### `match.service.ts`
- `getMatches(competition?)` → llama `matchesRepository.getAll(competition)`
- `getMatchById(id)` → llama `matchesRepository.getById(id)`
- `updateMatchResult(id, scoreA, scoreB)` → llama `matchesRepository.updateResult(id, scoreA, scoreB)`
- `addMatch(data)` → llama `matchesRepository.create(data)`
- `resetMatch(id)` → llama `matchesRepository.resetMatch(id)`
- Remover localStorage

### `prediction.service.ts`
- `getPredictions(userId)` → llama `predictionsRepository.getByUserId(userId)`
- `getPredictionForMatch(userId, matchId)` → llama `predictionsRepository.getByUserIdAndMatchId`
- `savePrediction(userId, input)` → llama `predictionsRepository.upsert(userId, ...)`
- Remover `userId: 'current-user'` hardcodeado
- Remover localStorage

### `ranking.service.ts`
- `calculateUserStats()` → sin cambios (lógica pura, ya funciona)
- `getRankings(competition?)` → nueva función que consulta la vista `rankings` de Supabase
- Eliminar `mockRankingWeekly` y `mockRankingGeneral`
- `buildRankingWithUser()` → se mantiene para combinar datos del usuario actual con la vista

## Fase 5: Hooks Update

### `useProfile.ts`
- Recibir `userId` o usar `useAuth` internamente
- Hacer llamadas async a `profileService`
- Mantener misma interfaz: `{ profile, loading, hasProfile, createProfile, refreshProfile, clearProfile }`

### `usePredictions.ts`
- Recibir `userId`
- Hacer llamadas async a `predictionService`
- Mantener misma interfaz

### `useRankings.ts`
- Llamar a `rankingService.getRankings()` que consulta la vista de Supabase
- Calcular stats del usuario actual con datos reales
- Construir ranking con `buildRanking`
- Mantener misma interfaz

## Fase 6: UI Updates

### Titulos dinámicos (usan `competition` config)
- `DashboardPage.tsx:16` → `competition.name` en vez de "Prode Mundial 2026"
- `ProdeNav.tsx:35` → `competition.shortName` en vez de "Prode 2026"
- `FixturePage.tsx:52` → `competition.subtitle` en vez de "Todos los partidos del Mundial 2026"

### RulesPage.tsx
- Agregar nota de beta: "Competencia de prueba - sin premios reales"
- Agregar: "Resultado a los 90 minutos. Penales no cuentan."
- Mantener sistema de puntos (3/1/0)

### RulesPreviewCard.tsx
- Cambiar premio final a "Sin premios - Modo prueba"

### RankingPage.tsx
- Mantener tabs semanal/general (el usuario quiere probar ambas)
- Cuando no hay datos, mostrar mensaje en vez de mocks

### AdminPage.tsx
- Sin cambios mayores (ya permite cargar resultados)
- Agregar botón para crear partido nuevo (si se necesita)

### OnboardingPage.tsx
- Sin cambios mayores (ya pide firstName, lastName, birthDate, whatsapp)

## Fase 7: Tipos

### Match type update
```ts
export interface Match {
  id: string;
  matchday: string;
  matchDate: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  status: MatchStatus;
  competition?: string;
}
```

## Fase 8: Archivos a crear

1. `supabase/migrations/001_prode_beta.sql`
2. `src/prode/config/competition.ts`
3. `src/prode/repositories/profiles.repository.ts`
4. `src/prode/repositories/matches.repository.ts`
5. `src/prode/repositories/predictions.repository.ts`

## Fase 9: Archivos a modificar

1. `src/prode/domain/types/match.ts` - Agregar `competition?`
2. `src/prode/services/profile.service.ts` - Async + Supabase
3. `src/prode/services/match.service.ts` - Async + Supabase
4. `src/prode/services/prediction.service.ts` - Async + Supabase + userId real
5. `src/prode/services/ranking.service.ts` - Datos reales
6. `src/prode/hooks/useProfile.ts` - Async + userId
7. `src/prode/hooks/usePredictions.ts` - Async + userId
8. `src/prode/hooks/useRankings.ts` - Datos reales
9. `src/prode/pages/DashboardPage.tsx` - Título dinámico
10. `src/prode/components/layout/ProdeNav.tsx` - Título dinámico
11. `src/prode/pages/FixturePage.tsx` - Subtítulo dinámico
12. `src/prode/pages/RulesPage.tsx` - Reglas beta
13. `src/prode/components/dashboard/RulesPreviewCard.tsx` - Premios beta
14. `src/prode/data/mocks.ts` - Datos del beta (Partidos placeholder + rankings vacíos)
15. `src/prode/components/auth/AdminGuard.tsx` - Verificar contra Supabase

## Riesgos y notas

1. **RLS circular en profiles**: La policy admin check hace `SELECT FROM profiles WHERE id = auth.uid() AND is_admin`. Esto funciona porque PostgreSQL evalúa policies por fila, no como subquery recursiva.
2. **Vista rankings**: Expone alias + puntos sin exponer predicciones individuales. Los usuarios regulares no pueden ver las predicciones de otros.
3. **match_id en predictions**: El default `gen_random_uuid()` estaba generando IDs random que no existen en matches. Se eliminó el default y se hizo NOT NULL.
4. **Primer login**: Cuando un usuario se loguea por primera vez, no tiene perfil. El flujo AuthGuard → OnboardingPage → createProfile lo maneja.
5. **Admin setup**: Después de crear tu perfil, necesitás actualizar `is_admin = true` en Supabase SQL: `UPDATE profiles SET is_admin = true WHERE email = 'tu-email@gmail.com';`
6. **Seed matches**: Los 4 partidos son placeholders. Cuando se confirmen los cuartos de final, actualizar equipos y horarios via AdminPanel o SQL.

## Orden de implementación

1. SQL migration (ejecutar en Supabase dashboard)
2. Competition config
3. Repositories
4. Services
5. Hooks
6. Types
7. UI updates
8. Testing
9. Lint + typecheck