# Backlog de desarrollo — sistema financiero y tesorería

> Derivado de `docs/specs/sistema-financiero-diseno.md` y de los entregables D1-D9 en `docs/diseno-financiero/`.
> Fase: **desarrollo**. Este backlog ordena la construcción, pero no cierra decisiones de negocio pendientes.

## 0. Reglas de entrada a desarrollo

- No construir lógica contable definitiva hasta resolver o parametrizar explícitamente **P-REC**, **P7**, **P11** y **P-CAP**.
- No cargar datos productivos sin ejecutar primero migración de ensayo y controles de D8.
- No permitir mutaciones monetarias desde componentes visuales ni repositorios sueltos.
- Toda operación monetaria debe pasar por un servicio transaccional con `idempotency_key`, auditoría y errores tipados.
- La UI no es seguridad: permisos sensibles deben estar protegidos en backend/RLS.
- Los reportes se derivan de datos canónicos; no guardar totales manuales como fuente de verdad.

## 1. Releases propuestos

| Release | Objetivo | Resultado esperado |
|---|---|---|
| R0 | Preparación técnica | Proyecto listo para construir sin tocar operación real. |
| R1 | Fundaciones del dominio | Modelo, roles, maestros, cuentas, libro y auditoría base. |
| R2 | Tesorería operativa MVP | Ingresos, obligaciones, pagos, transferencias, cierres y conciliaciones. |
| R3 | Planificación y previsión | Previsión 13 semanas, sueldo, presupuesto e inversiones candidatas. |
| R4 | Seguridad, migración y UAT | RLS, storage privado, migración de ensayo, pruebas y aceptación con usuarios. |
| R5 | Corte productivo | Delta final, datos reales, planillas en solo lectura y operación diaria. |

## 2. Backlog por épica

### E0 — Preparación técnica y arquitectura

**Objetivo:** crear la base de la mini-app financiera sin mezclarla con landing, `/prode` ni flujos existentes.

| ID | Historia / tarea | Prioridad | Dependencias | Criterio de aceptación |
|---|---|---:|---|---|
| E0-01 | Definir ubicación de la app financiera dentro del repo y ruta inicial | Alta | Decisión técnica | Existe ruta interna protegida y no afecta landing ni `/prode`. |
| E0-02 | Crear estructura modular por capas: dominio, aplicación, persistencia, presentación, seguridad y reportes | Alta | D4 | La lógica financiera no queda en componentes visuales. |
| E0-03 | Configurar convenciones de tipos monetarios, fechas, moneda y `Result<T>` | Alta | D1, D4 | No se usa `number` flotante para importes en dominio. |
| E0-04 | Crear catálogo inicial de errores tipados | Alta | D4 §5 | Los servicios devuelven errores específicos, no mensajes genéricos. |
| E0-05 | Crear harness de tests del dominio financiero | Alta | D9 | Tests unitarios corren localmente y cubren al menos una regla de balance. |

### E1 — Identidad, roles y permisos

**Objetivo:** soportar Dirección, Tesorería, Contador y Admin Técnico con permisos auditables.

| ID | Historia / tarea | Prioridad | Dependencias | Criterio de aceptación |
|---|---|---:|---|---|
| E1-01 | Modelar usuarios, roles y asignaciones | Alta | D1, D6 | Un usuario puede tener roles sin hardcodear nombres personales. |
| E1-02 | Implementar resolución server-side de permisos | Alta | D6 | El rol no se toma desde el cliente. |
| E1-03 | Implementar delegación temporal de Tesorería | Media | P13 | Delegación tiene inicio, fin, motivo y auditoría. |
| E1-04 | Implementar matriz RBAC inicial | Alta | D6 | Acciones sensibles quedan restringidas por rol. |
| E1-05 | Agregar pruebas de acceso indebido | Alta | D9 | Usuario sin rol no puede ejecutar mutaciones financieras. |

### E2 — Maestros y plan de cuentas

**Objetivo:** crear catálogos versionados para operar sin valores improvisados.

| ID | Historia / tarea | Prioridad | Dependencias | Criterio de aceptación |
|---|---|---:|---|---|
| E2-01 | Implementar `persons` con vigencia | Alta | D1 | No se borra historia de contrapartes. |
| E2-02 | Implementar categorías, subcategorías y líneas de resultado | Alta | D1, D2 | Subcategoría inválida no puede confirmarse en un documento. |
| E2-03 | Implementar `ledger_accounts` jerárquicas | Alta | D2 | El plan permite cuentas no posteables y cuentas hijas. |
| E2-04 | Implementar cuentas financieras `accounts` y mapeo contable vigente | Alta | D1, D2, P3 | Cuenta financiera y cuenta contable quedan separadas. |
| E2-05 | Implementar asistente guiado de alta de cuenta | Media | D5, P3 | El alta responde las preguntas definidas y propone tratamiento contable. |
| E2-06 | Implementar búsqueda de duplicados antes de crear maestros | Media | D4 | El sistema advierte duplicados en vez de crear silenciosamente. |

