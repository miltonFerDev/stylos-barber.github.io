# D8 — Especificación de migración

> Entregable **D8** de la spec `docs/specs/sistema-financiero-diseno.md` (§5).
> Bloque **B7**. Fase: **diseño**. **No implementa scripts ni migraciones SQL.**
> Depende de `ER.md` (**D1**) y `plan-cuentas.md` (**D2**), y de la matriz de contabilización (**D3**, EV-01). Fuentes: F1 §14, §16, §19; F2 §7, §18, §22. Decisiones **P8**, **P9**, **P15** (spec §10).

## 0. Estado y alcance

- **Estado:** **v0 borrador**. No congelado; depende de P8 (fecha de corte y alcance) y del ensayo con datos reales.
- **Incluye:** inventario de fuentes; pipeline extraer→normalizar→importar→reconciliar→corte (12 pasos F1 §14); reglas de normalización; mapeo legacy→destino (F2 §18); marca LEGACY y evidencia; tratamiento de IDs faltantes; 8 controles obligatorios; ensayo; validación conjunta; delta final; planillas en solo lectura; reporte de excluidos/corregidos; rollback; criterios de aceptación.
- **Excluye:** código/SQL ejecutable, datos reales de producción (spec §4 out), decisiones de negocio (se parametrizan).
- **Regla dura:** **no** copiar literalmente las tablas actuales; **transformar** el modelo (F2 §7 "riesgo de replicación"). **No inventar trazabilidad** inexistente (F1 §4.9, F2 §18).

## 1. Inventario de fuentes (F1 §14)

| # | Fuente | Naturaleza | Destino conceptual |
|---|---|---|---|
| S-1 | Caja diaria | Saldos de cierre por cuenta (no ventas) | `daily_closings` |
| S-2 | Egresos | Gastos/pagos ya realizados | `expenses`, `payments`, asientos de apertura/migración |
| S-3 | Comisiones | Costo operativo por persona/período (muchas sin ID) | `commissions` + pagos asociados |
| S-4 | Retiros | Extracciones de propietario | `owner_withdrawals` + movimientos |
| S-5 | Categorías | Catálogo nivel 1 | `categories` |
| S-6 | Subcategorías | Catálogo nivel 2 (relación con categoría) | `subcategories` |
| S-7 | Personas | Contrapartes | `persons` |
| S-8 | Medios de pago | Cuentas usadas | `accounts` (propiedad/vigencia/conciliabilidad) |
| S-9 | Líneas de resultado | Presentación del resultado | `result_lines` |
| S-10 | Transferencias, saldos iniciales y conciliaciones (si se usan antes del corte) | Movimientos/estado de cuenta | `transfers`, aperturas, `daily_closings`/`reconciliations` |

> Las planillas mensuales contienen acumulación histórica, no solo el período declarado (F2 §7): la extracción debe **discriminar período por fecha efectiva**, no por archivo.

## 2. Estrategia y pipeline

Cinco etapas (spec §5 D8) materializadas en los **12 pasos** de F1 §14.

| Etapa | Pasos F1 §14 | Salida |
|---|---|---|
| **1. Extraer** | 1. Copia inmutable de todas las fuentes | Snapshot fechado y hasheado (no se edita). |
| **2. Normalizar** | 2. Normalizar fechas, importes, nulos, estados, IDs | Dataset normalizado + reglas aplicadas. |
| **3. Importar** | 3. Importar catálogos y resolver relaciones · 4. Importar movimientos con marca `LEGACY` y referencia al origen · 5. No inventar IDs de comisiones · 7. Cargar saldos reales de corte por cuenta | Catálogos + documentos LEGACY + aperturas. |
| **4. Reconciliar** | 6. Reconciliar cantidades y totales por mes y entidad · 8. Migración de ensayo · 9. Validación Dirección + Tesorería | Reporte de controles + acta. |
| **5. Corte** | 10. Fijar fecha y hora de corte · 11. Importar delta final y habilitar producción · 12. Planillas anteriores en solo lectura | Producción + planillas congeladas. |

- Cada etapa se ejecuta **en el ensayo** y luego en el corte, con los mismos controles.

## 3. Reglas de normalización

