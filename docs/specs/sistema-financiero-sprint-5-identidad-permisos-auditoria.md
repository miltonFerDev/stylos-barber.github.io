# Spec — Sistema financiero sprint 5: identidad, permisos y auditoría

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-4-maestros.md` y de `src/finanzas/` creado en los sprints 1–4.
> Épicas del backlog: **E1 — Identidad, roles y permisos** (restante) y **E3 — Libro, períodos, asientos y auditoría** (restante: E3-04 inmutabilidad, E3-05 auditoría).

## 1. Resumen

Este sprint agrega el modelo de identidad y roles, la matriz RBAC con resolución de permisos server-side, la delegación temporal de Tesorería, la auditoría append-only y la inmutabilidad explícita de asientos confirmados. Sigue siendo dominio/aplicación pura, sin UI, sin Supabase y sin migraciones SQL.

## 2. Objetivo

- Modelar `users`, `roles`, `user_roles` y `role_delegations` (D1 §3.1).
- Definir la matriz RBAC (D6 §2.1) y la resolución pura `hasPermission`.
- Implementar `PermissionService.authorize` derivando el rol del usuario autenticado (nunca del cliente).
- Soportar delegación temporal de Tesorería con vigencia y motivo (E1-03).
- Implementar `AuditService` con eventos append-only (D4 §4.14, D6 §6).
- Hacer explícita la inmutabilidad de asientos confirmados (D1 I-02, `ENTRY_IMMUTABLE`).
- Integrar permisos y auditoría en los servicios existentes y probar accesos indebidos.

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/seguridad.md` | §2 matriz RBAC; §6 auditoría; §7 delegación; §10 pruebas de acceso indebido. |
| `docs/diseno-financiero/ER.md` | §3.1 identidad y acceso; §3.7 `audit_events`; invariantes I-02, I-20. |
| `docs/diseno-financiero/contratos-dominio.md` | §4.14 `AuditService`; §2.1 rol derivado server-side; §5 catálogo de errores; §6 paso 1 validar permiso. |
| `docs/diseno-financiero/backlog-desarrollo.md` | E1-01 a E1-05; E3-04 y E3-05. |
| `docs/diseno-financiero/pruebas.md` | Pruebas de permisos y auditoría en versión unitaria/in-memory. |

## 4. Alcance incluido

- Tipos de identidad (`User`, `Role`, `UserRole`, `RoleDelegation`).
- `PermissionAction` + `RBAC_MATRIX` + `hasPermission` (función pura).
- `PermissionService.authorize` con resolución server-side (repo de roles, no rol del cliente).
- Delegación temporal: `isDelegationActive` y resolución de roles efectivos.
- `AuditEvent` + `AuditService.recordEvent` / `queryHistory` con repositorio append-only.
- Integración: `MasterDataService.createMaster` valida permiso y registra auditoría; `JournalService` registra auditoría en posteo y reversión.
- Inmutabilidad explícita: `JournalService.updateEntry` / `deleteEntry` devuelven `ENTRY_IMMUTABLE`.
- Tests unitarios de RBAC, permisos, delegación, auditoría, inmutabilidad y acceso indebido.

## 5. Alcance excluido

- Supabase, SQL, RLS, triggers o migraciones (la RLS real y los triggers de inmutabilidad van en el sprint de infraestructura/Supabase).
- UI financiera.
- Auth real (sesiones, proveedores OAuth) — aquí solo se modela la resolución de permisos.
- Roles/permisos sobre servicios de tesorería (E4) — se integran cuando existan esos servicios.
- `settings_parameters`, `attachments`, backup/restore.
- Cierre de decisiones P12 (límites monetarios) y P13 (flujo de aprobación).
- Cambios en landing, `/prode`, `/escuela`, analytics o deploy.

## 6. Cambios por archivo esperados

### Crear

| Archivo | Responsabilidad |
|---|---|
| `src/finanzas/domain/identity.ts` | `User`, `Role`, `UserRole`, `RoleDelegation` + `isDelegationActive`. |
| `src/finanzas/domain/permissions.ts` | `PermissionAction`, `RBAC_MATRIX`, `hasPermission`. |
| `src/finanzas/domain/audit.ts` | `AuditAction`, `AuditEvent`, `AuditEventInput`, `AuditRecorder`. |
| `src/finanzas/application/permission-service.ts` | `PermissionService` + `RoleRepository` + `Authorizer`. |
| `src/finanzas/application/audit-service.ts` | `AuditService` + `AuditEventRepository`. |
| `src/finanzas/domain/__tests__/permissions.test.ts` | Tests de RBAC, `hasPermission` e `isDelegationActive`. |
| `src/finanzas/application/__tests__/permission-service.test.ts` | Tests de autorización y delegación. |
| `src/finanzas/application/__tests__/audit-service.test.ts` | Tests de auditoría append-only. |

