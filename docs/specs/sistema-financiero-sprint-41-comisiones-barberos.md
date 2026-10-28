# Spec — Sistema financiero sprint 41: Comisiones a barberos (devengo + pago)

> Expone el pago de comisiones a barberos independientes. Algunos cobran el día, otros acumulan la semana y cobran todo junto. El modelo es **devengado**: la comisión es gasto del día en que se genera; el pago es otro hecho (diario o semanal).

## 1. Problema

La barbería paga comisión diaria a cada barbero (Ezequiel, Aaron, Elias, Pedro). El cierre diario recibe un mensaje con la comisión por barbero, discriminada por medio de pago (`efect` / `mp`). Hoy no hay forma de registrar:
- el **devengo** (gasto del día), y
- el **pago** (que puede ser el mismo día o acumular la semana).

Sin devengo, un barbero semanal distorsiona el resultado de toda la semana (su comisión es gasto de lunes a viernes, no del sábado en que se le paga).

## 2. Modelo contable

Dos hechos, dos asientos balanceados:

**Devengo (diario, para todos los barberos):**
```
Db 5.1  Comisiones a barberos          X
    Hr 2.1.1 Comisiones a pagar a barberos   X
```

**Pago (diario para unos, semanal completo para otros):**
```
Db 2.1.1 Comisiones a pagar a barberos   X
    Hr 1.1.1 Efectivo                      split_efectivo
    Hr 1.1.3 Mercado Pago                  split_mp
```

- El **gasto** (5.1) se reconoce el día de la venta (devengado), no el día del pago.
- El **pasivo** (2.1.1) acumula "cuánto le debo a cada barbero" (saldo por persona).
- El **reparto efectivo/MP** es propiedad del **pago**, no del devengo (el devengo es un total).

**Saldo pendiente por barbero** = Σ devengos − Σ pagos.

## 3. Decisiones

| # | Decisión | Resolución |
|---|---|---|
| 1 | Barberos | `persons` (kind PERSONA). Seed Ezequiel / Aaron / Elias / Pedro. |
| 2 | Línea de resultado | "Comisiones a barberos" → naturaleza `COSTO`, `ledger_account_id = '5.1'`. |
| 3 | Pasivo | sub-cuenta propia `2.1.1` "Comisiones a pagar a barberos" (PASIVO, postable). |
| 4 | Devengo vs pago | Dos operaciones separadas. |
| 5 | Pago semanal | Completo: salda **todo** el pendiente del barbero (no parciales). |
| 6 | Reparto por cuenta | Solo en el pago (multi-cuenta). El devengo es un total único. |
| 7 | Permiso | `REGISTER_COMMISSION` (DIRECCION, TESORERIA). |
| 8 | Moneda | ARS. |
| 9 | Atribución por barbero | Obligatoria (normalización de datos); el barbero es `person`, no cuenta contable. |
| 10 | Validación de pago | El pago no puede exceder el saldo pendiente del barbero (validación server-side, no de UI). |

## 4. Contratos API

```ts
// GET /api/finanzas/comisiones -> { barbers, accounts, periods, balances }
//   balances: [{ barberId, pending: Money }]  (pendiente = devengos − pagos)
// POST /api/finanzas/comisiones/devengar -> { barberId, amount, currency, effectiveDate, periodId } -> 201 { record }
// POST /api/finanzas/comisiones/pagar    -> { barberId, effectiveDate, periodId, distributions: [{ accountId, amount }] } -> 201 { payment }
```

Errores: `BARBER_NOT_FOUND`, `COMMISSION_EXCEEDS_PENDING`, `DISTRIBUTION_MISMATCH`, `ACCOUNT_NOT_AVAILABLE`, `PERIOD_NOT_FOUND`, `PERIOD_CLOSED`, `PERMISSION_DENIED`.

## 5. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/commissions.ts` | Tipos + `pendingBalance` (suma en unidades menores). |
| `src/finanzas/application/commissions-service.ts` | `registerCommissionDevengo` + `registerCommissionPayment`. |
| `src/finanzas/domain/permissions.ts` | `REGISTER_COMMISSION` en `PermissionAction` + `RBAC_MATRIX`. |
| `src/finanzas/repositories/supabase-repositories.ts` | `SupabaseCommissionRepository` (records + payments + distributions). |
| `supabase/migrations/026_commissions.sql` | Tablas + seed (barberos, result line) + RLS. |
| `src/finanzas/presentation/container.ts` | Cablear `CommissionsService`. |
| `src/finanzas/presentation/comisiones.ts` | handlers (nuevo). |
| `src/pages/api/finanzas/comisiones.ts` | `GET`. |
| `src/pages/api/finanzas/comisiones/devengar.ts` | `POST`. |
| `src/pages/api/finanzas/comisiones/pagar.ts` | `POST`. |
| `src/finanzas/ui/Comisiones.tsx` | Pantalla (nuevo). |
| `src/finanzas/ui/FinanzasNav.tsx` | Tab "Comisiones". |
| `src/finanzas/ui/FinanzasShell.tsx` | Ruta lazy. |
| `src/finanzas/domain/__tests__/commissions.test.ts` | Tests de dominio (nuevo). |
| `src/finanzas/application/__tests__/commissions-service.test.ts` | Tests de servicio (nuevo). |
| `src/finanzas/presentation/__tests__/comisiones.test.ts` | Tests de handlers (nuevo). |

## 6. Criterios de aceptación

- `npm run test` / `typecheck` / `lint` / `build` pasan.
- Devengar → `201`, asiento `Db 5.1 / Hr 2.1.1`.
- Pagar completo → `201`, asiento `Db 2.1.1 / Hr 1.1.x (split)`, movimientos OUT por cuenta.
- Pagar más que el pendiente → `COMMISSION_EXCEEDS_PENDING`.
- Distribuciones del pago que no suman el total → `DISTRIBUTION_MISMATCH`.
- Saldo pendiente por barbero decrementa tras cada pago.

## 7. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| Comisión como costo (5.1) asume barberos independientes (monotributo). | Confirmado por el negocio. Si cambian a dependientes, migrar a 5.3 + 2.2 + cargas sociales (épica aparte). |
| Suma del pendiente (float) | Se calcula en unidades menores (`bigint`) en dominio; la UI solo muestra. |
| Reparto por cuenta en UI | Mismo patrón que Ingresos (restante por distribuir = 0). |

## 8. Rollback

Revertir handlers/rutas/UI, quitar `CommissionsService` del contenedor y el seed (migración 026 reversible con DROP).
