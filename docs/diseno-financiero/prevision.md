# D7 — Diseño de previsión y escenarios

> Entregable **D7** de la spec `docs/specs/sistema-financiero-diseno.md` (§5).
> Bloque **B6**. Fase: **diseño**. **No implementa código; las fórmulas son especificación reproducible, no UI.**
> Depende de `ER.md` (**D1**) y `plan-cuentas.md` (**D2**). Fuentes: F1 §9–§10; F2 §14–§16, §21, §23. Decisiones **P1**, **P2**, **P4**, **P5**, **P6**, **P14** (spec §10).

## 0. Estado y alcance

- **Estado:** **v0 borrador**. No congelado; depende de P2 (reserva), P4 (criterio de ingresos) y P6 (aprobación de inversión).
- **Incluye:** horizonte y buckets; componentes de entrada/salida con `source`+`confidence`; fórmulas de saldo proyectado y capacidad de inversión; 3 escenarios; tratamiento del sueldo y la reserva; guardas; arranque sin historial; alertas; errores y pendientes.
- **Excluye:** UI (D5), contratos (D4), asientos (D3). La previsión **nunca** genera asiento ni movimiento (D3 EV-14, D1 §1).
- **Regla §9:** las fórmulas viven en el **dominio/planificación**, no en componentes visuales (F1 §12).

## 1. Principios

| # | Principio | Base |
|---|---|---|
| F-1 | La previsión parte de **saldos conciliados**, no de saldos teóricos | F2 §14, F2 §24 |
| F-2 | Cada componente tiene **fuente** y **nivel de confianza** explícitos | RNF-011, F2 §14, RF-017 |
| F-3 | Distingue **real / estimado / proyectado** en todo momento | RNF-011, F1 §10 |
| F-4 | El **escenario conservador** actúa como guarda de inversión | F2 §23 |
| F-5 | Recalcular ante cambios en obligación, ingreso, saldo o fecha | F2 §16 |
| F-6 | **Nunca** computar cuentas externas como caja propia | F2 §8, D2 R-D8 |
| F-7 | **Nunca** contar dos veces una transferencia esperada | F2 §16 |

## 2. Horizonte y buckets

- **Horizonte:** **13 semanas móviles** (RF-015, F2 §14).
- **Detalle diario** + **resumen semanal**. La vista semanal es la de dirección; el detalle diario resuelve vencimientos puntuales.
- **Fecha base:** último cierre conciliado vigente por cuenta (`daily_closings` `CONFIRMADO`).
- **Revisión:** al menos **semanal** (F2 §20, §23); recálculo automático ante cada cambio confirmado.

```
bucket_diario   = un día calendario (zona America/Buenos_Aires)
bucket_semanal  = semana ISO, agregando los 7 días
horizonte       = [fecha_base .. fecha_base + 13 semanas)
```

## 3. Componentes

### 3.1 Saldo de partida

| Componente | Fuente | Inclusión |
|---|---|---|
| Saldo conciliado por cuenta incluida | `daily_closings` / `reconciliations` | `ownership='PROPIA'` + `is_available=true` (D2 R-D1). |
| Cuentas externas (MARI) | `accounts.ownership='EXTERNA'` | **Excluidas** de la caja proyectada; se muestran aparte (D2 R-D2). |
| Cuentas restringidas | `ownership='RESTRINGIDA'` | Identificadas; excluidas o mostradas separadas según **P3**. |

### 3.2 Entradas proyectadas

| Componente | Fuente típica | Confianza | RF |
|---|---|---|---|
| Ingresos/cobranzas esperados | `income_forecasts` | alta/media/baja | RF-005, RF-015 |
| Transferencias externas confirmadas | `external_settlements` confirmados | alta | RF-021 |
| Aportes/financiamiento previsto | `contributions` | media | RF-008 |
| Otros cobros con fecha probable | manual | baja/media | RF-017 |

### 3.3 Salidas proyectadas

| Componente | Fuente típica | Confianza | RF |
|---|---|---|---|
| Obligaciones pendientes | `obligations` `PENDIENTE/PROGRAMADA/PARCIAL/VENCIDA` | media/alta | RF-010, RF-013 |
| Recurrencias futuras | `recurrence_rules` activas | media | RF-010 |
| Sueldo de Dirección | `settings_parameters` + `obligations` | alta | RF-016, F2 §15 |
| Inversiones aprobadas o simuladas | `investments` | alta/media | RF-017 |
| Pagos fiscales y extraordinarios | `obligations`/manual | media | RF-006 |
| Retiros planificados (si corresponde) | `owner_withdrawals` planificados | baja | RF-008 |

### 3.4 Fuente y confianza (`income_forecasts`)

Valores (`source`, D1 §3.6; F2 §14): `CONFIRMADO`, `RECURRENTE`, `MANUAL`, `PROMEDIO`, `ESCENARIO`.
Confianza: `ALTA`, `MEDIA`, `BAJA`.