### Editar

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/types.ts` | Agregar `ENTRY_IMMUTABLE` a `DomainErrorCode`. |
| `src/finanzas/domain/errors.ts` | Agregar `ENTRY_IMMUTABLE` a `DOMAIN_ERROR_CODES`. |
| `src/finanzas/application/journal-service.ts` | Agregar dependencia `audit`, registrar eventos, agregar `updateEntry`/`deleteEntry` (inmutables). |
| `src/finanzas/application/master-data-service.ts` | Agregar dependencias `authorize` y `audit`. |
| `src/finanzas/application/__tests__/journal-service.test.ts` | Inyectar auditoría; tests de evento de auditoría e inmutabilidad. |
| `src/finanzas/application/__tests__/master-data-service.test.ts` | Inyectar `authorize` y `audit`; tests de permiso denegado y auditoría. |
| `src/finanzas/index.ts` | Exportar nuevos módulos. |

## 7. Contratos a implementar

### 7.1 Identidad (`identity.ts`)

```ts
export type User = {
  id: UserId;
  email: string;
  isActive: boolean;
};

export type Role = {
  id: string;
  code: RoleCode;
  name: string;
};

export type UserRole = {
  userId: UserId;
  roleId: string;
  grantedAt: string;
  grantedBy: UserId;
};

export type RoleDelegation = {
  id: string;
  roleCode: RoleCode;
  delegateUserId: UserId;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdBy: UserId;
};

export function isDelegationActive(delegation: RoleDelegation, at: string): boolean;
```

Regla (`isDelegationActive`): `startsAt <= at && at <= endsAt`.

### 7.2 Permisos (`permissions.ts`)

`PermissionAction` cubre la matriz D6 §2.1:

```ts
export type PermissionAction =
  | 'VIEW_BALANCES'
  | 'CREATE_OBLIGATION'
  | 'MODIFY_OBLIGATION'
  | 'CONFIRM_PAYMENT'
  | 'REVERSE_PAYMENT'
  | 'RECONCILE_ACCOUNT'
  | 'REGISTER_DAILY_INCOME'
  | 'MODIFY_CATALOGS'
  | 'CREATE_MASTER'
  | 'DEFINE_SALARY'
  | 'DEFINE_RESERVE'
  | 'SIMULATE_INVESTMENT'
  | 'APPROVE_INVESTMENT'
  | 'APPROVE_SENSITIVE_CHANGE'
  | 'CLOSE_PERIOD'
  | 'REOPEN_PERIOD'
  | 'VIEW_AUDIT'
  | 'EXPORT_DATA'
  | 'MANAGE_USERS_ROLES'
  | 'MANAGE_DEPLOYMENTS';
```

```ts
export const RBAC_MATRIX: Record<PermissionAction, readonly RoleCode[]>;
export function hasPermission(roleCodes: readonly RoleCode[], action: PermissionAction): boolean;
```

Matriz (traducida de D6 §2.1; las celdas con matiz P12/P13 se modelan como "permitido" y se documentan como pendiente de afinado):

| Acción | Roles permitidos |
|---|---|
| `VIEW_BALANCES`, `VIEW_AUDIT`, `EXPORT_DATA` | `DIRECCION`, `TESORERIA`, `CONTADOR` |
| `CREATE_OBLIGATION`, `MODIFY_OBLIGATION`, `CONFIRM_PAYMENT`, `REGISTER_DAILY_INCOME`, `SIMULATE_INVESTMENT` | `DIRECCION`, `TESORERIA` |
| `REVERSE_PAYMENT`, `MODIFY_CATALOGS`, `CREATE_MASTER` | `DIRECCION`, `TESORERIA` (afinado por P12/P13) |
| `RECONCILE_ACCOUNT` | `TESORERIA` |
| `DEFINE_SALARY`, `DEFINE_RESERVE`, `APPROVE_INVESTMENT`, `APPROVE_SENSITIVE_CHANGE`, `CLOSE_PERIOD`, `REOPEN_PERIOD` | `DIRECCION` |
| `MANAGE_USERS_ROLES` | `DIRECCION`, `ADMIN_TECNICO` |
| `MANAGE_DEPLOYMENTS` | `ADMIN_TECNICO` |

Reglas:

- `ADMIN_TECNICO` **no** tiene `VIEW_BALANCES` (no ve importes financieros, D6 §2.1 nota).
- `hasPermission` devuelve `true` si al menos un rol del usuario está permitido para la acción.

### 7.3 Auditoría (`audit.ts` + `audit-service.ts`)

```ts
export type AuditAction =
  | 'JOURNAL_ENTRY_POSTED'
  | 'JOURNAL_ENTRY_REVERSED'
  | 'MASTER_CREATED';

