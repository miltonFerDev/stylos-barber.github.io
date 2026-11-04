# Recepción Virtual Stylo's — Evaluación de viabilidad

> Fase PLAN · Noviembre 2026 · Decisión aprobada

## 1. Decisión de arquitectura

La recepción virtual se compone de **tres piezas**, dos de las cuales ya existen:

| Pieza | Rol | Estado | Base |
|---|---|---|---|
| **Pronto** (fork) | Reservas, agenda, clientes, recepción | A evaluar/integrar | `github.com/SGrappelli/pronto` |
| **Chat liviano** (a construir) | Mensajería humana con recepción | A construir | Supabase (Realtime + Postgres + Auth) |
| **`/finanzas`** (existente) | Registro de la operación (ingresos + comisiones) | Ya operativo | `stylosbarber.com.ar/finanzas` |

## 2. Pronto — base de reservas

**Veredicto:** base excelente para la mitad de reservas/agenda/recepción.

- Licencia **MIT** (fork libre, uso comercial).
- Stack **Next.js 16 + Supabase** (la misma base que el sitio y `/finanzas`).
- Doble reserva resuelta a nivel DB (4 iteraciones de migraciones).
- Seguridad seria (RLS, cierre de `anon`, fix de takeover de bots).
- Reserva **sin cuenta** (nombre + teléfono) — coincide con la restricción del PLAN.
- Import CSV desde **Fresha** — relevante para la migración.
- i18n ES incluida.

**Riesgos:** un solo mantenedor (bus factor); Next.js (app separada, no embebe en Astro); trae POS/inventario (se desactivan por módulos).

## 3. Mensajería — por qué chat liviano y no Chatwoot

Chatwoot cubre el 100% de la mensajería omnicanal (WhatsApp/Telegram/web), pero:

- Stack **Ruby on Rails + Redis + Sidekiq** → exige VPS permanente (costo operativo real).
- Sobredimensionado para 1 recepción y ~700 servicios/mes.

**Decisión:** chat liviano propio para el MVP. Chatwoot queda como plan B con un trigger claro.

## 4. Chat liviano (Opción 2)

Chat web embebido + bandeja de recepción, todo sobre Supabase.

### Modelo (3 tablas)

```text
conversations  (id, client_name, client_phone?, status, last_message_at)
messages       (id, conversation_id, sender client|agent, body, created_at)
conversation_links (conversation_id, token)   # "retomar sin cuenta"
```

RLS: cliente solo accede a su conversación (via token); recepción (rol) ve todas.

### Flujo

- **Cliente:** widget → nombre/teléfono (o anónimo) → chatea → retoma por `localStorage` + link.
- **Recepción:** bandeja + panel de chat, reusa `Supabase Auth` + `user_roles`/`has_role` de `/finanzas`.
- **Tiempo real:** Supabase Realtime (websocket), sin servidor propio.
- **Notificaciones:** email (Resend/SMTP) cuando el otro no está online.

### Esfuerzo estimado

| Pieza | Estimación |
|---|---|
| Tablas + RLS + Realtime | ~1 día |
| Widget cliente | ~1–2 días |
| Bandeja recepción | ~2–3 días |
| Email + link retomada | ~1 día |
| **Total** | **~1 semana** |

### Qué NO cubre

WhatsApp/Telegram/IG en un solo inbox; respuestas rápidas; auto-asignación; reportes de agentes. No indispensable para el MVP.

### Trigger para migrar a Chatwoot

Si aparece "WhatsApp + chat web en un mismo inbox" o "2 personas atendiendo con asignación automática".

## 5. Pendientes para cerrar PLAN

1. **Inventario de funciones de Fresha** efectivamente usadas (qué se conserva/qué se abandona).
2. **Mapa de traspaso** Pronto → `/finanzas` (appointment completado → ingreso + comisión).
3. **Presupuesto** de desarrollo y mantenimiento (recurrente vs $98k/mes de Fresha).
4. **Responsabilidades operativas** (quién atiende recepción, quién administra).

## 6. Riesgo técnico honesto

Supabase Realtime tiene límite de conexiones concurrentes (free ~200). Para ~700 servicios/mes, holgado. No es bloqueante.
