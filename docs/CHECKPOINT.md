# Checkpoint — sistema financiero (tesorería)

> Fecha: 2026-10-27 · Rama: `main` · Último commit: `b1260c0`

## Qué se cerró desde el checkpoint anterior (2026-10-20)

| Área | Contenido |
|---|---|
| Reversión de pagos (UI) | Endpoint `POST /api/finanzas/pagos/{id}/revertir` + listado "Pagos recientes" + botón en tab Pagar (spec sprint 31). |
| Cierre y conciliación (E5-05) | Pantalla "Cierre" + `POST /api/finanzas/cierres` + `POST /api/finanzas/reconciliaciones/{id}/resolver` (spec sprint 32). |
| Rol DEV | Rol `DEV` que atraviesa toda verificación (app `hasPermission` + RLS `has_role`), migración 023 (spec sprint 33). |
| P6 | Inversión "avisa, no bloquea": `confirmExceedsCapacity` (spec sprint 34). |
| P7 | Retiro contra cuenta corriente: `registerCurrentAccountWithdrawal` + `result_line_id` nullable (migración 024, spec sprint 35). |
| P-CAP + EV-15 | Pago de inversión (`registerInvestmentPayment`), capitalizar (`1.3`) vs gastar (`5.11`) por umbral, depreciación lineal + posteo automático (spec sprint 36). |

## Reciente (sprints 37–43)

| Área | Contenido |
|---|---|
| Wiki de ayuda | Content Collection `ayuda` (5 conceptos + 4 recetas) en `/finanzas/ayuda` (sprint 37). |
| Fondos externos (UI) | Inyección + retiro (sprint 38). |
| Inversiones (UI) | Candidata → evaluar → decidir → pagar (sprint 39). |
| Transferencias + Ingresos (UI) | Tabs (sprint 40); Ingresos con reparto multi-cuenta. |
| Comisiones a barberos | Devengo (`Db 5.1 / Hr 2.1.1`) + pago con reparto por cuenta (sprint 41, migración 026). |
| Reversibilidad F1 | Transferencias, Ingresos, Comisiones (devengo + pago) reversibles con motivo + asiento reverso (sprint 42, migración 027). F2 (fondos/inversión) y F3 (obligación/cierre) pendientes. |
| Audit UX | `docs/specs/sistema-financiero-audit-ux-heuristicas.md` (10 heurísticas de Nielsen). |

## Estado general

- **Dominio/aplicación:** E0–E7 implementados. Tesorería operativa completa (pagos, reversión, transferencias, ingresos, comisiones a barberos, cierres/conciliaciones, fondos externos con retiro, inversiones con capitalización).
- **UI (E5):** completa — Tablero, Agenda, Alta obligación, Pagar (con reversión), Cierre, Fondos externos (inyección/retiro), Inversiones, Transferencias, Ingresos, Comisiones.
- **Decisiones de negocio:** cerradas (P-REC, P6, P7, P-CAP, P9, P10, P12, P13). Umbral P-CAP con placeholder `$1.000`.
- **Depreciación automática:** dominio + servicio idempotente (`postDepreciation`) + endpoint catch-up `POST /api/finanzas/depreciacion` + **Vercel Cron** (`vercel.json`) con `CRON_SECRET`.
- **Tests:** 429 unit tests verdes. `typecheck`, `lint` y `build` pasan.

## ⚠️ Migraciones pendientes de aplicar en Supabase

- `022` `payment_applications.reversed_at` (reversión de pagos).
- `023` rol `DEV` + `has_role()` con short-circuit.
- `024` `external_settlements.result_line_id` nullable (retiro contra cuenta corriente).
- `025` columnas `investments` (paid_at, capitalized, useful_life_months).
- `026` comisiones a barberos (tablas + barberos + result line `5.1`).
- `027` reversibilidad F1 (`income_records.status` + `REVERTIDO`; `commission_records/payments.status`).
- `028` actor de sistema (depreciación automática): `journal_entries.created_by` y `audit_events.actor_user_id` nullable.

> Nota: la migración `026` (pg_cron) fue descartada; la depreciación automática ahora usa **Vercel Cron** (no requiere migración en Supabase).

## Próximos pasos

**Rápidos (UX, del audit):**
1. ~~Reversibilidad F1 — Transferencias, Ingresos, Comisiones (spec sprint 42).~~ ✅ Hecho.
2. ~~Reversibilidad F2 — Fondos (inyección/retiro → reintegro) e Inversión (pago).~~ ✅ Hecho (incluye reversión de la depreciación acumulada vía asiento corrector).
3. ~~Confirmación de submits de dinero.~~ ✅ Hecho (two-step confirm en Transferencias, Ingresos, Comisiones, Pagos, Fondos).
4. ~~Traducir jerga ("Devengar" → "Registrar comisión", "Ajuste/Explicada" → "Ajustar saldo/Sin ajuste").~~ ✅ Hecho.
5. ~~Carga batch de comisiones del día.~~ ✅ Hecho (un input por barbero, un solo envío).
6. ~~Feedback en Inversiones (disabled + "procesando…").~~ ✅ Hecho (estado `busy` por acción).
7. ~~Unificar fetch (`useFinanzasFetch`) + linkear wiki en todas.~~ ✅ Hecho (token unificado en `getFinanzasAccessToken`; link "Ver ayuda" en todas las pantallas).

**Épicas:**
8. E4-10 adjuntos/comprobantes privados (storage Supabase).
9. E6 previsión 13 semanas (requiere P1 sueldo y P2 reserva).
10. E9 migración desde AppSheet/Google Sheets (requiere P8/P15).
11. E10 UAT + salida productiva.
12. ~~Cron de depreciación (código).~~ ✅ Hecho (GET handler + `process.env.CRON_SECRET` + actor de sistema nulo). **Falta:** setear la variable de entorno `CRON_SECRET` en Vercel (acción del dueño) y aplicar la migración `028` en Supabase.

## Datos que faltan del dueño (no bloquean)

P1 (sueldo), P2 (reserva mínima), P3 (clasificar cuentas reales), P8 (fecha de corte), P15 (hora de corte), umbral P-CAP (hoy placeholder `$1.000`).
