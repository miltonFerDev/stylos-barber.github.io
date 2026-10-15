# Spec — Diseño del sistema financiero y de tesorería (Stylo's Barber)

> Fase: diseño. No implementa código. Solo produce artefactos de diseño en `docs/`.
> Plan previo: `app.stylos/Documentos/PLANIFICACION_SISTEMA_FINANCIERO_STYLOS.md` + `app.stylos/Documentos/ANALISIS_FUNCIONAL_SISTEMA_FINANCIERO_STYLOS.md` §25.

## 1. Resumen

Esta spec define la fase de **diseño** del sistema financiero y de tesorería propio de Stylo's Barber (aplicación web que reemplaza AppSheet / Google Sheets como plataforma operativa definitiva).

El diseño convierte el análisis funcional aprobado en artefactos construibles: modelo entidad-relación lógico, plan de cuentas interno, matriz de contabilización automática, contratos de servicios de dominio, prototipos navegables, arquitectura de seguridad, diseño de previsión y escenarios, especificación de migración y estrategia de pruebas.

No se toca `src/` ni configuración. No se implementa. Toda decisión crítica sin cierre documentado queda marcada como **PENDIENTE**, no se asume.

## 2. Objetivo de diseño

Producir un diseño completo, consistente y verificable que permita a un equipo pequeño construir el MVP descrito en planificación (§5, §8–§10) sin reconstruir el núcleo al evolucionar hacia contabilidad formal, cuentas por cobrar, activos, impuestos o integraciones con contador.

Objetivos específicos:

1. Fijar el **modelo ER lógico** coherente con el modelo conceptual (§11 planificación: `users`, `roles`, `ledger_accounts`, `journal_entries/lines`, `accounts`, `account_movements`, `daily_closings`, `reconciliations`, `obligations`, `payments`, `payment_applications`, `transfers`, `budgets`, `audit_events`, etc.).
2. Definir el **plan de cuentas interno inicial** jerárquico, con vigencia, ampliable a plan contable completo.
3. Definir la **matriz de contabilización automática**: qué documento genera qué asiento (débitos = créditos), incluyendo reversión por asiento inverso.
4. Definir **contratos de servicios de dominio** versionados (tesorería, planificación, libro/resultado, archivos, reportes) con límites explícitos entre módulos del monolito modular.
5. Producir **prototipos navegables** de: tablero Dirección, agenda Tesorería, formulario obligación, pago y conciliación, simulador de inversión (hito A).
6. Diseñar la **arquitectura de seguridad** (auth, RBAC por rol, RLS en PostgreSQL/Supabase, secretos solo servidor, comprobantes privados, auditoría).
7. Diseñar la **previsión móvil de 13 semanas** y escenarios (conservador/base/optimista) con fuentes y niveles de confianza explícitos.
8. Especificar la **migración** desde Caja diaria / egresos / comisiones / retiros / catálogos, con controles de conciliación y criterio LEGACY.
9. Definir la **estrategia detallada de pruebas** (unitarias, integración, permisos, migración, E2E, aceptación con usuarios).

## 3. Fuentes usadas

| # | Fuente | Uso en diseño |
|---|--------|---------------|
| F1 | `app.stylos/Documentos/PLANIFICACION_SISTEMA_FINANCIERO_STYLOS.md` (13-oct-2026, borrador base) | Propósito, principios (§4 + §4.1 libro balanceado), alcance MVP (§5), usuarios (§6), procesos (§7), RF-001–RF-038, reglas de negocio (§9), indicadores (§10), modelo conceptual (§11), arquitectura propuesta (§12), RNF-001–RNF-018, migración (§14), entregas (§15), hitos A–E (§16), aceptación MVP (§17), pruebas (§18), riesgos (§19) |
| F2 | `app.stylos/Documentos/ANALISIS_FUNCIONAL_SISTEMA_FINANCIERO_STYLOS.md` (13-oct-2026, iteración 1) | Glosario (§5), contextos (§6), proceso actual y riesgo de replicación (§7), cuentas conocidas y regla fondos externos (§8), modelo hechos/documentos (§9), estados y transiciones (§10), CU-001–CU-027 + continuidad rol (§11), especificación CU-003/CU-006/CU-012/CU-015 (§12), obligatoriedad e integridad (§13), gobierno de maestros (§13.1), previsión (§14), sueldo (§15), capacidad inversión (§16), permisos (§17), mapeo legado (§18), auditoría (§19), reportes (§20), alertas (§21), decisiones pendientes (§22), supuestos (§23), criterios cierre análisis (§24), entregables de diseño (§25) |
| F3 | Plan aprobado para diseño (F2 §25) | Lista cerrada de 9 entregables que esta spec desarrolla (ver §5). Es el "plan previo" requerido por el flujo Audit → Plan → Spec → Apply |