| Fuente | Confianza por defecto | Nota |
|---|---|---|
| `CONFIRMADO` | ALTA | Hecho ya acordado/recibido; sin incertidumbre relevante. |
| `RECURRENTE` | MEDIA/ALTA | Basado en recurrencia conocida. |
| `PROMEDIO` | MEDIA | Promedio histórico (requiere datos confiables, F2 §14). |
| `MANUAL` | MEDIA/BAJA | Estimación de Dirección/Tesorería. |
| `ESCENARIO` | BAJA | Dependiente del escenario elegido. |

## 4. Fórmulas

### 4.1 Saldo proyectado (F1 §9)

```
saldo_proyectado(fecha) =
      saldo_conciliado_base
    + Σ ingresos_esperados(≤ fecha)
    − Σ pagos_previstos(≤ fecha)
```

- `saldo_conciliado_base`: suma de saldos conciliados de cuentas incluidas a la fecha base (F-1).
- `pagos_previstos`: obligaciones + recurrencias + sueldo + inversiones aprobadas/simuladas + extraordinarios.
- Se calcula **por fecha** (detalle diario) y se agrega por semana.

### 4.2 Menor saldo proyectado

```
min_proyectado = min sobre todas las fechas del horizonte de saldo_proyectado(fecha)
```

### 4.3 Capacidad de inversión (F1 §9)

```
capacidad_inversion = max(0, min_proyectado − reserva_operativa − fondos_protegidos)
```

- `reserva_operativa`: parámetro `settings_parameters` (**P2**), no una cuenta (D2 R-D4).
- `fondos_protegidos`: obligaciones P1 protegidas + restringidos + reserva de sueldo no transferida (F2 §16).
- Salida adicional (F2 §16): saldo mínimo antes/después, obligaciones que quedarían sin cobertura, **fecha más temprana compatible**, nivel de confianza y supuestos usados.

### 4.4 Cobertura del sueldo

```
cobertura_sueldo = (reservado + pagado) / sueldo_planificado_del_periodo
```

Estados (F2 §15): `planificado → cubierto_por_proyección → reservado → pagado → pendiente → vencido`.

### 4.5 Cobertura de obligaciones a 30 días (F1 §10)

```
cobertura_30d = fondos_proyectados_disponibles(30d) / obligaciones_proximos_30d
```

## 5. Escenarios

| Escenario | Definición | Uso |
|---|---|---|
| **Conservador** | Menor ingreso y/o mayor gasto razonable | **Guarda por defecto**; controla la autorización de inversión (F2 §16, §23). |
| **Base** | Mejor estimación disponible | Vista operativa/manual. |
| **Optimista** | Mejora plausible | **Nunca** sola para autorizar inversión (F2 §16). |

- Guardado en `income_forecasts.scenario` e `investment_evaluations.scenario` (D1 §3.6).
- El tablero (D5 §3) muestra el escenario activo de forma visible.
- Regla de autorización (a definir con **P6**): invertir solo si el escenario conservador respeta la reserva (F2 §22 pregunta 6).

## 6. Tratamiento del sueldo de Dirección

| Aspecto | Regla |
|---|---|
| Es | Obligación operativa programada (F1 §7.2). |
| Reserva | Reduce la capacidad de inversión **aunque no se haya transferido** (F2 §15). |
| Reconocimiento | Al pago o devengamiento según **P11/P-REC**; no se fija aquí. |
| Importe | Parámetro versionado (**P1**); referencia $1.500.000 editable (F1 §7.2, F2 §15). |
| Separación | **Nunca** es retiro de propietario ni distribución (D3 M-16). |
| Estados | `planificado`, `cubierto_por_proyección`, `reservado`, `pagado`, `pendiente`, `vencido`. |

## 7. Reserva operativa

- Es un **parámetro** (`settings_parameters`), no una cuenta contable (D2 R-D4).
- Política a definir (**P2**): importe fijo · N semanas de gasto · combinación.
- Mientras no esté definida, la capacidad de inversión queda **bloqueada** (`RESERVE_UNDEFINED`, D4 §5).
- Guarda: ninguna inversión puede dejar el saldo proyectado por debajo de la reserva (F1 §10).

## 8. Capacidad de inversión — restricciones (F2 §16)

- No usar saldos de cuentas **externas** como caja propia (F-6).
- No contar dos veces transferencias esperadas (F-7).
- No autorizar por escenario optimista solamente (F-4).
- Respetar reservas protegidas y obligaciones P1.
- Recalcular ante cambios en obligación, ingreso, saldo o fecha (F-5).
- La inversión candidata se incluye en el escenario **antes** de aprobar (F1 §9).

## 9. Alertas (F2 §21)

Eventos de alerta: obligación próxima sin programación · obligación vencida · sueldo sin cobertura · saldo proyectado por debajo de reserva · inversión aprobada que dejó de ser viable · cuenta sin conciliación reciente · diferencia de cierre no resuelta · pago sin comprobante obligatorio · importe real muy distinto del estimado · recurrencia fallida · período abierto fuera de plazo.

