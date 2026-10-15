# Diseño del sistema financiero y de tesorería — índice de entregables

> Fase: **diseño** (no construcción). Derivado de la spec aprobada `docs/specs/sistema-financiero-diseno.md`.
> **No se toca código fuente** (`src/**`, `supabase/**`, config, landing, `/escuela`, `/prode`). Solo documentación bajo `docs/diseno-financiero/`.

## Entregables D1–D9

| ID | Entregable | Archivo | Bloque | Estado | Dependencias |
|----|------------|---------|--------|--------|--------------|
| D1 | Modelo ER lógico | [`ER.md`](./ER.md) | B1 | 🟡 v0 borrador | P3, validación D+T |
| D2 | Plan de cuentas interno inicial | [`plan-cuentas.md`](./plan-cuentas.md) | B1 | 🟡 v0 borrador | P3, P7 |
| D3 | Matriz de contabilización automática | [`matriz-contabilizacion.md`](./matriz-contabilizacion.md) | B2 | 🟡 v0 borrador | D1, D2 (P7, P11, P-REC) |
| D4 | Contratos de servicios de dominio | [`contratos-dominio.md`](./contratos-dominio.md) | B3 | 🟡 v0 borrador | D1, D3 (P-REC, P6, P7, P11, P12, P13) |
| D5 | Prototipos navegables | [`prototipos.md`](./prototipos.md) | B4 (Hito A) | 🟡 v0 borrador | D1–D4 (P1–P4, P6, P7, P13, P15) |
| D6 | Arquitectura de seguridad | [`seguridad.md`](./seguridad.md) | B5 | 🟡 v0 borrador | D1 (P9, P10, P12, P13) |
| D7 | Diseño de previsión y escenarios | [`prevision.md`](./prevision.md) | B6 | 🟡 v0 borrador | D1, D2 (P1, P2, P4, P5, P6, P14) |
| D8 | Especificación de migración | [`migracion.md`](./migracion.md) | B7 | 🟡 v0 borrador | D1, D2, D3 (P8, P9, P15, P7, P-REC) |
| D9 | Estrategia detallada de pruebas | [`pruebas.md`](./pruebas.md) | B8 | 🟡 v0 borrador | D1–D8 (P-REC, P6, P11, P12, P2, P8, P14) |

Leyenda: 🟡 borrador · 🟢 aprobado · ⚪ no iniciado.

## Orden sugerido (spec §6)

`B1 (D1+D2)` → `B2 (D3)` → `B3 (D4)` → `B4 (D5, Hito A)` → `B5/B6 (D6/D7 en paralelo)` → `B7 (D8)` → `B8 (D9)`.
Cada bloque cierra con revisión conjunta Dirección + Tesorería antes del siguiente.

## Fase desarrollo

- [`backlog-desarrollo.md`](./backlog-desarrollo.md) — backlog ordenado por releases, épicas, historias, dependencias, criterios de aceptación y decisiones bloqueantes.

## Decisiones pendientes (spec §10)

P1–P15 permanecen **PENDIENTE**; el diseño las parametriza, no las asume. Ver detalle por entregable:
- Relacionadas con D1: P3, P7, P8, P9, P11, P13, P15.
- Relacionadas con D2: P1, P2, P3, P7, P11.
- Relacionadas con D3: P7, P11, P8, P15 + **P-REC** (política de reconocimiento: caja vs devengamiento), **P-CUENTAS** (cuentas dedicadas: apertura, diferencias de conciliación, anticipos, comisiones a pagar) y **P-CAP** (capitalizar inversión vs gasto). Ver `matriz-contabilizacion.md` §9.
- Relacionadas con D4: P-REC, P6, P7, P11, P12, P13, P1, P2, P3, P8, P15. Ver `contratos-dominio.md` §8.
- Relacionadas con D5: P1–P4, P6, P7, P13, P15 + discrepancia **12 vs 13 preguntas** del asistente de alta de cuenta (spec §5 dice 12; F2 §13.1 enumera 13). Ver `prototipos.md` §13.
- Relacionadas con D6: P9, P10, P12, P13, P14, P7. Ver `seguridad.md` §11.
- Relacionadas con D7: P1, P2, P4, P5, P6, P14, P11, P15. Ver `prevision.md` §13.
- Relacionadas con D8: P8, P9, P15, P7, P-REC. Ver `migracion.md` §15.
- Relacionadas con D9: P-REC, P6, P11, P12, P2, P8, P14. Ver `pruebas.md` §16.

> **P-mini pendientes de diseño (no de negocio):** el nombre definitivo de la entidad de ingreso diario (`income_records`, D1 §3.5) y la discrepancia 12/13 preguntas (D5) quedan abiertos hasta validación con Dirección + Tesorería.

## Principios técnicos (spec §9)

SOLID pragmático · simplicidad antes que arquitectura ornamental · dominio aislado · invariantes cerca de los datos · mutaciones concentradas en servicios transaccionales · errores explícitos · dependencias hacia adentro · reportes derivados de datos canónicos · tests donde hay riesgo · nombres de negocio.

## Verificación

- `git status` no debe mostrar cambios en `src/`, `supabase/`, config ni workflows por esta fase.
- Cada entregable traza a RF/RNF/CU y fuentes F1/F2 (sin requisitos huérfanos).

## Aceptación provisional

Dirección acepta avanzar con los pendientes documentados como **parámetros abiertos**, sin convertirlos todavía en reglas cerradas de negocio.

Esto permite pasar a la siguiente etapa de trabajo manteniendo estas condiciones:

- P1–P15 siguen **PENDIENTE** hasta validación formal.
- P-REC, P-CUENTAS y P-CAP siguen **PENDIENTE** y deben resolverse antes de implementar lógica contable definitiva.
- La discrepancia 12 vs 13 preguntas del alta de cuenta queda aceptada provisionalmente usando las 13 preguntas del análisis funcional.
- `income_records` queda como nombre provisional para ingresos diarios.
- Ningún pendiente aceptado provisionalmente habilita asumir comportamiento irreversible en código o base de datos.
