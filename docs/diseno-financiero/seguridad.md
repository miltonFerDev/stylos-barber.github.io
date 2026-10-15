# D6 — Arquitectura de seguridad

> Entregable **D6** de la spec `docs/specs/sistema-financiero-diseno.md` (§5).
> Bloque **B5**. Fase: **diseño**. **No implementa policies ni DDL ejecutables.**
> Depende de `ER.md` (**D1**). Fuentes: F1 §4, §12, §13 (RNF-005–008), §19; F2 §17, §19, §24; decisiones **P9**, **P10**, **P12**, **P13** (spec §10).
> Referencia: la seguridad real vive en la base de datos (RLS) y en servicios de aplicación, **no** en la UI (F1 §12; regla heredada de hardening).

## 0. Estado y alcance

- **Estado:** **v0 borrador**. No congelado; depende de P10 (acceso del contador), P12 (límites monetarios) y P13 (delegación).
- **Incluye:** modelo de roles y matriz de permisos; RLS conceptual por tabla; storage privado de comprobantes; manejo de secretos server-only; auditoría y log de accesos sensibles; delegación temporal de Tesorería; backup/restore; amenazas y mitigaciones; pruebas de acceso indebido.
- **Excluye:** DDL/SQL ejecutable, configuración real de Supabase/Vercel, contratos de servicio (D4), prototipos (D5).
- **Portabilidad (F1 §12):** el diseño es PostgreSQL estándar; "RLS" describe el patrón de aislamiento por fila. El dominio no depende de un proveedor.

## 1. Principios de seguridad

| # | Principio | Base |
|---|---|---|
| S-1 | **Acceso exclusivamente autenticado**; el rol se deriva del usuario y se valida **en servidor** | F1 §13, §12 |
| S-2 | **Permisos mínimos** por rol; ningún permiso se confía al frontend | §9 reglas de rechazo |
| S-3 | **Aislamiento en la base**: cada consulta filtrada por política, no por UI | F1 §12 |
| S-4 | **Defensa en profundidad**: validación de dominio + constraint + RLS | D1 §4 |
| S-5 | **Secretos solo en servidor**; nunca en el bundle | F1 §12 |
| S-6 | **Comprobantes privados**; acceso por URL firmada/temporal | F1 §12, RNF-… |
| S-7 | **Auditoría inmutable** de cambios y accesos sensibles | F2 §19, RF-023 |
| S-8 | **Continuidad por rol, no por persona**; delegación auditada | F2 §17.1 |
| S-9 | **Backup + restauración probada** documentada | RNF-007, F1 §16 Hito E |
| S-10 | **Datos exportables y restaurables** sin dependencia de plataforma | F1 §4.10, RNF-008/009 |

## 2. Roles y matriz de permisos

Roles (`roles.code`, D1 §3.1): `DIRECCION`, `TESORERIA`, `CONTADOR` (futuro, **P10**), `ADMIN_TECNICO`. Los permisos se asignan a **roles**, y los roles a usuarios (F2 §17).

### 2.1 Matriz RBAC (F2 §17 + F1 §6)

| Acción | Dirección | Tesorería | Contador (futuro) | Admin técnico |
|---|:--:|:--:|:--:|:--:|
| Ver saldos y previsión | Sí | Sí | Sí (lectura, **P10**) | No |
| Crear obligación ordinaria | Sí | Sí | No | No |
| Modificar vencimiento/importe estimado | Sí | Sí | No | No |
| Confirmar pago | Sí | Sí | No | No |
| Revertir pago | Sí | Solicita o ejecuta según límite (**P12**) | No | No |
| Conciliar cuenta | Consulta | Sí | No | No |
| Registrar ingreso diario | Sí | Sí | No | No |
| Modificar catálogos | Sí | Limitado | No | No |
| Dar de alta maestros | Sí | Solicita/ejecuta según **P13** | No | No |
| Definir sueldo | Sí | No | No | No |
| Definir reserva | Sí | No | No | No |
| Simular inversión | Sí | Sí | No | No |
| Aprobar inversión | Sí | Prepara | No | No |
| Aprobar cambio sensible de configuración | Sí | No | No | No |
| Cerrar período | Aprueba | Prepara | No | No |
| Reabrir período | Sí | No | No | No |
| Consultar auditoría | Sí | Propia y operativa | Sí (lectura, **P10**) | Limitada a soporte |
| Exportar datos | Sí | Sí (operativo) | Sí (lectura, **P10**) | No |
| Administrar usuarios/roles | Sí | No | No | Sí (técnico, sin datos financieros) |
| Gestionar despliegues/soporte | No | No | No | Sí |

