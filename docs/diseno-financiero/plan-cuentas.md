# D2 — Plan de cuentas interno inicial

> Entregable **D2** de la spec `docs/specs/sistema-financiero-diseno.md` (§5).
> Bloque **B1** (D1 + D2). Fase: diseño. **No implementa código ni DDL ejecutable.**
> Depende de `ER.md` (D1) para la separación cuenta financiera ↔ cuenta contable.
> Fuentes: F1 §4.1, §11–§12; F2 §5, §8, §9, §13, §13.1; decisiones **P3**, **P7** (spec §10).

## 0. Estado y alcance

- **Estado:** v0 borrador. **No congelado.** Depende de P3 (naturaleza/titularidad de cuentas) y de la validación conjunta Dirección + Tesorería.
- **Incluye:** jerarquía propuesta, naturaleza, vigencia, mapeo cuenta financiera ↔ cuenta contable, tratamiento MARI como externa, reglas de disponibilidad.
- **Excluye:** matriz de contabilización (D3), asientos concretos, DDL.
- **Regla de rechazo §9:** el plan de cuentas es un dato de dominio; las cuentas externas nunca se calculan como disponibilidad propia.

## 1. Dos conceptos que no deben confundirse

| Concepto | Qué es | Dónde vive | Ejemplo |
|---|---|---|---|
| **Cuenta financiera** | Lugar donde está el dinero (efectivo, banco, billetera, transitoria). | `accounts` (D1 §3.2) | `Efectivo`, `Santander DENNYS` |
| **Cuenta contable** | Clasificación interna del libro (débitos/créditos). | `ledger_accounts` (D1 §3.2) | `1.1.1 Efectivo`, `5.2 Sueldo de Dirección` |

La interfaz trabaja con **lenguaje de negocio** (RNF-012): Dirección y Tesorería no ven débitos/créditos. La contabilidad es interna y automática (F1 §4.1).

## 2. Jerarquía propuesta

Código jerárquico de 3 niveles (`N.N.N`). Es **ampliable** hacia un plan contable completo sin reestructurar el núcleo (F1 §4.1). Naturaleza por rama.

```
1  ACTIVO
  1.1 Disponibilidades (cuentas financieras propias)
    1.1.1 Efectivo
    1.1.2 Bancos
    1.1.3 Billeteras virtuales
    1.1.4 Tarjetas a acreditar  (puente hasta el depósito)
    1.1.5 Cuentas transitorias  (puente de traslados)
  1.2 Cuentas por cobrar                             (FUTURO — activo)
  1.3 Bienes de uso                                  (FUTURO — activo)
2  PASIVO
  2.1 Obligaciones a pagar                           (proveedores, servicios, impuestos)
  2.2 Sueldo a pagar
  2.3 Fondos de terceros / cuentas con contrapartes  (MARI — PENDIENTE P7)
3  PATRIMONIO
  3.1 Aportes de propietarios
  3.2 Resultados acumulados
  3.3 Retiros de propietarios  (contra-patrimonio; no es gasto operativo)
4  INGRESOS
  4.1 Ingresos por servicios
  4.2 Ingresos por productos
  4.3 Otros ingresos
  4.4 Devoluciones y ajustes de ingreso  (contra-ingreso)
5  COSTOS Y GASTOS
  5.1 Comisiones                      (costo operativo directo — se muestra separado)
  5.2 Sueldo de Dirección             (gasto operativo de gestión)
  5.3 Sueldos de personal
  5.4 Alquiler
  5.5 Servicios básicos
  5.6 Proveedores e insumos
  5.7 Marketing
  5.8 Honorarios
  5.9 Impuestos
  5.10 Gastos varios
  5.11 Reformas y equipamiento       (extraordinario; se identifica aparte)
6  TRANSITORIAS / PUENTES              (clearing — sin resultado, saldo cero al cerrar)
  6.1 Puente de traslados entre cuentas propias
  6.2 Puente de tarjetas a acreditar
  6.3 Puente de fondos externos (MARI)
```

### Naturaleza por rama

| Rama | Naturaleza | Afecta resultado |
|---|---|---|
| 1 Activo | Activo (deudora) | No |
| 2 Pasivo | Pasivo (acreedora) | No |
| 3 Patrimonio | Patrimonio | No (retiros/aportes no son resultado) |
| 4 Ingresos | Resultado positivo | Sí |
| 5 Costos y gastos | Resultado negativo | Sí |
| 6 Transitorias | Puente | No (debe netear a cero) |

## 3. Diccionario de cuentas contables iniciales

Campos: `code`, `name`, `nature`, `parent_code`, `is_postable`, `valid_from`, `valid_to`.
Una cuenta es **postable** si recibe líneas de asiento; las de agrupación (nivel 1/2) no.

