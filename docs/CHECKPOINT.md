# Checkpoint — sistema financiero (tesorería)

> Fecha: 2026-10-20 · Rama: `main` · Último commit: `5063f5f`

## Qué quedó cerrado en esta sesión

| Commit | Contenido |
|---|---|
| `f6823fe` | Registrar pago aplicado (E5-04): `POST /api/finanzas/pagos` + tab "Pagar". |
| `9e540f6` | Egreso directo (concept + resultLineId) + filtro de naturaleza COSTO/GASTO. |
| `e37d603` | Cierre de decisiones de negocio + spec de reversión de pagos. |
| `5063f5f` | Reversión de pagos (`reversePayment`) + migración `022` (`reversed_at`). |

## Estado general

- **Dominio/aplicación:** E0–E7 implementados (períodos, libro, maestros, tesorería, previsión, reportes). ~80–85%.
- **UI (E5):** Tablero, Agenda, Alta obligación, Registrar pago. **Falta:** pantalla cierre/conciliación (E5-05), reversión desde UI.
- **Decisiones de negocio:** cerradas (ver `docs/specs/sistema-financiero-cierre-decisiones-negocio.md`).
- **Tests:** 267 unit tests verdes. `typecheck` y `build` pasan.

## ⚠️ Pendiente de aplicar en Supabase

- **Migración `022`** (`payment_applications.reversed_at`) **no está aplicada**. Requiere `supabase db push` antes de usar reversión (y el endpoint que aún no existe) en producción.

## Próximos pasos

1. Aplicar migración `022`.
2. Exponer reversión: `POST /api/finanzas/pagos/{id}/revertir` + botón en Agenda (spec `sistema-financiero-sprint-30-reversion-pagos.md`, §4).
3. E5-05: pantalla de cierre y conciliación.
4. Implicancias de código pendientes: P6 (inversión "avisa" vs "bloquea"), P7 (retiro del dueño contra cuenta corriente), P-CAP (umbral + depreciación).

## Datos que faltan del dueño (no bloquean)

P1 (sueldo), P2 (reserva mínima), P3 (clasificar cuentas reales), P8 (fecha de corte), P15 (hora de corte), umbral P-CAP.