Supuestos provisionales heredados (F2 §23, no asumir más allá): una unidad de negocio, moneda principal ARS, 2 usuarios iniciales, zona `America/Buenos_Aires`, previsión con revisión semanal, escenario conservador como guarda, sin integración bancaria en MVP, ventas agregadas diarias al inicio.

## 4. Alcance (in / out)

### Incluido

- Modelo ER lógico + diccionario de datos (tipos, PK UUID inmutable, FK, constraints, `numeric(18,2)`, moneda explícita, timestamptz, vigencia, idempotency keys, período).
- Plan de cuentas interno inicial (jerarquía, naturaleza, vigencia, mapeo cuenta financiera ↔ cuenta contable).
- Matriz de contabilización automática para: ingreso/cobranza diaria, egreso, comisión, pago (total/parcial), transferencia, retiro, aporte, pago externo (MARI), ajuste, anulación/reversión, saldo inicial / migración LEGACY.
- Contratos de servicios de dominio (firmas, pre/post-condiciones, errores, idempotencia, transaccionalidad) para: obligaciones, pagos/aplicaciones, transferencias, cierres/conciliaciones, previsión, sueldo, escenarios inversión, presupuestos, períodos, auditoría, maestros guiados.
- Prototipos navegables (5 pantallas mínimas del Hito A) con flujos CU-003, CU-006, CU-012, CU-015 y gobierno de maestros.
- Arquitectura de seguridad: matriz RBAC, RLS por tabla, gestión de secretos, storage privado de comprobantes, log de accesos sensibles, backup/restore.
- Diseño de previsión 13 semanas (fórmulas, componentes, escenarios, calidad/fuente, guardas) y de capacidad de inversión.
- Especificación de migración (pipeline extraer → normalizar → importar → reconciliar → corte) con controles obligatorios y reporte de excluidos.
- Estrategia de pruebas (niveles, casos financieros mínimos, datos de prueba, criterios de salida).

### Fuera de alcance (out)

- Construcción de código en `src/`, migraciones SQL ejecutables, o configuración de Supabase/Vercel. **Prohibido en esta fase.**
- Contabilidad fiscal / libro legal, liquidación impositiva, nómina formal, facturación ARCA, inventario permanente, agenda de turnos, CRM, integración bancaria automática, app nativa, integración WhatsApp (fuera del MVP por F1 §5).
- Rediseño de la landing principal o de `/escuela` / `/prode`. No se tocan.
- Cierre de decisiones de negocio (§8): el diseño debe parametrizarlas, no imponerlas.
- Datos reales de producción o mezcla de datos beta con productivos.

## 5. Entregables