export type AuditEvent = {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  actorUserId: UserId;
  occurredAt: string;
  reason: string | null;
};

export type AuditEventInput = Omit<AuditEvent, 'id'>;

export type AuditRecorder = {
  record(event: AuditEventInput): Promise<void>;
};

export type AuditEventRepository = {
  append(event: AuditEvent): Promise<AuditEvent>;
  findByEntity(entityType: string, entityId: string): Promise<AuditEvent[]>;
};

export class AuditService {
  recordEvent(ctx: CommandContext, input: { entityType: string; entityId: string; action: AuditAction; reason?: string }): Promise<AuditEvent>;
  queryHistory(filters: { entityType: string; entityId: string }): Promise<AuditEvent[]>;
}
```

Reglas:

- `AuditEventRepository` es **append-only**: solo `append` y lecturas; no expone `update` ni `delete` (D6 §6, AP-09).
- `recordEvent` genera el `id`, toma `actorUserId` y `occurredAt` del `CommandContext`.

### 7.4 Permisos (`permission-service.ts`)

```ts
export type RoleRepository = {
  findUserRoles(userId: UserId): Promise<RoleCode[]>;
  findActiveDelegations(userId: UserId, at: string): Promise<RoleCode[]>;
};

export type Authorizer = (ctx: CommandContext, action: PermissionAction) => Promise<Result<void>>;

export class PermissionService {
  authorize(ctx: CommandContext, action: PermissionAction): Promise<Result<void>>;
}
```

Reglas:

- El rol se deriva del `actorUserId` contra el repositorio (server-side); el `CommandContext` **no** lleva campo de rol.
- Roles efectivos = roles directos ∪ delegaciones activas a `ctx.now`.
- Si `hasPermission(effective, action)` es `false`, devolver `PERMISSION_DENIED` (no recuperable) con `details.action` y `details.roles`.

### 7.5 Inmutabilidad (`journal-service.ts`)

```ts
export type UpdateJournalEntryCommand = {
  entryId: string;
  description?: string;
  lines?: JournalLineDraft[];
};