| Parámetro | Estado | Definición |
|---|---|---|
| Umbrales (días de anticipación, % desvío, semanas sin conciliar) | **PENDIENTE P14** | `settings_parameters`. |
| Canales (in-app / email / WhatsApp) | **PENDIENTE P14** | In-app en MVP (RF-026). |
| Severidad | Propuesta | Alta (cobertura), Media (desvío), Baja (informativa). |

> Umbrales y canales se definen en discovery; el diseño los **parametriza** (F2 §21).

## 10. Arranque sin historial de ingresos confiable

`Caja_diaria` son saldos de cierre, **no** ventas/cobranzas (F2 §2, §14); el historial no alcanza para estimar ingresos. Durante las primeras semanas, el escenario base combina (F2 §14):

1. estimación manual de Dirección/Tesorería (`MANUAL`);
2. calendario conocido del negocio (`RECURRENTE`);
3. datos nuevos de ingresos diarios (`income_records`, CU-012);
4. **comportamiento de comisiones como indicador secundario**, nunca como importe de ventas.

Después de acumular datos confiables: promedios por día de semana, estacionalidad y tendencias (`PROMEDIO`).

## 11. Mapeo a entidades (D1)

| Concepto | Entidad | Campos clave |
|---|---|---|
| Proyección de ingresos | `income_forecasts` | `scenario`, `forecast_date/week`, `amount`, `source`, `confidence` |
| Evaluación de inversión | `investment_evaluations` | `scenario`, `min_projected_balance`, `capacity_amount`, `earliest_date`, `assumptions`, `confidence` |
| Obligaciones | `obligations` | `due_date`, `estimated_amount`, `final_amount`, `priority`, `status` |
| Recurrencias | `recurrence_rules` | `frequency`, `next_run_on`, `is_active` |
| Sueldo/reserva | `settings_parameters` | `key`, `value`, vigencia |
| Base conciliada | `daily_closings` / `reconciliations` | `real_balance`, `as_of` |

- `income_forecasts` e `investment_evaluations` **no** tienen FK hacia `journal_entries` (D1 I-05, D3 M-04).

## 12. Errores y estados sin datos

| Código | Situación | Comportamiento |
|---|---|---|
| `STALE_RECONCILIATION` | Sin cierre conciliado reciente | No muestra capacidad; pide conciliar (F-1). |
| `RESERVE_UNDEFINED` | Reserva sin definir (**P2**) | Bloquea capacidad de inversión. |
| `FORECAST_SCENARIO_INVALID` | Escenario inexistente | Rechaza. |
| `NO_FORECAST_DATA` | Sin componentes cargados | Muestra base conciliada y vacío explícito. |
| `INCOME_SOURCE_MISSING` | Componente sin `source`/`confidence` | Rechaza (RNF-011). |

## 13. Decisiones pendientes

| # | Decisión | Impacto en D7 |
|---|---|---|
| P1 | Importe/calendario del sueldo | `sueldo_planificado`, cobertura. |
| P2 | Política de reserva | `reserva_operativa`; bloquea capacidad. |
| P4 | Criterio de proyección de ingresos (promedio/manual/combinación) | Escenario base y arranque (§10). |
| P5 | Prioridades definitivas y obligaciones protegidas | `fondos_protegidos`. |
| P6 | Reglas de aprobación de inversión / escenario que autoriza | Guarda de inversión (§5, §8). |
| P14 | Umbrales y canales de alertas | §9. |
| P11 | Sueldo: pago vs devengamiento | Momento de impacto en el libro (no en la previsión). |
| P15 | Hora de corte operativo diario | Fecha base del día. |

> **No-asunción:** ninguna decisión de negocio se resuelve; el diseño la parametriza.

## 14. Trazabilidad

| Elemento | RF | CU | Fuente |
|---|---|---|---|
| Previsión diaria/semanal 13 sem. | RF-015 | CU-013 | F1 §9; F2 §14 |
| Cobertura del sueldo | RF-016 | CU-014 | F1 §7.2; F2 §15 |
| Capacidad de inversión | RF-017 | CU-015, CU-016 | F1 §9–§10; F2 §16 |
| Fuente/confianza | RF-017, RNF-011 | CU-013 | F2 §14 |
| Reserva | RF-015 | CU-017 | F1 §22.2; F2 §22 |
| Alertas | RF-026 | — | F2 §21 |
| Arranque sin historial | RF-005, RF-015 | CU-012 | F2 §2, §14 |

## 15. Próximo paso

- Cerrar P2 y P4 con Dirección + Tesorería para viabilizar el escenario base.
- Usar estas fórmulas como casos de prueba en **D9** (previsión, capacidad, cobertura).
- Alimentar **D8 (migración)** con el requisito de saldo conciliado de corte como base de la previsión.