| ID | Entregable (F2 §25) | Contenido mínimo | Verifica RF / CU |
|----|----------------------|------------------|------------------|
| D1 | Modelo ER lógico | Diagrama + diccionario: entidades §11 F1, atributos, PK/FK, UNIQUE, CHECKs (balance, transferencia origen≠destino, aplicado≤pago), estados (`BORRADOR…ANULADA`, `ABIERTO→EN_REVISION→CERRADO`), vigencia de catálogos, `prediction`-like `source/confidence` en proyección, auditoría. Regla: documento operativo ≠ movimiento ≠ asiento ≠ proyección (F2 §9) | RF-003–005, RF-010–014, RF-021, RF-027–030; CU-003–006, CU-010–011, CU-020–021 |
| D2 | Plan de cuentas interno inicial | Árbol jerárquico con código, nombre, naturaleza, vigencia; mapeo cuenta financiera (Efectivo, Santander DENNYS/WASHINGTON, MP Dennys/MAI, BaPro MILTON, MARI-externa, transitorias) → cuenta contable; reglas de inclusión/exclusión en disponibilidad; tratamiento MARI como externa (F2 §8) | RF-003–004, RF-009; §8 análisis |
| D3 | Matriz de contabilización automática | Tabla evento → debe/haber por cuenta + ejemplo numérico + caso reversión (asiento inverso, original inmutable). Cubre al menos: transferencia, pago, ingreso/cobranza, comisión, retiro vs sueldo, aporte, pago externo, ajuste, migración LEGACY. Invariante: débitos = créditos; solo hechos confirmados generan asiento (estimación/escenario no) | RF-027–028 + §4.1 F1; CU-006, CU-009, CU-012 |
| D4 | Contratos de servicios de dominio | OpenAPI/TS-interfaces + pre/post-condiciones + errores tipados + idempotency-key + transacción única (pago+aplicación+movimiento+asiento). Módulos: auth/tesorería/planificación/libro/archivos/reportes. Prohibido acceso directo entre tablas de módulos (F1 §12) | RF-002, RF-012, RF-027–030; CU-006, CU-008, CU-021 |
| D5 | Prototipos navegables | 5 flujos clicables (tablero Dirección, agenda Tesorería, alta obligación con 13 preguntas CU-003, pago/conciliación, simulador inversión CU-015) + asistente alta cuenta (12 preguntas F2 §13.1). Lenguaje negocio, mobile-first operación / desktop análisis, distinción real/estimado/proyectado | Hito A; CU-003, CU-006, CU-012–016; RNF-012 |
| D6 | Arquitectura de seguridad | Matriz RBAC (F2 §17), policies RLS por tabla (patrón `is_admin()` si Supabase), storage privado, secretos server-only, sesiones, delegación temporal Tesorería con inicio/fin/motivo, log accesos sensibles, backup + prueba restore documentada | RF-001–002, RF-023; RNF-005–007; §12 F1 |
| D7 | Diseño de previsión y escenarios | Fórmulas (`saldo_proyectado`, `capacidad = max(0, min_proyectado − reserva − protegidos)`), horizonte 13 sem. diario+semanal, componentes entrada/salida, 3 escenarios, fuentes (confirmado/recurrente/manual/promedio/escenario), arranque sin historial (estimación manual + calendario + comisiones como proxy), guardas (§10 F1), sueldo estados planificado→vencido | RF-015–017; CU-013–016; F2 §14–16 |
| D8 | Especificación de migración | Inventario fuentes (§14 F1), reglas normalización, mapeo legado→destino (F2 §18), marca LEGACY + evidencia, tratamiento IDs faltantes (comisiones sin ID), 8 controles obligatorios (totales, conteos, UNIQUE, catálogos, transferencias balanceadas, apertura+mov=cierre, duplicados, excluidos), ensayo → validación Dirección+Tesorería → corte → delta → solo-lectura | RF-024; §14 F1; §18 F2 |
| D9 | Estrategia detallada de pruebas | Pirámide: unitarias (saldos, aplicaciones, previsión, capacidad, balance), idempotencia/concurrencia, integración pagos↔movimientos↔asientos, RLS/permisos, migración/conciliación, E2E flujos críticos, UAT con período real. 13 casos financieros mínimos (F1 §18) + matriz RF×caso + criterios de salida y Definition of Done (§21 F1) | RF + RNF; §18 F1 |

### Cambios detallados (por archivo) — gate SPEC

- **Crear:** `docs/specs/sistema-financiero-diseno.md` (este archivo). Único cambio permitido en esta fase.
- **No crear / no editar:** `src/**`, `supabase/**`, `*.config.*`, `.env*`, landing, `/escuela`, `/prode`, workflows de deploy.
- **Futuros artefactos de diseño (fuera de esta spec, los produce la fase de diseño, no este archivo):** `docs/diseno-financiero/{ER.md, plan-cuentas.md, matriz-contabilizacion.md, contratos-dominio.md, prototipos.md, seguridad.md, prevision.md, migracion.md, pruebas.md}` — se enumeran aquí solo como plan, no se crean ahora.

## 6. Plan de trabajo por bloques