- **Admin técnico** no toma decisiones financieras ni ve importes sensibles por defecto (F1 §6).
- **Contador** es un rol de solo lectura/exportación, habilitable por flag; default **posterior al MVP** (**P10**).
- Límites monetarios de reversión/pagos extraordinarios y quién ejecuta vs solicita: **PENDIENTE P12**.

### 2.2 Regla de continuidad

- Debe existir al menos un **suplente** posible de Tesorería (F2 §17).
- Los pendientes, vencimientos, alertas y procedimientos pertenecen al **rol**, no a la persona (F2 §11.1).
- Cambiar de responsable no altera historial ni fórmulas; solo la asignación usuario↔rol.

## 3. RLS conceptual por tabla

Patrón: toda tabla financiera tiene RLS activo; las políticas usan el usuario autenticado y una función de rol. La escritura monetaria **no** ocurre por acceso directo del cliente, sino por servicios de aplicación con rol de servicio (D4 §2); aun así, RLS actúa como última barrera.

Función de rol (equivalente portable a `is_admin()` del hardening):

```sql
-- Patrón conceptual (no DDL de esta fase)
CREATE FUNCTION public.has_role(role_code text) RETURNS boolean ...
--  SELECT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
--                 WHERE ur.user_id = auth.uid() AND r.code = role_code)
```

| Tabla | SELECT | INSERT/UPDATE/DELETE | Notas |
|---|---|---|---|
| `users` | propio + Dirección | solo auth/admin técnico | Identidad de acceso. |
| `roles`, `user_roles`, `role_delegations` | Dirección | Dirección | Delegación con vigencia y motivo. |
| `persons` | Dirección+ | Dirección / Tesorería (limitado) | Maestro con vigencia. |
| `categories`, `subcategories`, `result_lines` | Dirección+ | Dirección | `limitado` Tesorería. |
| `ledger_accounts`, `accounts`, `account_ledger_map` | Dirección, Tesorería | Dirección (sensible) | **P3**: no auto-clasificar cuenta externa como propia. |
| `settings_parameters` (sueldo, reserva, umbrales) | Dirección | **solo Dirección** | P1/P2/P14. |
| `journal_entries`, `journal_lines` | Dirección, Contador (lectura), Tesorería (lectura operativa) | **solo libro (servicio)** | Inmutables; no se editan desde cliente (D1 I-02). |
| `accounting_periods` | Dirección+ | cierre Dirección; reapertura Dirección | Motivo obligatorio. |
| `account_movements` | Dirección, Tesorería | servicio | Sin escritura directa de UI. |
| `obligations`, `recurrence_rules` | Dirección, Tesorería | Tesorería / Dirección | — |
| `payments`, `payment_applications` | Dirección, Tesorería | servicio (Tesorería/Dirección) | Confirmación transaccional (D4). |
| `transfers`, `expenses`, `commissions`, `owner_withdrawals`, `contributions` | Dirección, Tesorería | servicio | — |
| `income_records`, `income_distributions` | Dirección, Tesorería | servicio | — |
| `external_settlements` | Dirección, Tesorería | servicio | MARI externa (P7). |
| `daily_closings`, `reconciliations` | Dirección, Tesorería | servicio | Conciliación visible. |
| `budgets`, `budget_lines`, `income_forecasts`, `investments`, `investment_evaluations` | Dirección, Tesorería (simula); aprueba Dirección | Dirección / planificación | Proyección ≠ libro. |
| `attachments` | según entidad referida (D+T) | servicio | Storage privado (§4). |
| `audit_events` | Dirección (total); Tesorería (propia/operativa) | **append-only** | Nunca UPDATE/DELETE (F2 §19). |

- **Prohibido:** policy amplia tipo `USING (true)` que exponga datos privados de otro usuario (patrón heredado de hardening). No existe lectura cruda de datos sensibles por usuarios no autorizados.
- **Externas:** `accounts.ownership='EXTERNA'` no aparece como disponibilidad propia en ningún reporte ni consulta (D2 R-D8, D3 M-12).