| # | Campo | Regla |
|---|---|---|
| N-1 | Fechas | Interpretar en zona `America/Buenos_Aires`; separar **fecha efectiva** de fecha de registración (D1 §6). Nulas/ inválidas → reporte de excluidos. |
| N-2 | Importes | `numeric(18,2)`; nunca punto flotante (RNF-004). Moneda explícita; default `ARS` documentado. |
| N-3 | Nulos | No rellenar con suposiciones; marcar y listar. |
| N-4 | Estados | Mapear a los estados canónicos (D1 §5); estados legacy desconocidos → `LEGACY` + nota. |
| N-5 | IDs | Preservar formato original como referencia; generar PK UUID nueva; no reutilizar IDs como PK. |
| N-6 | Comisiones sin ID | **No inventar** ID (F1 §14.5); clave de deduplicación compuesta + marca LEGACY. |
| N-7 | Catálogos | Conservar `valid_from`/`valid_to`; no sobrescribir historia (F1 §4.1). |
| N-8 | Relación subcategoría→categoría | Validar pertenencia (D1 I-15); inválidas → excluidos. |

## 4. Mapeo legacy → destino (F2 §18)

| Fuente actual | Destino conceptual | Tratamiento |
|---|---|---|
| Caja diaria | `daily_closings` | Importar como **fotografía**, **no** como ingreso. |
| Egresos | `expenses`, `payments` y asientos de apertura/migración | Transformar según evidencia disponible. |
| Comisiones | `commissions` y pagos asociados | Marcar registros sin ID como **legado**. |
| Retiros | `owner_withdrawals` y movimientos | Separar de sueldo y gastos. |
| Categorías | `categories` | Normalizar y conservar vigencia. |
| Subcategorías | `subcategories` | Validar relación con categoría. |
| Personas | `persons` | Tipificar roles sin duplicar identidad. |
| Medios de pago | `accounts` | Clasificar propiedad, vigencia y conciliabilidad. |
| Líneas de resultado | `result_lines` | Conservar orden y naturaleza. |

> **Limitación:** no todos los registros permiten reconstruir gasto + obligación + pago + asiento con precisión. Esos movimientos se importan como **saldos o transacciones migradas con nivel de evidencia explícito**, sin atribuirles precisión inexistente (F2 §18).

## 5. Marca LEGACY y nivel de evidencia

| `origin` | `legacy_evidence_level` | Significado | Asiento |
|---|---|---|---|
| `LEGACY` | `COMPLETO` | Documento con evidencia suficiente para reconstruir el hecho | Asiento equivalente al hecho real (D3 EV-01/EV-03). |
| `LEGACY` | `PARCIAL` | Evidencia incompleta; se reconstruye parcialmente | Asiento mínimo trazable; nota de limitación. |
| `LEGACY` | `SOLO_SALDO` | Solo se conoce el saldo de apertura | **Solo** apertura de cuenta; **no** se inventa detalle (D3 EV-01, F1 §14.5). |
| `REAL` | (n/a) | Registro creado en el sistema nuevo | Asiento normal. |

- Todo registro migrado conserva **referencia al origen** (`source`) y, cuando aplica, el ID original como texto (N-5).
- Criterio `LEGACY` explícito y auditable (F1 §4.9).

## 6. IDs faltantes

- Comisiones históricas: deduplicación por `(persona, período, importe, referencia)` + marca LEGACY; **nunca** fabricar un ID (F1 §14.5).
- Pagos/egresos sin ID: clave compuesta + `checksum` del origen para reintentos idempotentes de importación.
- Duplicados conocidos: lista explícita + decisión documentada (conservar/colapsar) — control C-7.

## 7. Controles obligatorios (F1 §14)

| # | Control | Criterio de aceptación |
|---|---|---|
| C-1 | **Totales por período antes y después** de migrar | Iguales dentro de diferencias documentadas. |
| C-2 | **Cantidad de registros** por tabla y período | Coincide con origen (o diferencia justificada en excluidos). |
| C-3 | **Claves únicas y no vacías** cuando correspondan | Sin colisiones; sin PK nulas. |
| C-4 | **Relaciones válidas** entre categoría y subcategoría | 100% de subcategorías con categoría vigente existente (D1 I-15). |
| C-5 | **Transferencias balanceadas** | Origen ≠ destino; mismo importe; sin efecto en resultado (D1 I-07/I-08). |
| C-6 | **Saldos de apertura + movimientos = cierre** | Por cuenta y período; diferencia solo con explicación. |
| C-7 | **Identificación de duplicados conocidos** | Lista cerrada con resolución documentada. |
| C-8 | **Reporte de excluidos o corregidos** | Cualquier registro no importado está listado con motivo. |

- **Invariante de lote (D3 EV-01):** la suma de débitos de todas las aperturas/documentos migrados = suma de créditos.
- El pipeline **no replica** tablas actuales: aplica transformación (F2 §7).

## 8. Ensayo (dry run)

