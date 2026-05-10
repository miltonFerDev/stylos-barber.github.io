# Agentes - Stylo's Barber

## Contexto del proyecto

Sitio web de Stylo's Barber (barbería). El sitio actual es el punto de partida para implementar la nueva feature Prode Mundial 2026.

---

## Feature en planificación: Prode Mundial 2026

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
- Partidos agrupados por fecha.
- Predicciones editables hasta el inicio de cada partido.
- Cuando empieza un partido, esa predicción queda bloqueada.
- Ranking por fecha/semanal.
- Ranking general.
- Premio por fecha: 50% de descuento en cualquier servicio.
- Premio final: gift card por $100.000.
- Admin inicial: solo el dueño.

---

## Reglas de planificación

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
    ui/                    # Componentes visuales puros (sin lógica de negocio)
    components/            # Componentes de presentación
    hooks/                 # Preparación de datos para vistas (view models)
    view-models/           # Estado y lógica de UI
    services/              # Reglas de negocio y flujos
    repositories/          # Acceso a Supabase
    domain/
      types/               # Tipos e interfaces TypeScript
      entities/            # Entidades de dominio
      logic/                # Lógica pura (scoring, bloqueo, etc.)
    config/
      supabase.ts          # Cliente Supabase
      constants.ts         # Constantes del prode
      env.ts               # Variables de entorno
    pages/
      index.tsx            # Página principal del prode
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

### Estructura de datos probable (Supabase)

**Tablas:**
- `users` - Perfiles de usuario (nombre real, alias, whatsapp, google email)
- `matches` - Partidos (fecha/hora, equipo A, equipo B, resultado)
- `predictions` - Predicciones de usuarios (user_id, match_id, score_a, score_b)
- `rankings` - Rankings calculados (user_id, puntaje total, posición)

**RLS Policies:**
- Usuarios solo ven/editen sus propias predicciones.
- Rankings públicos ocultan datos privados.
- Admin tiene acceso completo.

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
| 3 | Desempate | Más resultados exactos → más ganadores correctos → alfabético por alias |
| 4 | Jornadas | Las que defina FIFA |
| 5 | No predicho | 0 puntos |
| 6 | Alias | Autogenerado: iniciales nombre + apellido + DDMM de nacimiento. No editable |
| 7 | Cambio de alias | No |
| 8 | Colisión de alias | Formato incluye fecha de nacimiento, colisión prácticamente imposible |
| 9 | Estado "live" | Fuera del MVP. Solo `upcoming` y `finished` |
| 10 | Router | react-router-dom |

---

## Backlog implementable

### Épicas y orden

1. **E1: Estructura visual y shell** — Shell de la mini-app, UI primitives, dashboard skeleton con mocks
2. **E2: Domain y tipos** — Tipos TypeScript para Match, Prediction, Profile, Ranking
3. **E3: Scoring** — Lógica pura de puntaje, bloqueo y ranking
4. **E4: Auth** — Login con Google via Supabase
5. **E5: Perfil** — Onboarding con generación de alias
6. **E6: Fixture** — CRUD de partidos, vista por jornada
7. **E7: Predicciones** — CRUD de predicciones con bloqueo
8. **E8: Rankings** — Rankings semanal y general
9. **E9: Admin** — Panel mínimo para cargar partidos y resultados
10. **E10: Hardening** — Seguridad, tests, SEO, deploy

### Qué se puede mockear en primera instancia

- Datos de perfil, partidos, predicciones y rankings (todo hardcodeado en `src/prode/data/mocks.ts`)
- Auth service con sesión hardcodeada para desarrollo sin Google OAuth
- Admin panel con datos locales

### Qué debe estar sí o sí antes de conectar Supabase/Auth

1. React integration en Astro funcionando
2. Página `/prode` renderiza sin errores
3. Todos los tipos TypeScript definidos
4. Lógica de scoring implementada y testeada
5. Cliente Supabase configurado
6. Tablas creadas en Supabase (profiles, matches, predictions)
7. Google OAuth configurado
8. RLS policies creadas

---

## Comandos disponibles

Verificar antes de comprometer cambios:
- `npm run lint` - Linting
- `npm run typecheck` - Verificación de tipos
- `npm test` - Tests (si existen)