## 4. Storage privado de comprobantes

| Aspecto | Regla |
|---|---|
| Bucket | **Privado**; nunca público. |
| Metadatos | `attachments` (D1 §3.7) independientes del proveedor (F1 §12). |
| Acceso | URL firmada/temporal o descarga server-side; valida permiso sobre la entidad referida. |
| Integridad | `checksum` + `mime` al subir; rechazo de tipos no permitidos. |
| Volumen/tamaño | Límite configurable; `ATTACHMENT_TOO_LARGE`/`UNSUPPORTED_MIME` (D4 §4.15). |
| Retención | Plazo de conservación **PENDIENTE P9** (parámetro). |
| Borrado | No destructivo del documento (histórico); política de retención define. |

## 5. Secretos y configuración (server-only)

| # | Regla |
|---|---|
| SC-1 | Credenciales de base de datos, service keys y secretos de storage **solo** en variables de servidor (nunca en el bundle cliente). |
| SC-2 | El cliente usa únicamente endpoints autenticados; no recibe tokens privilegiados (F1 §12 "API y lógica sensible en servidor"). |
| SC-3 | Entornos separados de desarrollo, prueba y producción; sin mezclar datos beta con productivos (F1 §12; spec §4 out). |
| SC-4 | Rotación de secretos documentada; sin valores en repositorio (`.env*` fuera de cambios). |
| SC-5 | Migraciones de esquema versionadas y reproducibles (RNF-010). |

## 6. Auditoría y log de accesos sensibles

- `audit_events` (D1 §3.7) es **inmutable**: append-only; ninguna operación lo edita/borra.
- Cada evento guarda: `entity_type`, `entity_id`, `action`, `actor_user_id`, `occurred_at`, `before`, `after`, `reason` (F2 §19).
- **Eventos auditables** (F2 §19): creación/modificación de obligación; cambio de importe/vencimiento; confirmación, conciliación y reversión de pago; recurrencias; cierre/reapertura de período; ajuste de saldo; presupuesto; sueldo/reserva; evaluación/aprobación de inversión; permisos; importación/corrección de legado.
- **Accesos sensibles** (RNF-005, RF-023): consulta de auditoría, exportaciones, cambios de permisos, reaperturas y reversiones se registran con usuario y fecha-hora.
- **Consulta:** Dirección total; Tesorería sobre lo propio/operativo; Contador lectura si **P10**. No se envía PII/importes a terceros de analítica.

## 7. Delegación temporal de Tesorería

| Campo | Descripción |
|---|---|
| `role_code` | Rol delegado (p. ej. `TESORERIA`). |
| `delegate_user_id` | Usuario suplente. |
| `starts_at` / `ends_at` | Vigencia (**P13**). |
| `reason` | Motivo obligatorio. |
| `created_by` | Quién delega (Dirección). |

- La delegación **no** transfiere credenciales; conserva el usuario ejecutor real en cada acción (F2 §17).
- Solo Dirección crea/revoca; queda auditada (CU-024).
- Al vencer, el permiso se revoca automáticamente.

## 8. Backup y restauración

| # | Requisito | Base |
|---|---|---|
| B-1 | **Backup automático** de la base de datos | RNF-007 |
| B-2 | **Exportación periódica** (CSV + respaldo PostgreSQL) | RNF-008, F1 §4.10 |
| B-3 | **Restauración probada y documentada** antes de producción | F1 §16 Hito E |
| B-4 | Comprobantes respaldados con metadatos portables | F1 §12 |
| B-5 | Procedimiento de **rollback de migración** (D8) | F1 §19 |

- La prueba de restore se ejecuta en un entorno aislado y se documenta (fecha, responsable, resultado). **Hito E** exige backup y restauración probados (F1 §16).

## 9. Amenazas y mitigaciones

