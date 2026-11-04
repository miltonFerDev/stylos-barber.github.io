# Checkpoint — sistema financiero (tesorería)

> Fecha: 2026-11-04 · Rama: `main` · Último commit: `9554f61`

## Estado general

Tesorería **feature-complete**: dominio, aplicación, repos, endpoints y UI de todo el flujo de caja operativo. Falta UAT, previsión (E6) y migración desde AppSheet (E9) — las dos últimas bloqueadas por datos del dueño.

- **Dominio/aplicación:** E0–E7 implementados. Pagos, transferencias, ingresos, comisiones a barberos, cierres/conciliaciones, fondos externos (inyección/retiro/reintegro), inversiones (con capitalización y depreciación lineal), **reversión formal** de todo lo monetario, **adjuntos privados** (storage).
- **UI (E5):** completa — Tablero, Agenda, Alta obligación, Pagar, Cierre, Fondos, Inversiones, Transferencias, Ingresos, Comisiones. Con confirm de dos pasos en submits de dinero, feedback de carga, batch de comisiones y "Ver ayuda" en todas.
- **Decisiones de negocio:** cerradas (P-REC, P6, P7, P-CAP, P9, P10, P12, P13). Umbral P-CAP con placeholder `$1.000`.
- **Depreciación automática:** dominio + servicio idempotente (`postDepreciation`) + **Vercel Cron** (`vercel.json`, `GET /api/finanzas/depreciacion`). `CRON_SECRET` seteado; actor de sistema con `created_by`/`actor_user_id` nullable (migración 028).
- **Tests:** 429 unit tests verdes. `typecheck`, `lint` y `build` pasan. Deploy en producción (`stylosbarber.com.ar`).

## Cerrado en esta sesión (desde `a89441c`)

| Commit | Contenido |
|---|---|
| `ecbf900` | **Reversibilidad F1** — transferencias, ingresos, comisiones (devengo + pago) con motivo + asiento reverso + movimientos inversos. |
| `68715d5` | Fix `idempotency_key` única por movimiento (antes chocaba con el UNIQUE de `account_movements`). |
| `43f1ed6` | **UX p1** — jerga ("Devengar"→"Registrar comisión", "Ajuste/Explicada"→"Ajustar saldo/Sin ajuste"), batch de comisiones, feedback en Inversiones, confirm de submits, unificar fetch + "Ver ayuda". |
| `1be86af` | **Reversibilidad F2** — fondos (inyección/retiro → reintegro) e inversión (pago → aprobada). |
| `5797c2e` | **Cron depreciación** — GET handler + `process.env.CRON_SECRET` + actor de sistema nulo. |
| `e820335` | **Deudas técnicas** — batch de comisiones idempotente (`commission:fecha:barbero`) + reversión de la depreciación acumulada de un activo. |
| `9554f61` | **E4-10 adjuntos** — bucket privado + subida/lista/descarga firmada + UI en "Pagos recientes". |

## Migraciones

- `022`–`028`: **aplicadas en Supabase** (confirmado por el dueño; `CRON_SECRET` también seteado en Vercel).
- `029` (bucket privado `attachments`, E4-10): **pendiente de aplicar** — sin él la subida de adjuntos devuelve 500.

## Próximos pasos

1. **Aplicar migración `029`** en Supabase (crea el bucket `attachments`).
2. **E10 UAT + salida productiva** — validar los flujos de tesorería end-to-end antes de lanzar.
3. **E6 previsión 13 semanas** — requiere P1 (sueldo) y P2 (reserva mínima).
4. **E9 migración AppSheet/Google Sheets** — requiere P8 (fecha de corte) y P15 (hora de corte).

## Datos que faltan del dueño (no bloquean)

P1 (sueldo), P2 (reserva mínima), P3 (clasificar cuentas reales), P8 (fecha de corte), P15 (hora de corte), umbral P-CAP (hoy placeholder `$1.000`).

## Límites conocidos (documentados en código)

- **Reversión de depreciación** usa `accumulatedDepreciation(..., now)`: si el cron no está al día, el corrector revierte el total teórico, que puede no coincidir con lo realmente posteado (hoy no pica: no hay depreciación posteada).
- **Adjuntos**: el `entityType`/`entityId` no valida que el documento exista (vínculo libre). Ok para comprobantes; integridad referencial sería un upgrade.