### E3 — Libro, períodos, asientos y auditoría

**Objetivo:** construir el núcleo canónico e inmutable del sistema.

| ID | Historia / tarea | Prioridad | Dependencias | Criterio de aceptación |
|---|---|---:|---|---|
| E3-01 | Implementar períodos contables `ABIERTO -> EN_REVISION -> CERRADO` | Alta | D1, D4 | No se puede postear en período cerrado. |
| E3-02 | Implementar `JournalService.postEntry` | Alta | D3, D4 | Todo asiento confirmado queda balanceado. |
| E3-03 | Implementar reversión por asiento inverso | Alta | D3, D4 | Un asiento confirmado no se edita; se revierte con vínculo al original. |
| E3-04 | Implementar inmutabilidad de asientos confirmados | Alta | D1, D6 | Update/delete de asiento confirmado queda bloqueado. |
| E3-05 | Implementar `audit_events` append-only | Alta | D1, D4, D6 | Cambios relevantes generan evento auditable. |
| E3-06 | Implementar idempotencia transversal | Alta | D1, D4 | Reintento con misma clave devuelve resultado previo sin duplicar. |

### E4 — Tesorería operativa

**Objetivo:** registrar hechos financieros reales sin confundir ingreso, cierre, pago, transferencia ni proyección.

| ID | Historia / tarea | Prioridad | Dependencias | Criterio de aceptación |
|---|---|---:|---|---|
| E4-01 | Implementar alta de obligación | Alta | E2, E3, D4 | Obligación queda pendiente/programada sin generar asiento si P-REC no lo habilita. |
| E4-02 | Implementar confirmación de importe definitivo | Media | E4-01 | El estimado original queda preservado/versionado. |
| E4-03 | Implementar pagos y aplicación a obligaciones | Alta | E3, E4-01, D3 | Pago genera movimiento, aplicación y asiento en una transacción. |
| E4-04 | Implementar pago parcial y saldo pendiente | Alta | E4-03 | Aplicaciones no superan el importe pagado ni el exigible. |
| E4-05 | Implementar transferencias entre cuentas propias | Alta | E2, E3 | Transferencia no afecta resultado y origen != destino. |
| E4-06 | Implementar ingreso/cobranza diaria agregada | Alta | E2, E3, D4 | Ingreso genera distribuciones, movimientos y asiento; cierre no se usa como ingreso. |
| E4-07 | Implementar cierre diario por cuenta | Alta | E4-06 | Cierre compara saldo teórico vs real y no genera ingreso. |
| E4-08 | Implementar conciliaciones y resolución de diferencias | Alta | E4-07, D3 | Diferencia queda explicada o ajustada con asiento trazable. |
| E4-09 | Implementar fondos externos/MARI | Media | P7, D3, D4 | Fondos externos no computan como disponibilidad propia. |
| E4-10 | Implementar adjuntos/comprobantes privados | Media | D6 | Comprobante se guarda privado y se vincula al documento operativo. |

### E5 — Interfaces operativas MVP

**Objetivo:** permitir operación diaria por roles con lenguaje de negocio.

| ID | Historia / tarea | Prioridad | Dependencias | Criterio de aceptación |
|---|---|---:|---|---|
| E5-01 | Tablero Dirección | Alta | D5, E3, E4 | Muestra caja, obligaciones, alertas y estado financiero sin exponer débitos/créditos. |
| E5-02 | Agenda Tesorería | Alta | D5, E4 | Lista vencimientos, pagos pendientes, cierres y tareas por prioridad. |
| E5-03 | Formulario alta obligación | Alta | D5, E4-01 | Flujo guía las preguntas y conserva borrador si falta maestro. |
| E5-04 | Formulario registrar pago | Alta | D5, E4-03 | Usuario puede aplicar pago total/parcial con validaciones visibles. |
| E5-05 | Pantalla cierre y conciliación | Alta | D5, E4-07, E4-08 | Usuario ve teórico, real, diferencia y resolución. |
| E5-06 | UX mobile-first para operación | Alta | D5 | Flujos críticos son usables en celular. |
| E5-07 | UX desktop para análisis | Media | D5 | Reportes y comparativos son legibles en pantalla amplia. |

### E6 — Previsión, sueldo, presupuesto e inversiones

**Objetivo:** proyectar 13 semanas sin mezclar escenarios con hechos reales.

