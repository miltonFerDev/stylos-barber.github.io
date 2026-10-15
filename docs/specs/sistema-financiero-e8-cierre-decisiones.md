# Cierre de decisiones previas a E8 — persistencia, RLS y storage

> Fase: **planificación** (no construcción). Prepara la épica **E8** del backlog (`docs/diseno-financiero/backlog-desarrollo.md`).
> No toca código: solo ordena las decisiones abiertas (P1–P15, P-REC, P-CUENTAS, P-CAP) y dice cuáles **realmente** bloquean E8 y cuáles ya están parametrizadas en el dominio.

## Conclusión corta

De las 18 decisiones abiertas, **15 ya están parametrizadas en el dominio** (enum o feature flag) y no bloquean E8. Solo **3** conviene confirmar con el dueño antes de escribir las migrations/RLS, y las tres tienen default sensato. Es decir: **E8 se puede arrancar ya, con flags, sin esperar un cierre formal de negocio.**

---

## 1. Decisiones ya parametrizadas en dominio (no bloquean E8)

Estas no requieren decisión de negocio para construir E8: el dominio ya las modela. E8 solo necesita la columna/enum/seed correspondiente en la migración.

| # | Decisión | Cómo ya está parametrizada | Qué necesita E8 |
|---|---|---|---|
| P3 | Titularidad/naturaleza de cuentas | `Account.ownership = PROPIA \| EXTERNA \| RESTRINGIDA` (`domain/accounts.ts`) | columna `ownership` + seed de cuentas reales (dato, no schema) |
| P7 | Naturaleza de pagos por terceros (MARI) | `ExternalSettlement.nature = PRESTAMO \| APORTE \| CUENTA_CORRIENTE` (sprint 10) | columna `nature` |
| P11 / P-REC | Reconocimiento sueldo/obligaciones: caja vs devengamiento | error `RECOGNITION_POLICY_UNDEFINED`; rama EV-04/EV-08 | flag `recognition_policy` en settings |
| P-CAP | Inversión: capitalizar (`1.3`) vs gasto (`5.11`) | asiento EV-15 parametrizado (sprint 12 lo difiere a `commit`/`pay`) | flag `investment_ledger_account` |
| P-CUENTAS | Cuentas dedicadas (apertura, diferencias, anticipos, comisiones) | `plan-cuentas.md` (D2) + `ledger_accounts` jerárquicas | seed del plan de cuentas |
| P2 | Política de reserva mínima | `ForecastService` + `RESERVE_UNDEFINED` (sprint 11) | valor en `settings_parameters` |
| P5 | Obligaciones protegidas P1–P4 | `capacityToInvest.protectedFunds` input explícito (sprint 11) | — |
| P6 | Reglas de aprobación de inversión | `INVESTMENT_EXCEEDS_CAPACITY` bloquea por defecto (sprint 12) | flag bloqueo vs advertencia |

---

## 2. Decisiones que condicionan el diseño de RLS/seguridad (resolubles como config)

Estas sí tocan la forma de las policies/roles, pero se resuelven con un valor de configuración, no con un rediseño.

| # | Decisión | Impacto en E8 | Tratamiento recomendado |
|---|---|---|---|
| P12 | Límites monetarios de reversión/pagos extraordinarios; quién ejecuta vs solicita | RLS de `reversal`/`payment` + un umbral | Config `reversal_limit` (default `0` = toda reversión requiere Dirección). Rol ya existe en `RBAC_MATRIX`. |
| P13 | Suplente Tesorería, delegación temporal, aprobación de maestros | Tabla `role_delegations` + RLS de delegación | `RoleDelegation` ya modelado (`domain/identity.ts`); RLS consulta delegación activa vía `is_admin()`/función de rol. |
| P9 | Plazo de conservación de comprobantes + storage | Storage bucket privado + retención | Bucket privado ahora; retención como config (`attachment_retention_days`, default 5 años). |
| P10 | Acceso contador (solo lectura/export) en MVP o posterior | Crear rol CONTADOR + su RLS ahora o después | Flag (default: posterior). Rol `CONTADOR` ya existe en `RoleCode`. |

---

## 3. Decisiones de datos/migración (no gating E8, posponer a E9/E10)

No bloquean E8; pertenecen a migración (E9), alertas (E5/E7) u operación.

| # | Decisión | Por qué no gating E8 |
|---|---|---|
| P1 | Importe/calendario sueldo | dato en settings, se carga en operación |
| P4 | Criterio proyección de ingresos | dato (cómo se cargan `income_forecasts`) |
| P8 | Fecha de corte + alcance migración | E9 |
| P14 | Umbrales/canales de alertas | alertas aún no implementadas (E5/E7+) |
| P15 | Hora de corte operativo / cierre mensual | operación (E5/E9) |

---

## 4. Shortlist de preguntas para el dueño (únicas bloqueantes reales)

Solo estas tres valen la pena confirmar con Dirección antes de E8; el resto avanza con default:

1. **P10 — ¿El contador entra en el MVP?** *(default: no, solo lectura cuando entre)*
   - Si "no": no creamos su RLS ahora; el rol queda latente.
2. **P9 — ¿Plazo de conservación de comprobantes?** *(default: 5 años, paramétrico)*
3. **P12 — ¿Hasta qué importe puede reversar/pagar Tesorería sin aprobación de Dirección?** *(default: 0, todo requiere Dirección)*

---

## 5. Recomendación de avance

1. **Arrancar E8 ya**, con estas convenciones:
   - Roles en RLS derivados de `is_admin()` + `role_delegations` (P13 parametrizado).
   - `recognition_policy`, `reversal_limit`, `investment_ledger_account`, `attachment_retention_days` como `settings_parameters` (flags), no como decisiones cerradas.
   - Bucket de comprobantes privado desde el día uno (P9), retención configurable.
   - Contador: rol definido pero sin policies operativas hasta resolver P10.
2. **En paralelo**, pasar al dueño las 3 preguntas de §4 — **✅ hecho, ver §6**.
3. **Al tener respuesta**, ajustar solo los defaults de config (sin tocar schema).

> Esto respeta la regla del backlog: *"No construir lógica contable definitiva hasta resolver P-REC, P7, P11 y P-CAP"* — ninguno de esos se cierra aquí; se **parametrizan** explícitamente como flags, tal como vienen haciendo los sprints 1–14.

---

## 6. Decisiones cerradas (2026-10-15)

| # | Decisión | Resolución |
|---|---|---|
| P10 | ¿Contador en MVP? | **No en MVP.** Rol `CONTADOR` queda latente; solo lectura cuando se habilite en el futuro. |
| P9 | Plazo conservación de comprobantes | **Default 5 años**, paramétrico (`attachment_retention_days = 1825`). |
| P12 | Límite de reversión/pagos extraordinarios | **Sin límite monetario.** Tesorería puede ejecutar cualquier transacción; el control es el **log de auditoría obligatorio** (ya implementado: toda mutación registra `audit_events`). No se implementa `REVERSAL_LIMIT_EXCEEDED`. |

Implicancias para E8:

- `reversal_limit` **no se configura**: no hay umbral. La seguridad reposa en auditoría append-only (`audit_events` inmutable) + RLS por rol.
- `attachment_retention_days = 1825` como `settings_parameters`.
- Sin policies operativas para `CONTADOR` en E8 (P10).