| # | Amenaza | Impacto | Mitigación |
|---|---|---|---|
| T-01 | Usuario común accede a datos financieros ajenos/sensibles | Exposición | RLS por fila + rol derivado en servidor; sin policies amplias (S-2/S-3). |
| T-02 | Tesorería revierte/edita sin control | Fraude/errores | Mutaciones por servicio transaccional; límites **P12**; auditoría; original inmutable (D1 I-02). |
| T-03 | Escalada de privilegios por endpoint | Cambios indebidos | Autorización server-side; Admin técnico sin datos financieros (S-1). |
| T-04 | Comprobante público | Fuga de información | Bucket privado + URL firmada (§4). |
| T-05 | Secreto en el bundle | Compromiso total | Secretos server-only (§5). |
| T-06 | Doble efecto por reintento/ataque | Saldo corrupto | Idempotencia (RF-030, D1 I-20); UNIQUE. |
| T-07 | Alteración de asiento confirmado | Libro inconsistente | Inmutabilidad + reversión (D1 I-02/I-03, D3). |
| T-08 | Pérdida de datos | Indisponibilidad | Backup + restore probado (§8). |
| T-09 | Manipulación de auditoría | Pérdida de trazabilidad | `audit_events` append-only (§6). |
| T-10 | Reapertura de período para alterar resultados | Resultados falsos | Permiso Dirección + motivo + auditoría (D1 I-18). |
| T-11 | Cuenta externa (MARI) contada como caja propia | Capacidad de inversión inflada | `ownership='EXTERNA'` excluida (S-3, D2 R-D8, D3 M-12). |
| T-12 | Delegación vencida sigue activa | Acceso indebido | `ends_at` revoca automáticamente; auditoría (§7). |
| T-13 | Mezcla de datos beta y productivos | Reportes incorrectos | Entornos separados (§5, SC-3). |
| T-14 | Manipulación de parámetros (sueldo, reserva) | Decisiones erróneas | Escritura solo Dirección + vigencia + auditoría (§3, `settings_parameters`). |

## 10. Pruebas de acceso indebido

Cada una se ejecuta **contra la base/API**, no contra la UI (la UI no es la barrera):

| # | Escenario | Resultado esperado |
|---|---|---|
| AP-01 | Tesorería intenta leer `settings_parameters` de sueldo/reserva | Rechazado. |
| AP-02 | Tesorería intenta aprobar inversión | Rechazado (solo Dirección). |
| AP-03 | Tesorería intenta reabrir período cerrado | Rechazado. |
| AP-04 | Contador (si habilitado, **P10**) intenta escribir | Rechazado (lectura/exportación). |
| AP-05 | Usuario no autenticado consulta cualquier tabla | Rechazado. |
| AP-06 | Cliente fuerza rol distinto en request | Rechazado (rol derivado server-side). |
| AP-07 | Acceso directo a un `attachment` sin permiso sobre la entidad | Rechazado / URL firmada inválida. |
| AP-08 | Editar/borrar `journal_entries` confirmado vía API cruda | Rechazado (inmutable). |
| AP-09 | Borrar/modificar `audit_events` | Rechazado (append-only). |
| AP-10 | Delegación vencida intenta operar | Rechazado. |
| AP-11 | Admin técnico intenta leer importes financieros | Rechazado por defecto. |
| AP-12 | Usar cuenta externa (MARI) como cuenta pagadora propia | Rechazado (R-D2/R-D8). |

> Estas pruebas se formalizan en `pruebas.md` (**D9**), sección DB/RLS y permisos.

## 11. Decisiones pendientes

| # | Decisión | Impacto en D6 |
|---|---|---|
| P9 | Plazo de conservación de comprobantes | Política de retención de storage (§4). |
| P10 | Acceso del contador (lectura/exportación) en MVP o posterior | Rol `CONTADOR` y policies de lectura. |
| P12 | Límites monetarios de reversión; quién ejecuta vs solicita | Reglas de autorización de Tesorería. |
| P13 | Suplente, delegación temporal, aprobación de maestros | `role_delegations`, flujo de aprobación. |
| P14 | Umbrales y canales de alertas | No altera RBAC; afecta notificaciones. |
| P7 | Naturaleza de fondos externos (MARI) | Reglas de cuenta externa. |

> **No-asunción:** las políticas RLS son conceptuales; no se fija DDL. Ninguna decisión de negocio se cierra.

## 12. Próximo paso

- Validar la matriz RBAC y las pruebas de acceso indebido con Dirección.
- Enlazar cada policy conceptual con la entidad de `ER.md` (D1) y con los servicios de `contratos-dominio.md` (D4).
- Alimentar **D9 (pruebas)** con las secciones DB/RLS, permisos y auditoría.