| ID | Historia / tarea | Prioridad | Dependencias | Criterio de aceptación |
|---|---|---:|---|---|
| E6-01 | Implementar `ForecastService.computeForecast` | Alta | E4, D7, P2, P4 | Proyección muestra fuente y confianza por componente. |
| E6-02 | Implementar escenarios conservador/base/optimista | Alta | D7 | Escenario optimista no autoriza inversión por sí solo. |
| E6-03 | Implementar reserva mínima parametrizada | Alta | P2 | Capacidad no se calcula si la reserva no está definida. |
| E6-04 | Implementar sueldo de Dirección como parámetro versionado | Media | P1, P11 | Sueldo no se confunde con retiro de propietario. |
| E6-05 | Implementar capacidad de inversión | Alta | D7, P6 | Capacidad = max(0, mínimo proyectado - reserva - fondos protegidos). |
| E6-06 | Implementar inversiones candidatas y evaluación | Media | E6-05, P6, P-CAP | Cambiar importe/fecha tras aprobar exige nueva evaluación. |
| E6-07 | Implementar presupuesto mensual y comparación real vs presupuesto | Baja | E3, E4, D7 | Presupuesto no genera asiento y usa líneas de resultado vigentes. |

### E7 — Reportes y exportaciones

**Objetivo:** dar visibilidad operativa sin duplicar datos canónicos.

| ID | Historia / tarea | Prioridad | Dependencias | Criterio de aceptación |
|---|---|---:|---|---|
| E7-01 | Reporte de disponibilidad por cuenta | Alta | E4 | Excluye cuentas externas y restringidas según P3. |
| E7-02 | Reporte de obligaciones por estado y vencimiento | Alta | E4 | Permite detectar vencidas, parciales y programadas. |
| E7-03 | Estado de resultados interno | Media | E3, E4, D2 | Deriva de asientos/documentos, no de totales editables. |
| E7-04 | Reporte de auditoría por entidad | Media | E3 | Dirección puede consultar historial sensible. |
| E7-05 | Exportación para contador | Baja | P10 | Exporta solo lectura sin otorgar permisos operativos. |

### E8 — Seguridad, RLS, storage y backup

**Objetivo:** proteger datos financieros y comprobantes privados.

| ID | Historia / tarea | Prioridad | Dependencias | Criterio de aceptación |
|---|---|---:|---|---|
| E8-01 | Implementar policies RLS para tablas financieras | Alta | D6, E1-E4 | Usuario sin permiso no lee ni modifica datos sensibles. |
| E8-02 | Implementar storage privado de comprobantes | Alta | D6, E4-10 | Un usuario no autorizado no puede descargar adjuntos. |
| E8-03 | Mantener secretos server-only | Alta | D6 | No hay claves sensibles expuestas al cliente. |
| E8-04 | Log de accesos sensibles | Media | D6 | Consultas sensibles quedan auditadas. |
| E8-05 | Backup y restore probado | Alta | D6, D8 | Existe prueba documentada de restauración antes del corte. |

### E9 — Migración desde AppSheet / Google Sheets

**Objetivo:** traer historial sin replicar errores del modelo anterior ni inventar trazabilidad.

| ID | Historia / tarea | Prioridad | Dependencias | Criterio de aceptación |
|---|---|---:|---|---|
| E9-01 | Tomar snapshot inmutable de fuentes | Alta | P8 | Snapshot fechado, hasheado y sin edición manual. |
| E9-02 | Implementar normalización de fechas, importes, nulos y estados | Alta | D8 | Registros inválidos van a reporte de excluidos. |
| E9-03 | Implementar mapeo legacy a entidades destino | Alta | D8, E2-E4 | Caja diaria migra como cierre, no como ingreso. |
| E9-04 | Implementar marca `LEGACY` y nivel de evidencia | Alta | D8 | Todo registro migrado indica evidencia completa/parcial/solo saldo. |
| E9-05 | Implementar controles C-1 a C-8 | Alta | D8, D9 | Totales, conteos, relaciones, saldos y duplicados quedan reconciliados. |
| E9-06 | Ejecutar migración de ensayo | Alta | E9-01..E9-05 | Dirección + Tesorería revisan diferencias antes del corte. |
| E9-07 | Ejecutar delta final y corte productivo | Alta | P8, P15, E9-06, E8-05 | Planillas anteriores quedan solo lectura y producción opera con datos nuevos. |

### E10 — Pruebas, UAT y salida a producción

**Objetivo:** validar reglas financieras, permisos, migración y operación real.

