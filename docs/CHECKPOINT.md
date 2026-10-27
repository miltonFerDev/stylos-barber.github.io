# Checkpoint — sistema financiero (tesorería)

> Fecha: 2026-10-26 · Rama: `main` · Último commit: `7e88b0d`

## Qué se cerró desde el checkpoint anterior (2026-10-20)

| Área | Contenido |
|---|---|
| Reversión de pagos (UI) | Endpoint `POST /api/finanzas/pagos/{id}/revertir` + listado "Pagos recientes" + botón en tab Pagar (spec sprint 31). |
| Cierre y conciliación (E5-05) | Pantalla "Cierre" + `POST /api/finanzas/cierres` + `POST /api/finanzas/reconciliaciones/{id}/resolver` (spec sprint 32). |
| Rol DEV | Rol `DEV` que atraviesa toda verificación (app `hasPermission` + RLS `has_role`), migración 023 (spec sprint 33). |
| P6 | Inversión "avisa, no bloquea": `confirmExceedsCapacity` (spec sprint 34). |
| P7 | Retiro contra cuenta corriente: `registerCurrentAccountWithdrawal` + `result_line_id` nullable (migración 024, spec sprint 35). |
| P-CAP + EV-15 | Pago de inversión (`registerInvestmentPayment`), capitalizar (`1.3`) vs gastar (`5.11`) por umbral, depreciación lineal + posteo automático (spec sprint 36). |

## Estado general

- **Dominio/aplicación:** E0–E7 implementados. Tesorería operativa completa (pagos, reversión, transferencias, ingresos, cierres/conciliaciones, fondos externos con retiro, inversiones con capitalización).
- **UI (E5):** Tablero, Agenda, Alta obligación, Pagar (con reversión), Cierre. **Falta:** Fondos externos (inyección/retiro), Inversiones, Transferencias, Ingresos.
- **Decisiones de negocio:** cerradas (P-REC, P6, P7, P-CAP, P9, P10, P12, P13). Umbral P-CAP con placeholder `$1.000`.
- **Depreciación automática:** dominio + servicio idempotente (`postDepreciation`) + endpoint catch-up + job pg_cron (migración 026, requiere configurar URL + service key).
- **Tests:** 373 unit tests verdes. `typecheck`, `lint` y `build` pasan.

## ⚠️ Migraciones pendientes de aplicar en Supabase

- `022` `payment_applications.reversed_at` (reversión de pagos).
- `023` rol `DEV` + `has_role()` con short-circuit.
- `024` `external_settlements.result_line_id` nullable (retiro contra cuenta corriente).
- `025` columnas `investments` (paid_at, capitalized, useful_life_months).
- `026` job pg_cron de depreciación (requiere configurar `pg_cron`/`pg_net` + URL + service key).

## Próximos pasos

1. Exponer a UI: Fondos externos (inyección `registerExternalPayment` + retiro), Inversiones (candidata → pago), Transferencias, Ingresos.
2. E4-10 adjuntos/comprobantes privados (storage Supabase).
3. E6 previsión 13 semanas (requiere P1 sueldo y P2 reserva).
4. E9 migración desde AppSheet/Google Sheets (requiere P8/P15).
5. E10 UAT + salida productiva.
6. Configurar el job de depreciación (migración 026) con URL real + service key.

## Datos que faltan del dueño (no bloquean)

P1 (sueldo), P2 (reserva mínima), P3 (clasificar cuentas reales), P8 (fecha de corte), P15 (hora de corte), umbral P-CAP (hoy placeholder `$1.000`).
