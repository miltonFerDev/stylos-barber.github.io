# Agentes - Stylo's Barber

## Contexto del proyecto

Sitio web de Stylo's Barber (barbería). El sitio actual es el punto de partida para implementar la nueva feature Prode Mundial 2026.

---

## Landing principal

### Estructura actual (`src/pages/index.astro`)

| Orden | Sección | Componente | Fondo |
|-------|---------|------------|-------|
| 1 | Hero | `Hero.astro` | bg-primary |
| 2 | Beneficios | `Beneficios.astro` | bg-primary |
| 3 | Servicios | `Servicios.astro` + `CardServicios.astro` | bg-surface |
| 4 | Testimonios | `Testimonios.astro` + `CardTestimonios.astro` | bg-[#2A2A3D] |
| 5 | Ubicación / Contacto | `DondeEstamos.astro` | bg-primary |
| 6 | FAQ | `FAQ.astro` | bg-primary |
| Footer | — | `Footer.astro` | bg-[#14141C] |

### Secciones eliminadas / no implementar
- ~~`ElegirCuandoVenir` ("Elegí cuándo venir")~~ — Eliminada por redundancia con Beneficios.
- ~~"Escuela Stylo's"~~ — No implementar. Rechazado por producto.
- ~~"El sistema Stylo's"~~ — No implementar. Rechazado por producto.

### Cambios recientes en landing
**Commit:** `349c111` — `landing: ajusta espaciado, elimina ElegirCuandoVenir, reordena secciones y agrega FAQ rulos`

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/Navigation.astro` | `py-[5px]` → `py-3` (más respirado) |
| `src/components/layout/Beneficios.astro` | Botones normalizados a `py-4 px-8`, párrafos hermanos con `mb-3` |
| `src/components/layout/Hero.astro` | Botón normalizado a `py-4 px-8` |
| `src/components/layout/Footer.astro` | `text-m` → `text-sm` (clase inválida de Tailwind) |
| `src/components/Button.astro` | Defaults limpios, sin `absolute bottom-10` ni colores hardcodeados |
| `src/components/layout/FAQ.astro` | Nuevo item "¿Trabajan cortes en pelo con rulos?", `pt-2` en bodies |
| `src/pages/index.astro` | Quitado ElegirCuandoVenir, reordenado DondeEstamos antes de FAQ |

### FAQ
- 6 items en acordeón (agregado item de rulos en jul 2026).
- Tracking: event delegation sobre `#faq` dispara `click:faq_open` en gtag al abrir cualquier `<details>`.

### Componentes de la landing
| Componente | Ubicación | Rol |
|------------|-----------|-----|
| `Navigation.astro` | Header fijo | Nav principal + menú mobile |
| `Hero.astro` | Inicio | CTA principal reserva Fresha |
| `Beneficios.astro` | Post-hero | Mañanas Invernales + Socios GEI |
| `CardServicios.astro` | En Servicios | Cards de Corte / Barba / Combo |
| `CardTestimonios.astro` | En Testimonios | Cards de testimonios con avatar |
| `DondeEstamos.astro` | Pre-footer | Misión + ubicación + mapa |
| `Footer.astro` | Footer | Redes + copyright + Malvinas |

### Deploy
Automático vía GitHub Actions (`.github/workflows/deploy.yml`) al hacer push a `main`. Deploya a GitHub Pages.

---

## Feature implementada: Prode Mundial 2026

### Ubicación
`/prode`

### Objetivos
- Generar tráfico recurrente a la web.
- Generar interacción con clientes y público general.
- Fortalecer la marca durante el Mundial.
- Mantener como CTA secundario la reserva de turnos en Fresha.

### Definiciones funcionales
- Participación abierta a cualquier persona.
- Login idealmente con Google.
- Perfil con: nombre real, alias público, WhatsApp, email de Google, aceptación de reglas.
- Ranking público usando alias.
- No mostrar email, WhatsApp ni nombre real en rankings públicos.
- Partidos agrupados por grupo/fecha/etapa.
- Predicciones editables hasta el inicio de cada partido.
- Cuando empieza el partido, esa predicción queda bloqueada.
- Ranking por fecha/grupo/etapa y ranking general.
- Premio por fecha: 50% de descuento en cualquier servicio.
- Premio final: gift card por $100.000.
- Admin inicial: solo el dueño.

---

## Reglas de trabajo

### Para features nuevas

Antes de implementar una feature grande, el agente debe planificar.

Para `/prode`, no escribir código ni modificar archivos hasta entregar:

1. Diagnóstico del producto.
2. Arquitectura propuesta.
3. Riesgos técnicos.
4. Riesgos de producto.
5. Decisiones pendientes.
6. Roadmap incremental.
7. Criterios de aceptación.
8. Archivos o zonas del repo que probablemente se tocarán.

### Para mantenimiento y hardening

El agente debe:

- Auditar estado actual del código y Supabase antes de modificar.
- No implementar features nuevas durante una auditoría.
- No rediseñar la app durante auditoría funcional.
- No tocar la landing principal.
- No mezclar datos beta con datos productivos.
- No corregir a ciegas sin explicar origen y riesgo.
- Toda corrección debe ser mínima, verificable y con criterio de aceptación.
- Si falta información, marcarla como pendiente en vez de asumirla.

El agente no debe:
- escribir código durante la planificación;
- modificar archivos sin confirmación;
- reescribir la landing principal;
- asumir decisiones críticas sin marcarlas como pendientes;
- sobredimensionar la solución;
- copiar Gran DT completo.

---

## Arquitectura para `/prode`

El prode debe pensarse como una mini-app dentro del sitio actual.

### Separación de responsabilidades

```
src/
  prode/
    components/           # Componentes de presentación y UI
      auth/               # AuthProvider, ProfileProvider, guards
      dashboard/          # Cards del dashboard
      fixture/            # MatchCard
      layout/             # ProdeShell, ProdeNav
      predictions/        # MatchRow, MatchStatusBadge
      rankings/           # (vacío, por implementar)
      ui/                 # Primitivas: Button, Card, Badge, LoadingSpinner, etc.
    config/
      api.ts             # Cliente OpenLigaDB
      competition.ts     # Constantes del prode (nombre, scoring, premios)
      supabase.ts        # Cliente Supabase con lifecycle hooks
    data/
      mocks.ts           # Datos de ejemplo para desarrollo offline
    domain/
      logic/             # Lógica pura (scoring, locking, ranking)
        __tests__/       # Tests de dominio
      types/             # Tipos e interfaces TypeScript
    hooks/               # useAuth, useProfile, usePredictions, useRankings
    pages/               # 10 páginas: Dashboard, Login, Fixture, etc.
    repositories/         # profiles, matches, predictions
    services/            # auth, match, prediction, ranking, admin, api-sync
    utils/
      validation.ts      # Type guards
```

### Reglas obligatorias de arquitectura

- Los componentes visuales **no deben consultar Supabase directamente**.
- Los componentes visuales **no deben calcular puntajes ni rankings**.
- La lógica de scoring debe estar centralizada y ser testeable.
- La lógica de bloqueo de predicciones por horario debe estar centralizada.
- Las queries a Supabase deben vivir en repositories o services.
- Los rankings públicos no deben exponer datos privados.
- Un usuario no debe poder ver ni editar datos privados de otro usuario.
- Un usuario no debe poder editar predicciones después del inicio del partido.
- Las acciones admin deben estar protegidas.

### Estructura de datos (Supabase)

**Tablas:**
- `profiles` - Perfil de usuario (id FK auth.users, email, first_name, last_name, birth_date, public_alias, whatsapp, is_admin, accepted_rules_at, created_at). **No es `users`.**
- `matches` - Partidos (id, date, home_team, away_team, home_score, away_score, group, competition, match_number, status)
- `predictions` - Predicciones (id, user_id FK profiles, match_id FK matches, home_score, away_score, created_at, updated_at, UNIQUE(user_id, match_id))

**Views:**
- `public_aliases` - VIEW pública que expone solo (id, public_alias). Usada para rankings sin exponer datos privados.
- `rankings` - VIEW computada que expone (alias, points, exact_predictions, correct_winners). **No es una tabla.** Se calcula desde profiles + predictions + matches.

**RLS Policies:**

---

## Modo didáctico

El usuario quiere aprender mientras desarrolla. Tiene nivel trainee: entiende fundamentos de desarrollo y puede leer código, pero necesita ayuda para ubicar responsabilidades, arquitectura, debugging y buenas prácticas.

### Después de cada tarea, el agente debe responder:

1. **Qué se hizo** - Resumen de la acción.
2. **Por qué se hizo así** - Contexto architectural.
3. **Archivos tocados** - Lista de archivos modificados.
4. **Cómo probarlo** - Pasos para verificar.
5. **Qué aprendí** - Insight clave del cambio.
6. **Riesgos o puntos a vigilar** - Problemas potenciales.
7. **Próximo paso** - Siguiente acción.

### El agente debe explicar brevemente:
- Qué problema se resuelve.
- Qué capa se toca.
- Por qué se toca ahí.
- Cómo probar el cambio.
- Dónde mirar si falla.

No dar tutoriales largos salvo que el usuario los pida.

---

## Decisiones cerradas

| # | Decisión | Resolución |
|---|----------|-----------|
| 1 | Scoring | Resultado exacto = 3 pts, ganador correcto = 1 pt, incorrecto = 0 pts |
| 2 | Framework UI | React |
| 3 | Desempate | 1. Mayor cantidad de resultados exactos -> 2. Mayor cantidad de aciertos de ganador/empate -> 3. Mayor cantidad de fechas/grupos/etapas participadas -> 4. Sorteo si persiste el empate |
| 4 | jornadas | Las que defina FIFA |
| 5 | No predicho | 0 puntos |
| 6 | Alias | Autogenerado: iniciales nombre + apellido + DDMM de nacimiento. No editable |
| 7 | Cambio de alias | No |
| 8 | Colisión de alias | Formato incluye fecha de nacimiento, colisión prácticamente imposible |
| 9 | Estado `live` | Implementado: `upcoming`, `live`, `finished`. Las predicciones se bloquean al inicio del partido, no al estado `finished`. `live` representa partido en curso. |
| 10 | Router | react-router-dom |

---

## Backlog implementable

### Épicas y orden

| # | Épica | Estado |
|---|--------|--------|
| E1 | Estructura visual y shell | Completada |
| E2 | Domain y tipos | Completada |
| E3 | Scoring | Completada |
| E4 | Auth | Completada |
| E5 | Perfil | Completada |
| E6 | Fixture | Completada |
| E7 | Predicciones | Completada |
| E8 | Rankings | Completada |
| E9 | Admin | Completada |
| E10 | Hardening | Parcial |

### Qué se puede mockear en primera instancia

> La sección de mocks aplica solo para desarrollo local offline. En producción usar datos reales.

- Datos de perfil, partidos, predicciones y rankings para desarrollo offline (`src/prode/data/mocks.ts`)
- El cliente Supabase permite desarrollo sin conexión a internet usando datos locales

### Estado de conexión Supabase

| Requisito | Estado |
|-----------|--------|
| React integration en Astro funcionando | Listo |
| Página `/prode` renderiza sin errores | Listo |
| Todos los tipos TypeScript definidos | Listo |
| Lógica de scoring implementada y testeada | Listo |
| Cliente Supabase configurado | Listo |
| Tablas creadas en Supabase (profiles, matches, predictions) | Listo |
| Google OAuth configurado | Listo |
| RLS policies creadas | Listo |

---

## Comandos disponibles

Verificar antes de comprometer cambios:
- `npm run lint` - Linting
- `npm run typecheck` - Verificación de tipos
- `npm run test` - Tests (si existen)

---

## Fixture y datos reales del Mundial 2026

### Fuente de verdad

- **Fuente primaria**: sorteo oficial FIFA (5 diciembre 2025), partidos publicados en Wikipedia/FIFA.
- **Archivo fuente**: `src/prode/data/fixture-world-cup-2026.ts` — fixture legible, auditable, tipado.
- **Migration**: `supabase/migrations/009_fixture_reset_2026.sql` — reset + seed de los 104 partidos.
- **48 equipos, 12 grupos (A-L), 104 partidos** (72 grupos + 16 R32 + 8 R16 + 4 QF + 2 SF + 1 3er + 1 Final).
- Horarios convertidos a UTC desde hora local oficial (según sede).
- Eliminatorias con date UTC = null hasta confirmación FIFA; placeholders basados en bracket oficial.

### OpenLigaDB y sync-matches

- **OpenLigaDB NO es fuente confiable para world-cup-2026** (liga `wm26`).
- La edge function `sync-matches` **está protegida**: para `world-cup-2026` solo actualiza `home_score`, `away_score` y `status`. Nunca sobreescribe equipos, fechas, phase, match_number ni group.
- Para `world-cup-2026`, `sync-matches` **no inserta partidos nuevos** (skip con warning).

### Datos beta (no mezclar con producción)

Los siguientes datos son de prueba y **no deben mezclarse** con el producto final:

- Liga Argentina de prueba (`beta-liga-argentina`)
- Equipos locales inventados (Belgrano, Racing, etc.)
- Semifinales con equipos de Liga Argentina
- `src/prode/data/mocks.ts` usa `beta-liga-argentina`, no afecta producción

### Verificaciones obligatorias después de cargar fixture

- 104 partidos totales
- 72 partidos de fase de grupos (12 grupos A-L × 6 partidos)
- Cada grupo con 4 equipos, 6 partidos, sin duplicados de pares
- Sin match_number duplicados
- Sin horarios inventados (todos convertidos desde hora local de sede)
- Sin datos beta mezclados con `world-cup-2026`
- Eliminatorias con placeholders verificados, date UTC = null hasta confirmación

---

## Estado esperado de Supabase

### Tablas y views públicas

| Objeto | Tipo | Descripción |
|--------|------|-------------|
| `profiles` | tabla | Perfil de usuario (FK auth.users) |
| `matches` | tabla | Partidos con resultado y estado |
| `predictions` | tabla | Predicciones de usuarios |
| `public_aliases` | view | Solo (id, public_alias) - sin datos privados |
| `rankings` | view | Solo (alias, points, exact_predictions, correct_winners) - sin datos privados |

### RLS activo en

- `profiles` - rowsecurity true
- `matches` - rowsecurity true
- `predictions` - rowsecurity true

### Policies esperadas

**profiles:**
- `profiles_select_own` - usuario ve su propio perfil
- `profiles_insert_own` - usuario crea su propio perfil
- `profiles_update_own` - usuario actualiza su propio perfil
- `profiles_admin_select` - admin ve todos los perfiles
- `profiles_admin_update` - admin actualiza cualquier perfil
- **NO debe existir** `profiles_select_public` ni policy con `USING (true)` que exponga todos los campos

**predictions:**
- `predictions_select_own` - usuario ve sus propias predicciones
- `predictions_insert_before_match` - inserta solo si el partido no empezó
- `predictions_update_before_match` - actualiza solo si el partido no empezó
- `predictions_admin_all` - admin tiene acceso total
- **NO debe existir** `predictions_select_all_auth` - usuarios comunes no deben leer predicciones crudas de otros

**matches:**
- `matches_select_all` - lectura pública del fixture
- `matches_admin_insert` - solo admin crea partidos
- `matches_admin_update` - solo admin actualiza partidos/resultados
- `matches_admin_delete` - solo admin elimina partidos

### Grants esperados

```
profiles:
  authenticated -> SELECT, INSERT, UPDATE
  anon -> sin permisos

predictions:
  authenticated -> SELECT, INSERT, UPDATE
  anon -> sin permisos

matches:
  anon -> SELECT
  authenticated -> SELECT
  admin -> INSERT, UPDATE, DELETE (via RLS + is_admin)

public_aliases:
  anon -> SELECT
  authenticated -> SELECT

rankings:
  anon -> SELECT
  authenticated -> SELECT
```

---

## Hardening de seguridad

### Función is_admin()

La función `is_admin()` debe usarse para proteger todas las acciones admin en RLS.

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
```

### profiles_update_own con WITH CHECK

```sql
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

### Reglas de seguridad

- La seguridad real está en Supabase/RLS, **no en la UI**
- El admin panel en frontend no es suficiente - RLS debe impedir acciones no autorizadas
- Usuario común no debe poder cambiar roles ni acceder a acciones admin
- Cambios de rol/admin deben estar protegidos por RLS con `is_admin()`
- `predictions_select_all_auth` debe eliminarse - el ranking público se consume desde `rankings` view

---

## Auditoría funcional pre-lanzamiento

Verificar todos estos puntos antes de lanzar a producción:

1. Login con Google funciona y redirige correctamente
2. Creación de perfil con alias autogenerado
3. Edición de perfil (nombre, WhatsApp)
4. Aceptación de reglas al registrarse
5. Carga de predicciones para partidos abiertos
6. Edición de predicciones antes del inicio del partido
7. Bloqueo automático de predicciones al inicio del partido (no al estado `finished`)
8. Cálculo correcto de puntos (3 exacto, 1 ganador, 0 incorrecto)
9. Ranking por fecha/grupo/etapa
10. Ranking general
11. Admin: crear partidos y cargar resultados
12. Admin: verificar que usuario común no pueda acceder a acciones admin
13. No exposición de datos privados en rankings (alias público solo, sin email/WhatsApp/nombre)
14. Fixture real del Mundial sin duplicados, equipos correctos, horarios consistentes
15. Mobile usable - navegación, ingreso de predicciones, visualización de rankings
16. `npm run typecheck` pasa sin errores
17. `npm test` pasa (20 tests en scoring, locking, ranking)
18. Build completo sin errores

---

## Sistema de tracking GA4

### Arquitectura

El tracking usa **un solo listener global delegado** en `GoogleAnalytics.astro` + la **util compartida** `src/lib/analytics.ts` con constantes tipadas.

| Capa | Archivo | Rol |
|---|---|---|
| Constantes | `src/lib/analytics.ts` | `ANALYTICS_EVENTS` y `ANALYTICS_LEGACY_EVENTS` (event names como const) |
| Carga GA4 | `src/components/GoogleAnalytics.astro` | Loader inline de gtag + listener global (click delegation) + IntersectionObserver (section_view) |
| Atributos declarativos | Componentes Astro | `data-analytics-event`, `data-analytics-legacy`, `data-analytics-location` en elementos HTML |
| Componente Button | `src/components/Button.astro` | Renderiza `data-analytics-*` attributes; **no tiene `onclick` inline** |
| Prode SPA | `src/prode/utils/analytics.ts` | Su propio `trackEvent()` helper (no refactorizado); `FreshaCTA.tsx` usa `trackEvent` |
| FAQ | `FAQ.astro` | Script inline con `toggle` event delegation + dual-fire + `question_id` |

### Cómo funciona el listener global

En `GoogleAnalytics.astro` hay un script inline que se ejecuta al cargar la página:

1. **Click delegation**: escucha `click` (capture phase) en `document`. Si el target (o un ancestro) tiene `[data-analytics-event]`, dispara el evento GA4. Si además tiene `[data-analytics-legacy]`, dispara también el evento legacy (colon-style).
2. **Section visibility**: `IntersectionObserver` sobre `[data-analytics-section-view]`. Dispara `section_view` con `section_id` una sola vez por sesión (almacenado en `sessionStorage`). Threshold 50%.

### Diccionario de eventos

| Evento nuevo | Origen | Params | Legacy (dual-fire) |
|---|---|---|---|
| `click_reservar_turno` | Hero, Servicios (Button) | `location: 'hero'\|'servicios'` | `click:turno` |
| `click_beneficio_mananas` | Beneficios card Mañanas | — | `click:beneficio_mananas` |
| `click_beneficio_gei` | Beneficios card GEI | — | `click:beneficio_gei` |
| `click_prode_reservar` | Prode FreshaCTA | `location: 'prode_dashboard'` | — |
| `click_whatsapp` | Footer (wa.me) | — | — |
| `click_instagram` | Footer Instagram | — | — |
| `click_email` | Footer mailto | — | — |
| `click_ubicacion` | DondeEstamos "Cómo llegar" | — | — |
| `faq_open` | FAQ accordion | `question_id` (texto de pregunta truncado a 60 chars) | `click:faq_open` |
| `section_view` | IntersectionObserver | `section_id` (id del elemento HTML) | — |

### Reglas

- Todos los eventos nuevos usan **minúsculas + guión bajo**. Sin `:` en nombres nuevos.
- Los eventos legacy (`click:turno`, `click:faq_open`, `click:beneficio_*`) se mantienen disparando en paralelo (dual-fire) para no romper históricos de GA4.
- El listener global usa `try/catch` + guard `typeof gtag === 'function'` + SSR guard (`typeof window !== 'undefined'` en helpers, aunque el script es browser-only). No falla si ad-blocker bloquea gtag.
- El `sessionStorage` para section_view se resetea al cerrar pestaña.
- No se envía PII (email, teléfono, nombre, alias, user_id) a GA4.
- Para agregar un nuevo punto de tracking en la landing: solo agregar `data-analytics-event="nombre_evento"` al elemento HTML. Si necesita legacy, agregar `data-analytics-legacy="evento:viejo"`. Si necesita params contextuales, usar `data-analytics-location="..."`.

### Verificación

1. Abrir la web con GA Debug (extension Chrome) habilitada.
2. Click en cada CTA: deben aparecer dos eventos en GA4 — el nuevo (`click_reservar_turno`) y el legacy (`click:turno`).
3. Abrir FAQ: deben aparecer `faq_open` + `click:faq_open` con `question_id`.
4. Scrollear: `section_view` debe aparecer una sola vez por sección (threshold 50%).
5. `npm run typecheck` y `npm run lint` sin errores.