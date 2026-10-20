# Cierre de decisiones de negocio — sistema financiero

> Fase: **planificación** (no construcción). Consolida el estado de las decisiones P-* para que el backlog deje de estar condicionado por ellas.
> Complementa `docs/specs/sistema-financiero-e8-cierre-decisiones.md` (que cierra P9, P10, P12 y muestra cuáles ya están parametrizadas).
> Última actualización: **2026-10-20** (confirmado con el dueño).

## Conclusión corta

No hay decisiones de negocio que **bloqueen código**. Todo queda en uno de tres estados:

1. **Cerrada** (abajo): decisión tomada y firme.
2. **Parametrizada en dominio** (ver doc E8 §1): el dominio ya la modela con enum/flag.
3. **Dato pendiente** (abajo): es un número/fecha/clasificación que se carga en operación, no una decisión de diseño.

---

## 1. Decisiones cerradas (2026-10-20)

| # | Decisión | Resolución |
|---|---|---|
| **P-REC / P11** | Reconocimiento de obligaciones y sueldo: devengo vs pago | **Base caja.** Se registra asiento recién al pagar. Obligación y sueldo no generan devengamiento. |
| **P7** | Fondos externos / MARI (Mercado Pago) | Cuentas que no son de la barbería = `EXTERNA`. El flujo del dueño se registra como **cuenta corriente** (`nature = CUENTA_CORRIENTE`): la inyección suma y el retiro resta, se neta solo. `APORTE` = capital definitivo; `PRESTAMO` = devolución programada. |
| **P-CAP** | Inversión durable: capitalizar vs gasto | **Capitalizar** lo que supera un umbral de monto (activo fijo + depreciación lineal); **gasto** para lo menor. El umbral es dato pendiente (con contador). |
| **P6** | Inversión supera capacidad de caja | **Avisa**, no bloquea: advertencia recuperable + confirmación explícita. |
| **P13** | Suplente de Tesorería | **No** por ahora (el dueño es Dirección). |

## 2. Decisiones ya cerradas en el doc E8 (2026-10-15)

| # | Decisión | Resolución |
|---|---|---|
| **P12** | Límite monetario de reversión | **Sin límite.** Tesorería ejecuta cualquier transacción; el control es el log de auditoría append-only. No se implementa `REVERSAL_LIMIT_EXCEEDED`. |
| **P9** | Conservación de comprobantes | **5 años** (`attachment_retention_days = 1825`). |
| **P10** | Contador en MVP | **No.** Rol `CONTADOR` queda latente (solo lectura futura). |

## 3. Datos pendientes (se cargan en operación, no bloquean)

| Dato | Qué se necesita | Cuándo |
|---|---|---|
| **P1** | Importe y frecuencia del sueldo del dueño | operación (settings) |
| **P2** | Reserva mínima de caja (monto) | E6 (ForecastService) |
| **P3** | Clasificar las cuentas reales (Efectivo, Mercado Pago, banco) como propia/externa/restringida | operación / seed |
| **P8** | Fecha de corte de migración | E9 |
| **P15** | Hora de corte del día operativo (default 23:59) | operación |
| **Umbral P-CAP** | Monto a partir del cual se capitaliza | con contador |

## 4. Implicancias de código (anotadas, no implementadas aún)

- **P6 "avisa":** `InvestmentsService` hoy devuelve `INVESTMENT_EXCEEDS_CAPACITY` como bloqueo. Cambiar a advertencia recuperable + flag `confirmExceedsCapacity` (mismo patrón que `confirmPossibleDuplicate` en obligaciones).
- **P7 "cuenta corriente":** el dominio ya tiene `ExternalSettlement.nature = PRESTAMO | APORTE | CUENTA_CORRIENTE`. Falta cablear el **retiro** del dueño contra la cuenta corriente (hoy está la entrada; el egreso/retiro es el complemento).
- **P-CAP:** parametrizar umbral de capitalización + depreciación lineal (flag `investment_ledger_account`, ya previsto en el dominio).

## 5. Fuentes

- `docs/diseno-financiero/backlog-desarrollo.md` §4 (tabla de decisiones que bloquean).
- `docs/diseno-financiero/contratos-dominio.md` §8 (decisiones pendientes) y §4.2/§4.4/§4.7 (contratos de pago, fondos externos y reversión).
- `docs/specs/sistema-financiero-e8-cierre-decisiones.md` (parametrización + cierres previos).