1. Ejecutar el pipeline completo sobre el snapshot inmutable, en entorno de prueba.
2. Correr los 8 controles y generar el reporte de diferencias.
3. Revisar diferencias con Dirección + Tesorería; corregir **reglas**, no datos a mano.
4. Repetir hasta que los controles cierren.
5. Congelar las reglas de normalización y mapeo usadas (versionadas, RNF-018).

- El ensayo **no** toca producción; se repite cuantas veces sea necesario (F1 §19 mitigación "error en migración").

## 9. Validación conjunta (F2 §24.8, F1 §14.9)

- Dirección + Tesorería firman el reporte de reconciliación y aceptan el alcance y las limitaciones (F1 §17.9).
- Se valida que puedan operar un período real sin asistencia técnica (F1 §18, UAT en D9).
- Sin firma conjunta **no** se procede al corte.

## 10. Corte y delta final

1. **Fijar fecha y hora de corte** (P8, P15): momento en que se congela el origen.
2. Extraer y normalizar el **delta** entre el último ensayo y el corte.
3. Importar el delta con los mismos controles; reconciliar.
4. Cargar **saldos reales de corte** por cuenta (base de la previsión, D7 F-1).
5. Habilitar producción (F1 §14.11).
6. Registrar el corte en `audit_events` (importación de legado, F2 §19).

## 11. Planillas anteriores en solo lectura

- Tras el corte, las planillas antiguas quedan **solo lectura** (F1 §14.12), con período paralelo limitado (F1 §19).
- La operación productiva **no depende** de AppSheet ni Sheets (RNF-009, F1 §17.10).
- Se documenta el retiro operativo de planillas (Hito E, F1 §16).

## 12. Reporte de excluidos / corregidos (C-8)

| Campo | Descripción |
|---|---|
| Fuente | S-1..S-10 |
| Registro origen | ID/referencia original |
| Motivo de exclusión | Fecha inválida, relación rota, duplicado, sin evidencia, etc. |
| Acción | Excluido · Corregido · Convertido a `SOLO_SALDO` |
| Responsable | Quién resolvió |
| Fecha | Cuándo |

- El reporte es **entregable obligatorio** y se conserva como evidencia de migración (F2 §20 auditoría/contador).

## 13. Rollback

| Escenario | Acción |
|---|---|
| Ensayo con diferencias | Re-ejecutar reglas; no hay impacto productivo. |
| Corte fallido antes de habilitar producción | Restaurar snapshot previo; reintentar. |
| Producción con error detectado post-corte | Restaurar backup (§D6 B-1/B-3) + re-ejecutar delta corregido; planillas origen aún disponibles en solo lectura. |
| Abandono del corte | Dejar planillas en solo lectura; los docs son borrador (spec §12). |

- **Backup previo al corte obligatorio** (F1 §19, RNF-007). La restauración está probada (D6 §8).

## 14. Criterios de aceptación (F1 §17.9, §16 Hito E)

- [ ] Los 8 controles (C-1..C-8) cierran, con diferencias documentadas.
- [ ] Snapshot inmutable + referencia al origen por registro.
- [ ] Marca `LEGACY` + nivel de evidencia en todo registro migrado.
- [ ] No se inventaron IDs ni trazabilidad.
- [ ] Reporte de excluidos/corregidos entregado y aceptado.
- [ ] Dirección + Tesorería firman la reconciliación (F1 §14.9).
- [ ] Saldos de corte cargados y consistentes con la previsión.
- [ ] Planillas antiguas en solo lectura; producción sin dependencia de AppSheet/Sheets.
- [ ] Backup y restauración probados antes del corte.

## 15. Decisiones pendientes

| # | Decisión | Impacto en D8 |
|---|---|---|
| P8 | Fecha de corte + alcance del historial a migrar | Define S-1..S-10 incluidas y el delta. |
| P9 | Plazo de conservación de comprobantes | Retención de evidencia migrada. |
| P15 | Hora de corte operativo diario / cierre mensual | Momento exacto del corte. |
| P7 | Naturaleza de fondos externos (MARI) en historial | Tratamiento de egresos pagados por terceros. |
| P-REC | Política de reconocimiento aplicada al legado | Reconstrucción de asientos históricos. |

> **No-asunción:** no se fija fecha de corte ni alcance. No se mezclan datos beta con productivos (spec §4).

## 16. Próximo paso

- Cerrar P8 con Dirección + Tesorería y ejecutar el ensayo sobre un snapshot de prueba.
- Alimentar **D9 (pruebas)** con los casos de migración y conciliación.
- Coordinar con **D7** la base de saldos conciliados de corte para la previsión.