| ID | Historia / tarea | Prioridad | Dependencias | Criterio de aceptación |
|---|---|---:|---|---|
| E10-01 | Tests unitarios de balance, reversión e idempotencia | Alta | E3 | Casos críticos pasan antes de integrar UI. |
| E10-02 | Tests de pagos, aplicaciones y movimientos | Alta | E4 | Una transacción fallida no deja datos parciales. |
| E10-03 | Tests de previsión y capacidad de inversión | Alta | E6 | Fórmulas coinciden con D7. |
| E10-04 | Tests de permisos/RLS | Alta | E8 | Accesos indebidos fallan de forma verificable. |
| E10-05 | Tests de migración y conciliación | Alta | E9 | Controles C-1..C-8 se ejecutan automáticamente. |
| E10-06 | E2E de flujos críticos | Alta | E5 | Alta obligación, pago, ingreso, cierre, conciliación e inversión candidata funcionan. |
| E10-07 | UAT con Dirección + Tesorería | Alta | E5-E9 | Pueden operar un período real sin asistencia técnica. |
| E10-08 | Checklist de salida productiva | Alta | E10-01..E10-07 | No hay blockers abiertos, backup probado y corte aprobado. |

## 3. MVP mínimo recomendado

Para reducir riesgo, el primer MVP productivo debería incluir solo:

- Roles mínimos: Dirección y Tesorería.
- Maestros básicos: personas, categorías, subcategorías, líneas de resultado, cuentas financieras y plan de cuentas inicial.
- Libro: períodos, asientos, líneas, reversión, auditoría e idempotencia.
- Tesorería diaria: ingresos, obligaciones, pagos, transferencias, cierres y conciliaciones.
- Reportes básicos: disponibilidad, obligaciones, resultado interno y auditoría.
- Seguridad: RLS, storage privado, backup/restore probado.
- Migración: saldos de corte y registros legacy con evidencia explícita.

Quedan para después del primer corte, salvo necesidad operativa:

- Exportación para contador.
- Presupuesto mensual completo.
- Automatización avanzada de recurrencias.
- Alertas multicanal.
- Integraciones bancarias.
- Contabilidad fiscal/legal.

## 4. Decisiones que bloquean o condicionan desarrollo

| Decisión | Bloquea | Tratamiento recomendado |
|---|---|---|
| P-REC | Asientos de obligaciones, sueldo y devengamiento | Resolver antes de lógica contable definitiva o parametrizar con feature flag explícito. |
| P3 | Cuentas disponibles/restringidas/externas | Resolver antes de reportes de disponibilidad y migración de cuentas. |
| P7 | Tratamiento MARI/fondos externos | Resolver antes de migrar o registrar pagos externos reales. |
| P8 | Fecha de corte y alcance histórico | Resolver antes de migración de ensayo. |
| P11 | Sueldo pago vs devengo | Resolver antes de implementar sueldo automático. |
| P12 | Límites de reversión | Resolver antes de habilitar reversión a usuarios no Dirección. |
| P13 | Suplente Tesorería y aprobación de maestros | Condiciona delegación y asistentes guiados. |
| P15 | Hora de corte operativo | Resolver antes de cierre diario/mensual productivo. |
| P-CAP | Capitalizar inversión vs gasto | Resolver antes de pago de inversiones aprobadas. |

## 5. Definition of Done por historia

- Cumple el contrato de dominio definido en D4.
- Tiene validaciones de dominio y, cuando aplica, constraints/RLS en base de datos.
- Tiene tests donde hay riesgo financiero, permisos, concurrencia o migración.
- Registra auditoría en mutaciones relevantes.
- Usa `idempotency_key` en operaciones monetarias.
- No expone comprobantes ni datos sensibles a roles no autorizados.
- No rompe landing, `/prode` ni flujos existentes.
- Incluye estado de error recuperable con lenguaje de negocio.

## 6. Orden sugerido de ejecución

1. E0 Preparación técnica.
2. E1 Identidad, roles y permisos base.
3. E2 Maestros y plan de cuentas.
4. E3 Libro, períodos, asientos y auditoría.
5. E4 Tesorería operativa.
6. E5 Interfaces MVP.
7. E8 Seguridad/RLS/storage en paralelo con E5.
8. E6 Previsión e inversiones.
9. E7 Reportes.
10. E9 Migración de ensayo y corte.
11. E10 Pruebas, UAT y salida productiva.

## 7. Primer sprint sugerido

| Sprint 1 | Entregable |
|---|---|
| Definir ruta y estructura modular | App financiera aislada del sitio público. |
| Crear tipos base de dominio | Money, Currency, DateTime, Result, DomainError. |
| Crear catálogo de errores | Códigos de D4 disponibles para servicios. |
| Crear tests base de dominio | Primer test de asiento balanceado y error de asiento desbalanceado. |
| Modelar roles mínimos | Dirección y Tesorería listos para permisos posteriores. |

**Criterio de salida del sprint 1:** existe una base técnica testeable, sin UI compleja todavía, y ninguna mutación financiera puede nacer desde componentes visuales.