| Código | Nombre | Naturaleza | Padre | Postable | Notas |
|---|---|---|---|---|---|
| 1 | Activo | Activo | — | No | Agrupación |
| 1.1 | Disponibilidades | Activo | 1 | No | Cuentas propias conciliables |
| 1.1.1 | Efectivo | Activo | 1.1 | Sí | Mapea cuenta `Efectivo` |
| 1.1.2 | Bancos | Activo | 1.1 | No | Agrupa bancos; subcuentas por banco |
| 1.1.3 | Billeteras virtuales | Activo | 1.1 | No | Subcuentas por billetera |
| 1.1.4 | Tarjetas a acreditar | Activo | 1.1 | Sí | Puente previo al depósito efectivo |
| 1.1.5 | Cuentas transitorias | Activo | 1.1 | Sí | Puente de traslados |
| 2 | Pasivo | Pasivo | — | No | — |
| 2.1 | Obligaciones a pagar | Pasivo | 2 | Sí | Compromisos pendientes |
| 2.2 | Sueldo a pagar | Pasivo | 2 | Sí | Devengado vs pagado (PENDIENTE P11) |
| 2.3 | Fondos de terceros / contrapartes | Pasivo | 2 | Sí | MARI (naturaleza PENDIENTE P7) |
| 3 | Patrimonio | Patrimonio | — | No | — |
| 3.1 | Aportes de propietarios | Patrimonio | 3 | Sí | No es ingreso operativo |
| 3.2 | Resultados acumulados | Patrimonio | 3 | Sí | — |
| 3.3 | Retiros de propietarios | Patrimonio (contra) | 3 | Sí | No afecta resultado operativo |
| 4 | Ingresos | Resultado + | — | No | — |
| 4.1 | Ingresos por servicios | Resultado + | 4 | Sí | Separado de productos |
| 4.2 | Ingresos por productos | Resultado + | 4 | Sí | Separado de servicios |
| 4.3 | Otros ingresos | Resultado + | 4 | Sí | — |
| 4.4 | Devoluciones y ajustes de ingreso | Resultado − (contra) | 4 | Sí | Contra-ingreso |
| 5 | Costos y gastos | Resultado − | — | No | — |
| 5.1 | Comisiones | Resultado − | 5 | Sí | Costo directo, mostrado aparte |
| 5.2 | Sueldo de Dirección | Resultado − | 5 | Sí | Gasto de gestión |
| 5.3 | Sueldos de personal | Resultado − | 5 | Sí | — |
| 5.4 | Alquiler | Resultado − | 5 | Sí | — |
| 5.5 | Servicios básicos | Resultado − | 5 | Sí | — |
| 5.6 | Proveedores e insumos | Resultado − | 5 | Sí | — |
| 5.7 | Marketing | Resultado − | 5 | Sí | — |
| 5.8 | Honorarios | Resultado − | 5 | Sí | — |
| 5.9 | Impuestos | Resultado − | 5 | Sí | No es liquidación impositiva |
| 5.10 | Gastos varios | Resultado − | 5 | Sí | — |
| 5.11 | Reformas y equipamiento | Resultado − / activo futuro | 5 | Sí | Identificado aparte (F1 §9) |
| 6 | Transitorias / puentes | Puente | — | No | Debe netear a cero |
| 6.1 | Puente de traslados entre cuentas | Puente | 6 | Sí | — |
| 6.2 | Puente de tarjetas a acreditar | Puente | 6 | Sí | — |
| 6.3 | Puente de fondos externos (MARI) | Puente | 6 | Sí | Contrapartida de MARI |

> Las **subcuentas por entidad** (p. ej. `1.1.2.01 Santander DENNYS`, `1.1.3.01 MP Dennys`) se crean como hijas postables del nivel correspondiente y se mapean 1:1 a cada `accounts` (D1). Esta spec no fija esos códigos finales: quedan **PENDIENTE** hasta cerrar P3.

## 4. Mapeo preliminar de cuentas financieras conocidas

Fuente: F2 §8. La clasificación definitiva de titularidad es **PENDIENTE (P3)**.

| Cuenta financiera | Tipo (`kind`) | Propiedad (`ownership`) | Conciliable | ¿Disponibilidad? | Cuenta contable | Estado |
|---|---|---|---|---|---|---|
| Mercado Pago (Dennys) | Billetera | PROPIA | Sí | Sí | 1.1.3 Billeteras (subcuenta MP Dennys) | Activa |
| Mercado Pago MAI (Mailén) | Billetera | PROPIA | Sí | **No** (inactiva, con historia) | 1.1.3 (subcuenta histórica) | Inactiva |
| Mercado Pago **MARI** | Billetera | **EXTERNA** | No | **No** | 6.3 / 2.3 (según P7) | Externa |
| Efectivo | Efectivo | PROPIA | Sí | Sí | 1.1.1 Efectivo | Activa |
| Santander DENNYS | Banco | PROPIA | Sí | Sí | 1.1.2 (subcuenta) | Activa |
| Santander WASHINGTON | Banco | **PENDIENTE** | PENDIENTE | **PENDIENTE** | 1.1.2 (subcuenta) — sujeto a P3 | Por confirmar |
| BaPro MILTON | Banco / tarjeta a acreditar | **PENDIENTE** | PENDIENTE | **PENDIENTE** | 1.1.4 / 1.1.2 — sujeto a P3 | Por confirmar |
| Cuentas transitorias | Transitoria | PROPIA | Sí | No (saldo puente) | 1.1.5 / 6.x | Según diseño |