| Bloque | Entregable | Actividades | Entradas | Salida verificable |
|--------|------------|-------------|----------|--------------------|
| B1 | D1 + D2 | Normalizar entidades §11 F1; fijar PK/FK/tipos/RNF-004; modelar vigencia; clasificar las 7 cuentas conocidas (titularidad Santander WASHINGTON y BaPro MILTON: PENDIENTE); separar cuenta financiera vs contable | F1 §4.1, §11–12; F2 §6, §8–9, §13 | ER + diccionario + plan de cuentas v0 |
| B2 | D3 | Instanciar cada RF operativo en asiento debe/haber; definir reversión y reapertura período auditada; prohibir asiento en estimado/escenario | F1 §4.1 reglas no negociables; F2 §9–10 | Matriz + ejemplos balanceados |
| B3 | D4 | Especificar casos CU-003/006/008/009/010/012/021 con transacciones e idempotencia; fijar límites entre módulos monolito modular | F1 §12; F2 §11–12 | Contratos versionados (TS/OpenAPI) |
| B4 | D5 | Prototipar 5 pantallas + asistentes (cuenta, persona, categoría, recurrencia, comisión, sueldo, reserva); test de "persona distinta ejecuta caso solo con app+docs" (F2 §24.10) | F1 §7, §16 Hito A; F2 §12–13.1 | Prototipos navegables validados |
| B5 | D6 | RBAC + RLS + storage + secretos + delegación + backup/restore; pruebas explícitas de acceso indebido (riesgo permisos) | F1 §12 seguridad; F2 §17, §19 | Amenazas + policies + plan restore |
| B6 | D7 | Fórmulas, escenarios, fuentes/confianza, sueldo (devengo vs pago: PENDIENTE), capacidad, alertas/umbrales (PENDIENTE canales) | F1 §9–10; F2 §14–16, §21 | Spec cálculo reproducible sin UI |
| B7 | D8 | Pipeline 12 pasos F1 §14 + controles; no replicar tablas (riesgo replicación F2 §7); marca LEGACY; ensayo + validación conjunta | F1 §14; F2 §7, §18 | Plan migración + checklist reconciliación |
| B8 | D9 | Matriz cobertura RF×caso, 13 casos mínimos, UAT período real, DoD §21 F1, gates Hitos B–E | F1 §16–18, §21; F2 §24 | Estrategia + criterios salida |

Orden sugerido: B1 → B2 → B3 → B4 (Hito A) → B5/B6 en paralelo → B7 → B8. Cada bloque cierra con revisión Dirección + Tesorería antes del siguiente.

## 7. Dependencias / mudanzas

- **Depende de:** aprobación conjunta Dirección + Tesorería del glosario, procesos y estados (criterios cierre análisis F2 §24.1, §24.6–7). Sin esto, B1/B2 no pueden congelarse.
- **Depende de:** confirmación de titularidad/uso de cuentas Santander WASHINGTON y BaPro MILTON, y naturaleza jurídica de cada medio (F2 §8, §22). Sin esto, D2 queda en borrador.
- **Depende de:** definición de cómo se captura el ingreso diario y su separación servicios/productos (F2 §22.1–2, §24.3). Bloquea D7 escenario base.
- **No hay mudanzas de código ni migraciones en esta fase.** Prohibido mover/renombrar archivos fuera de `docs/specs/`. Los artefactos D1–D9 futuros viven en `docs/diseno-financiero/` (a crear en fase Apply de diseño, no ahora).
- **Stack propuesto heredado (F1 §12):** Next.js + TS + PostgreSQL/Supabase, monolito modular, capas dominio/aplicación/persistencia/presentación/reportes. El diseño debe ser portable a PostgreSQL estándar (no atar dominio a Supabase).

## 8. Criterios de aceptación (checklist para Verify)

- [ ] Spec existe solo en `docs/specs/sistema-financiero-diseno.md`; `git status` no muestra cambios en `src/`, config ni workflows.
- [ ] Los 9 entregables D1–D9 están definidos con contenido mínimo verificable (§5).
- [ ] Cada entregable traza a RF/RNF/CU/fuente concretos (sin requisitos huérfanos ni inventados).
- [ ] Modelo distingue documento operativo / movimiento / asiento / proyección; invariantes (balance, inmutabilidad, reversión por inverso, idempotencia, transacción única, períodos) presentes.
- [ ] Cuenta externa (MARI) nunca computable como disponibilidad propia; transferencias sin efecto en resultado; sueldo separado de retiros.
- [ ] Previsión parte de saldos conciliados, horizonte 13 semanas, 3 escenarios, fuentes/confianza visibles, guardas F1 §10.
- [ ] Migración exige marca LEGACY, 8 controles y validación conjunta; prohíbe inventar trazabilidad.
- [ ] Seguridad exige RBAC + RLS + auditoría + backup/restore probado; permisos indebidos explícitamente testeados.
- [ ] Las 10+ decisiones críticas están marcadas PENDIENTE con dueño y fecha (§10), ninguna asumida en el diseño.
- [ ] Riesgos F1 §19 + F2 §7/§18 tienen mitigación en bloques B1–B8 (§11).
- [ ] Lenguaje de negocio, sin débitos/créditos expuestos al usuario (RNF-012); fórmulas fuera de componentes visuales.
- [ ] Principios técnicos §9 aprobados: SOLID pragmático, bajo acoplamiento, errores explícitos, invariantes cerca de los datos, sin abstracciones prematuras.
- [ ] Próxima fase (§12) definida con gate explícito antes de Apply/construcción.