// En JournalService:
updateEntry(ctx: CommandContext, command: UpdateJournalEntryCommand): Promise<Result<JournalEntry>>;
deleteEntry(ctx: CommandContext, entryId: string): Promise<Result<JournalEntry>>;
```

Reglas:

- Un asiento `CONFIRMADO` es inmutable (D1 I-02). `updateEntry` y `deleteEntry` siempre devuelven `ENTRY_IMMUTABLE` (no recuperable) con `details.entryId`.
- La única corrección es `reverseEntry` (sprint 3), que crea un asiento inverso sin tocar el original.

### 7.6 Integración en servicios existentes

- `MasterDataService.createMaster`: antes de validar, `await authorize(ctx, 'CREATE_MASTER')`; si falla, devolver el `PERMISSION_DENIED`. Tras guardar, `await audit.record({ entityType: command.entityType, entityId: master.id, action: 'MASTER_CREATED', ... })`.
- `JournalService.postEntry`: tras guardar, `audit.record({ entityType: 'journal_entry', entityId: entry.id, action: 'JOURNAL_ENTRY_POSTED', ... })`.
- `JournalService.reverseEntry`: tras `markReversed`, `audit.record({ entityType: 'journal_entry', entityId: reversal.id, action: 'JOURNAL_ENTRY_REVERSED', reason: command.reason, ... })`.
- `JournalService` **no** valida permiso propio: es servicio interno invocado por servicios de negocio ya autorizados (D4 §3).

## 8. Tests requeridos

### `permissions.test.ts`

- `hasPermission(['DIRECCION'], 'APPROVE_INVESTMENT')` → `true`.
- `hasPermission(['TESORERIA'], 'APPROVE_INVESTMENT')` → `false`.
- `hasPermission(['TESORERIA'], 'RECONCILE_ACCOUNT')` → `true`.
- `hasPermission([], 'CREATE_OBLIGATION')` → `false`.
- `hasPermission(['ADMIN_TECNICO'], 'MANAGE_DEPLOYMENTS')` → `true`.
- `hasPermission(['ADMIN_TECNICO'], 'VIEW_BALANCES')` → `false`.
- `isDelegationActive`: activa dentro de vigencia; inactiva antes de `startsAt`; inactiva después de `endsAt`.

### `permission-service.test.ts`

- Autoriza con rol permitido → `ok`.
- Usuario sin roles → `PERMISSION_DENIED`.
- Usuario con rol insuficiente (p. ej. Tesorería intenta `APPROVE_INVESTMENT`) → `PERMISSION_DENIED`.
- Delegación activa otorga el rol → `ok`; delegación vencida → `PERMISSION_DENIED`.

### `audit-service.test.ts`

- `recordEvent` agrega un evento con `id`, `actorUserId` y `occurredAt` del ctx.
- `queryHistory` devuelve los eventos de una entidad.
- Append-only: dos `recordEvent` producen dos eventos (no se sobrescriben) y `queryHistory` devuelve ambos en orden.

### `journal-service.test.ts` (nuevos casos)

- Postear registra un evento `JOURNAL_ENTRY_POSTED`.
- Revertir registra un evento `JOURNAL_ENTRY_REVERSED` con el motivo.
- `updateEntry` devuelve `ENTRY_IMMUTABLE`.
- `deleteEntry` devuelve `ENTRY_IMMUTABLE`.

### `master-data-service.test.ts` (nuevos casos)

- Crear sin permiso → `PERMISSION_DENIED` y no se guarda.
- Crear con permiso registra un evento `MASTER_CREATED`.

## 9. Criterios de aceptación

- `npm run test` pasa.
- `npm run typecheck` pasa.
- `npm run lint` pasa.
- El rol se deriva del repositorio (server-side); ningún comando acepta un campo `role` del cliente.
- `AuditEventRepository` es append-only (sin `update`/`delete`).
- Un asiento confirmado no se puede actualizar ni eliminar (`ENTRY_IMMUTABLE`).
- `MasterDataService.createMaster` queda protegido por permiso y auditado.
- `JournalService` registra auditoría en posteo y reversión.
- No se toca UI, rutas públicas, `/prode`, Supabase ni deploy.

## 10. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto en este sprint | Tratamiento |
|---|---|---|
| P12 (límites monetarios de reversión) | Afecta `REVERSE_PAYMENT` y quién ejecuta vs solicita. | Se modela `REVERSE_PAYMENT` como `[DIRECCION, TESORERIA]`; el límite se afina cuando exista tesorería (E4). |
| P13 (suplente, delegación, aprobación de maestros) | Afecta el flujo de aprobación de `CREATE_MASTER` y la delegación. | Se modela delegación con vigencia y motivo; el flujo de aprobación queda fuera. |
| La RLS/triggers reales son de un sprint posterior | Aquí la inmutabilidad y el append-only se expresan en dominio/aplicación. | Documentado en la spec; no se asume que esto reemplaza a RLS (D6 S-3/S-4). |
| `CONTADOR` es rol futuro (P10) | Incluido en la matriz como solo lectura. | Se modela en `RBAC_MATRIX`; no se habilita operativamente todavía. |
| Exceso de abstracción | Podría frenar el MVP. | Funciones puras y un solo `PermissionService`/`AuditService`; sin capas extra. |

## 11. Rollback

Este sprint no toca datos ni producción. Rollback esperado:

- Eliminar los archivos nuevos de `src/finanzas/domain/` (`identity.ts`, `permissions.ts`, `audit.ts`), `src/finanzas/application/` (`permission-service.ts`, `audit-service.ts`) y sus tests.
- Revertir las dependencias agregadas en `journal-service.ts` y `master-data-service.ts`, los métodos `updateEntry`/`deleteEntry`, y las exportaciones/códigos de error.
- No requiere cambios en Supabase, variables de entorno ni datos.