## 5. Tratamiento de cuentas externas (MARI)

Regla F2 §8, reflejada en el modelo D1:

1. El gasto se registra **una sola vez**.
2. Se identifica la cuenta/persona que aportó los fondos (`persons` + `external_settlements`).
3. Se reconoce una **deuda, aporte o cuenta corriente** según la naturaleza acordada (P7) → contrapartida en `2.3` o `3.1`.
4. **No** se modifica retroactivamente un retiro previo.
5. Un eventual reintegro **cancela el saldo con la contraparte** y no genera un segundo gasto.

**Regla dura:** `accounts.ownership='EXTERNA'` (MARI) **nunca** computa disponibilidad propia. La cuenta `6.3` es un puente que debe netear a cero al cerrarse el hecho.

## 6. Reglas de disponibilidad

| # | Regla |
|---|---|
| R-D1 | Solo cuentan en disponibilidad las cuentas `ownership='PROPIA'`, vigentes y `is_available=true`. |
| R-D2 | Cuentas `EXTERNA` (MARI) y `RESTRINGIDA` se excluyen de la caja propia; se muestran separadas. |
| R-D3 | La base es el **saldo conciliado** vigente (`daily_closings` / `reconciliations`), no el saldo teórico. |
| R-D4 | La reserva mínima es un **parámetro** (`settings_parameters`), no una cuenta contable. |
| R-D5 | Transferencias entre cuentas propias no alteran el resultado ni la disponibilidad total. |
| R-D6 | La capacidad de inversión descuenta reserva y fondos protegidos/pendientes del horizonte (§9 F1). |
| R-D7 | Cuentas inactivas no reciben operaciones nuevas, salvo históricas/legado explícito. |
| R-D8 | Ninguna cuenta externa puede presentarse como "disponible para invertir" (guarda F1 §10). |

## 7. Vigencia y evolución

- `valid_from` / `valid_to` (null = vigente). No se elimina historia; se cierra vigencia (F1 §4.1).
- Nuevas subcuentas por entidad financiera se agregan como hojas postables del nivel correcto.
- Un cambio de mapeo cuenta financiera ↔ contable se registra con nueva fila de vigencia (`account_ledger_map`, D1 §3.2).
- Ramas 1.2 Cuentas por cobrar, 1.3 Bienes de uso, y activos/impuestos quedan **reservadas** para fases futuras sin reconstruir el plan.
- **No** se replica la estructura de planillas actuales (F2 §7); es un plan contable interno nuevo.

## 8. Decisiones pendientes

| # (P) | Decisión | Efecto en D2 |
|---|---|---|
| P3 | Cuentas incluidas/restringidas; titularidad Santander WASHINGTON y BaPro MILTON; rol MARI | Define `ownership`/`is_available` y códigos finales de subcuentas. **Bloqueante de congelamiento.** |
| P7 | Naturaleza de pagos por terceros (MARI): préstamo/aporte/cuenta corriente; reintegros | Define contrapartida `2.3` vs `3.1`. |
| P1 | Importe y calendario del sueldo | `5.2` / `2.2` reciben monto; valor no se fija aquí. |
| P2 | Política de reserva mínima | Parámetro, no cuenta. |
| P11 | Sueldo: pago vs devengamiento | `5.2` + `2.2` deben soportar ambos. |

> **No-asunción:** ninguna titularidad ni naturaleza jurídica de cuenta se asume. Las celdas "PENDIENTE" quedan abiertas hasta cierre formal. El plan de cuentas es **v0 borrador**.

## 9. Trazabilidad

| Elemento | RF | Fuente |
|---|---|---|
| `accounts`, `ledger_accounts`, mapeo | RF-003, RF-004 | F1 §11; F2 §5, §13.1 |
| Tratamiento MARI externa | RF-009 | F2 §8, §22.3 |
| Disponibilidad / reserva | RF-015, RF-017 | F1 §9–§10; F2 §8, §14, §16 |
| Sueldo separado de retiros | RF-008 | F1 §4.4, §9; F2 §15 |

## 10. Próximo paso

- Validar jerarquía y mapeo con Dirección + Tesorería (depende de P3).
- Alimentar **D3 (matriz de contabilización)** con las cuentas de §2–§3.
- Registrar códigos finales de subcuentas tras cerrar P3.