## 9. Principios de diseño técnico y calidad de código

El diseño debe producir una implementación simple, auditable y resistente a errores financieros. El estándar esperado es código que pueda ser revisado de forma estricta: cada abstracción debe justificar su existencia, cada mutación monetaria debe tener una ruta clara, y las invariantes críticas deben estar protegidas por dominio, transacciones, constraints y pruebas; no solamente por la interfaz.

### Principios obligatorios

- **SOLID pragmático:** aplicar responsabilidad única, dependencias explícitas e interfaces pequeñas cuando reduzcan acoplamiento real. No crear jerarquías o capas por ceremonia.
- **Simplicidad antes que arquitectura ornamental:** preferir funciones y módulos directos si resuelven el problema con claridad. Una abstracción nueva requiere al menos una razón concreta: reutilización real, aislamiento de infraestructura, testabilidad o reducción de riesgo.
- **Dominio aislado:** cálculos de saldo, previsión, capacidad de inversión, aplicación de pagos, generación de asientos, reversión e idempotencia no pueden vivir en componentes visuales.
- **Invariantes cerca de los datos:** balance de asientos, importes positivos, moneda explícita, período abierto, pagos aplicados <= pago total, transferencia con origen distinto de destino, idempotency key y FK deben protegerse en dominio y base de datos.
- **Mutaciones concentradas:** operaciones como confirmar pago, revertir asiento, cerrar período, conciliar cuenta o aprobar inversión deben entrar por servicios de aplicación transaccionales. No se aceptan escrituras dispersas desde UI o repositorios sueltos.
- **Errores explícitos:** los servicios deben devolver errores tipados y recuperables para validación, permisos, concurrencia, duplicados, período cerrado, saldo inconsistente y comprobante faltante. No se aceptan fallos silenciosos.
- **Dependencias hacia adentro:** presentación e infraestructura dependen del dominio; el dominio no depende de Supabase, React, Next.js ni detalles de storage.
- **Reportes derivados:** dashboards y reportes leen modelos reconstruibles desde documentos/asientos/movimientos canónicos. No guardar totales manuales como fuente de verdad.
- **Tests donde hay riesgo:** toda regla financiera, permiso sensible, cálculo de previsión, reversión, idempotencia y migración debe tener prueba antes de considerarse terminada.
- **Nombres de negocio:** usar nombres precisos del dominio (`Obligation`, `Payment`, `JournalEntry`, `AccountMovement`, `ForecastScenario`) y evitar nombres genéricos cuando oculten intención.

### Reglas de rechazo antes de construcción

Un diseño no pasa a Apply si contiene cualquiera de estos problemas:

- lógica financiera en componentes React/Astro;
- llamadas directas a persistencia desde componentes visuales;
- actualización de asientos confirmados en lugar de reversión;
- operaciones monetarias sin transacción;
- duplicación posible por reintento de request;
- permisos confiados solo a frontend;
- abstracciones sin consumidor real o sin reducción clara de riesgo;
- reportes críticos basados en totales editables manualmente;
- errores genéricos que impidan saber si falló validación, permiso, concurrencia o integridad.

## 10. Decisiones pendientes (no asumir)

| # | Decisión | Dueño | Origen | Estado |
|---|----------|-------|--------|--------|
| P1 | Importe vigente y calendario del sueldo (referencia $1.500.000, editable/versionado) | Dirección | F1 §7.2, §22.1; F2 §15, §22 | **PENDIENTE** — diseñar parámetro, no fijar valor |
| P2 | Política de reserva mínima (fijo vs semanas gasto vs combinación) | Dirección | F1 §22.2; F2 §22 | **PENDIENTE** |
| P3 | Cuentas incluidas/restringidas; titularidad Santander WASHINGTON y BaPro MILTON; rol MARI | Dirección + Tesorería | F1 §22.3; F2 §8, §22 | **PENDIENTE** — D2 debe soportar ambas |
| P4 | Criterio proyección ingresos inicial (promedio/carga manual/combinación) | Dirección + Tesorería | F1 §22.4; F2 §14, §22 | **PENDIENTE** |
| P5 | Prioridades definitivas P1–P4 y obligaciones protegidas | Dirección | F1 §9, §22.5; F2 §22 | **PENDIENTE** |
| P6 | Reglas aprobación inversiones (umbrales, quién, escenario que autoriza) | Dirección | F1 §22.6; F2 §16, §22 | **PENDIENTE** |
| P7 | Tratamiento pagos por terceros (MARI): préstamo vs aporte vs cuenta corriente; reintegros | Dirección (+ contador eventual) | F1 §22.7; F2 §8 | **PENDIENTE** |
| P8 | Fecha corte + alcance historial a migrar | Dirección + Tesorería | F1 §22.8; F2 §18 | **PENDIENTE** |
| P9 | Plazo conservación comprobantes + storage | Dirección | F1 §22.9 | **PENDIENTE** |
| P10 | Acceso contador (solo lectura / exportaciones) en MVP o posterior | Dirección | F1 §22.10; F2 §4 | **PENDIENTE** — diseñar flag, default posterior |
| P11 | Reconocimiento sueldo: pago vs devengamiento mensual | Dirección | F2 §15 | **PENDIENTE** — modelo soporta ambos |
| P12 | Límites monetarios reversiones/pagos extraordinarios; quién ejecuta vs solicita | Dirección | F2 §17 | **PENDIENTE** |
| P13 | Suplente Tesorería, delegación temporal, altas maestros con/sin aprobación previa | Dirección | F2 §11.1, §13.1, §17, §22 | **PENDIENTE** |
| P14 | Umbrales y canales de alertas (§21 F2) | Dirección + Tesorería | F2 §21 | **PENDIENTE** |
| P15 | Hora corte operativo diario y criterio cierre mensual | Ambos | F2 §22 | **PENDIENTE** |

## 11. Riesgos y mitigaciones

| Riesgo (F1 §19 / F2 §7) | Mitigación en diseño |
|---|---|
| Historial con IDs faltantes / incompleto | D8: marca LEGACY + nivel evidencia + reporte excluidos; D9: caso "registro sin trazabilidad" |
| Confundir cierre con ingresos → resultado/previsión mal | D1/D3: `daily_closings` solo conciliación; D4 CU-012 ingreso separado; prototipo lo hace visible |
| Concentración conocimiento Tesorería | D4/D5: bandeja rol + tareas + instrucciones versionadas (RNF-018) + test F2 §24.10 |
| Obligaciones desactualizadas → previsión engañosa | D7 + alertas: panel pendientes, vencidas, recurrencias fallidas; revisión semanal obligatoria |
| Inflación / importes cambiantes | D1: estimado versionado (original preservado CU-003); D7 escenarios; revisión mensual |
| Adopción parcial / doble fuente | D8: corte + paralelo limitado + solo-lectura; UAT exige operar sin AppSheet/Sheets |
| Permisos incorrectos | D6: RLS + tests acceso indebido; delegación auditada |
| Error migración | D8: ensayo + 8 controles + backup + reversión; validación conjunta antes del corte |
| Alcance excesivo | Esta spec congela MVP F1 §5; D9/Hitos B–E como gates; módulos futuros amplían libro, no lo duplican |
| Replicación literal de tablas actuales | D1/B1: prohibición explícita; mapeo transformación F2 §18, no copia |
| Sobreingeniería o abstracciones ceremoniales | §9: SOLID pragmático, abstracciones justificadas y reglas de rechazo antes de Apply |

## 12. Próxima fase + Rollback

**Próxima fase (diseño → revisión → Apply):** ejecutar bloques B1–B8 produciendo D1–D9 en `docs/diseno-financiero/`, validar prototipos con Dirección + Tesorería (Hito A: flujos, definiciones sueldo/retiro/inversión, pantallas), cerrar P1–P15 o versionarlas como parámetros, aprobar los principios técnicos §9, y recién entonces autorizar construcción (Etapa 1 Fundaciones). Verify repetirá el checklist §8 sobre cada entregable.

**Rollback:** esta spec no altera runtime ni datos; revertir = `git revert` / eliminar `docs/specs/sistema-financiero-diseno.md`. Sin impacto en producción, landing, `/escuela` ni `/prode`. Si el diseño posterior se descarta, los docs `docs/diseno-financiero/` se versionan como borrador sin tocar `src/`.
