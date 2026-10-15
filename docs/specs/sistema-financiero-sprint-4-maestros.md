# Spec — Sistema financiero sprint 4: maestros y plan de cuentas

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-3-reversion-asientos.md` y de `src/finanzas/` creado en los sprints 1–3.
> Épica del backlog: **E2 — Maestros y plan de cuentas** (`docs/diseno-financiero/backlog-desarrollo.md`).

## 1. Resumen

Este sprint agrega los catálogos de dominio del sistema financiero: personas, categorías, subcategorías, líneas de resultado, plan de cuentas contable y cuentas financieras. Sigue siendo dominio/aplicación pura, sin UI, sin Supabase y sin migraciones SQL.

El objetivo es poder referenciar maestros con vigencia y validados antes de construir tesorería (E4), que depende de estas entidades.

## 2. Objetivo

- Modelar las entidades de maestros de `ER.md` §3.2 con vigencia (`valid_from` / `valid_to`).
- Mantener separadas la **cuenta financiera** (`accounts`) de la **cuenta contable** (`ledger_accounts`).
- Validar estructura e invariantes de cada maestro como funciones puras.
- Implementar `MasterDataService.createMaster` y `searchDuplicates` con repositorios in-memory.
- Bloquear la creación silenciosa de duplicados (RF-033).
- Probar vigencia, jerarquía, duplicados y separación cuenta financiera ↔ contable sin base de datos.

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/ER.md` | §3.2 diccionario de maestros; §6 convenciones de vigencia; invariantes I-16, I-17. |
| `docs/diseno-financiero/plan-cuentas.md` | §3 diccionario de cuentas contables; §4 mapeo de cuentas financieras; §6 reglas de disponibilidad. |
| `docs/diseno-financiero/contratos-dominio.md` | §4.13 `MasterDataService`; §5 catálogo de errores; §3 tabla de módulos. |
| `docs/diseno-financiero/backlog-desarrollo.md` | E2-01 a E2-04 y E2-06. |
| `docs/diseno-financiero/pruebas.md` | Tests de maestros y vigencia en versión unitaria/in-memory. |

## 4. Alcance incluido

- Tipos y enums de maestros: `Person`, `Category`, `Subcategory`, `ResultLine`, `LedgerAccount`, `Account`.
- Helper de vigencia `isCurrentAt`.
- Validadores puros por entidad.
- Repositorio port `MasterRepository` como interfaz, sin infraestructura real.
- Implementación in-memory solo para tests.
- `MasterDataService.createMaster(ctx, command)` y `MasterDataService.searchDuplicates(candidate)`.
- Tests unitarios de validación, jerarquía, duplicados y separación cuenta financiera ↔ contable.

## 5. Alcance excluido

- Supabase, SQL, RLS, triggers o migraciones.
- UI financiera.
- Asistente guiado de alta de cuenta (`runAssistant`, E2-05): depende de P3 y de las 13 preguntas (F2 §13.1).
- Cambios sensibles que requieren aprobación (`decideSensitiveChange`, E2-05): depende de P13.
- `account_ledger_map` versionado (historia del mapeo cuenta ↔ contable): este sprint modela solo el mapeo vigente (`Account.ledgerAccountId`).
- Recurrencias, comisiones, obligaciones, pagos, ingresos o transferencias.
- Datos reales de producción.
- Cierre de decisiones de negocio pendientes.
- Cambios en landing, `/prode`, `/escuela`, analytics o deploy.

## 6. Cambios por archivo esperados

### Crear

| Archivo | Responsabilidad |
|---|---|
| `src/finanzas/domain/masters.ts` | Tipos y enums compartidos (`PersonKind`, `CategoryNature`, `ResultLineNature`, `LedgerAccountNature`, `AccountKind`, `AccountOwnership`, `MasterEntityType`), `Validity`, `MasterBase`, helper `isCurrentAt`, y función pura `findDuplicateCandidates`. |
| `src/finanzas/domain/persons.ts` | `Person`, `validatePerson` y normalización de nombre para duplicados. |
| `src/finanzas/domain/categories.ts` | `Category`, `Subcategory`, `ResultLine` y sus validadores. |
| `src/finanzas/domain/ledger-accounts.ts` | `LedgerAccount` y `validateLedgerAccount`. |
| `src/finanzas/domain/accounts.ts` | `Account` (cuenta financiera) y `validateAccount`. |
| `src/finanzas/application/master-data-service.ts` | `MasterDataService` con `createMaster` y `searchDuplicates`. |
| `src/finanzas/domain/__tests__/masters.test.ts` | Tests de vigencia, personas, categorías, subcategorías y líneas de resultado. |
| `src/finanzas/domain/__tests__/ledger-accounts-accounts.test.ts` | Tests de plan de cuentas contable y cuentas financieras. |
| `src/finanzas/application/__tests__/master-data-service.test.ts` | Tests del servicio con repositorio in-memory. |

### Editar

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/types.ts` | Agregar códigos de error de maestros a `DomainErrorCode`. |
| `src/finanzas/domain/errors.ts` | Agregar los nuevos códigos a `DOMAIN_ERROR_CODES`. |
| `src/finanzas/index.ts` | Exportar los nuevos módulos. |

## 7. Contratos a implementar

### 7.1 Enums y tipos base (`masters.ts`)

```ts
export type PersonKind = 'PERSONA' | 'EMPRESA';
export type CategoryNature = 'OPERATIVA' | 'EXTRAORDINARIA' | 'FINANCIERA';
export type ResultLineNature = 'INGRESO' | 'COSTO' | 'GASTO' | 'NO_RESULTADO';
export type LedgerAccountNature = 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO' | 'PUENTE';
export type AccountKind = 'EFECTIVO' | 'BANCO' | 'BILLETERA' | 'TRANSITORIA';
export type AccountOwnership = 'PROPIA' | 'EXTERNA' | 'RESTRINGIDA';

export type MasterEntityType =
  | 'PERSON'
  | 'CATEGORY'
  | 'SUBCATEGORY'
  | 'RESULT_LINE'
  | 'LEDGER_ACCOUNT'
  | 'ACCOUNT';

export type Validity = {
  validFrom: string;
  validTo: string | null; // null = vigente
};

export type MasterBase = Validity & {
  id: string;
  createdAt: string;
  createdBy: UserId;
};

export function isCurrentAt(master: Validity, at: string): boolean;
```

Regla de vigencia (`isCurrentAt`): `validFrom <= at` y (`validTo === null` o `at <= validTo`).

### 7.2 Personas (`persons.ts`)

```ts
export type Person = MasterBase & {
  entityType: 'PERSON';
  displayName: string;
  kind: PersonKind;
  taxId: string | null;
};

export function validatePerson(input: {
  displayName: string;
  kind: PersonKind;
}): Result<{ displayName: string; kind: PersonKind }>;
```

Reglas:

- `displayName` no vacío (trim) → si falla, `MISSING_REQUIRED_FIELD`.
- `kind` debe ser `PERSONA` o `EMPRESA` → si falla, `VALIDATION_FAILED`.

### 7.3 Categorías, subcategorías y líneas de resultado (`categories.ts`)

```ts
export type Category = MasterBase & {
  entityType: 'CATEGORY';
  code: string;
  name: string;
  nature: CategoryNature;
};

export type Subcategory = MasterBase & {
  entityType: 'SUBCATEGORY';
  code: string;
  name: string;
  categoryId: string;
};

export type ResultLine = MasterBase & {
  entityType: 'RESULT_LINE';
  code: string;
  name: string;
  nature: ResultLineNature;
  order: number;
};
```

Reglas de validación:

- `Category`: `code` y `name` no vacíos (`MISSING_REQUIRED_FIELD`); `nature` válido (`VALIDATION_FAILED`).
- `Subcategory`: `code`, `name` y `categoryId` no vacíos (`MISSING_REQUIRED_FIELD`). La existencia de la categoría referenciada se valida en el servicio (necesita repositorio).
- `ResultLine`: `code` y `name` no vacíos; `nature` válido; `order` entero >= 0 (`VALIDATION_FAILED`).

### 7.4 Plan de cuentas contable (`ledger-accounts.ts`)

```ts
export type LedgerAccount = MasterBase & {
  entityType: 'LEDGER_ACCOUNT';
  code: string;
  name: string;
  nature: LedgerAccountNature;
  parentId: string | null;
  isPostable: boolean;
};
```

Reglas de validación:

- `code` y `name` no vacíos.
- `nature` debe estar en el enum (incluye `PUENTE` para la rama 6 de `plan-cuentas.md` §2).
- Si `parentId` existe, debe referenciar una cuenta contable existente → validado en el servicio con `MASTER_NOT_FOUND`.

### 7.5 Cuentas financieras (`accounts.ts`)

```ts
export type Account = MasterBase & {
  entityType: 'ACCOUNT';
  name: string;
  kind: AccountKind;
  ownership: AccountOwnership;
  financialInstitution: string | null;
  currency: Currency;
  ledgerAccountId: string;
  isAvailable: boolean;
  isReconcilable: boolean;
};

export function validateAccount(input: {
  name: string;
  kind: AccountKind;
  ownership: AccountOwnership;
  currency: Currency;
  ledgerAccountId: string;
  isAvailable: boolean;
}): Result<...>;
```

Reglas de validación:

- `name` no vacío (`MISSING_REQUIRED_FIELD`).
- `currency` debe ser `ARS` o `USD` (`VALIDATION_FAILED`).
- `ledgerAccountId` no vacío; su existencia se valida en el servicio con `MASTER_NOT_FOUND`.
- **Invariante I-17 / R-D2**: una cuenta `EXTERNA` no puede ser `isAvailable=true` → `VALIDATION_FAILED` con detalle (los fondos externos nunca computan disponibilidad propia).

### 7.6 Errores nuevos

Agregar a `DomainErrorCode` (y a `DOMAIN_ERROR_CODES`):

| Código | Origen | Recuperable |
|---|---|---|
| `MASTER_NOT_CURRENT` | D4 §5 / I-16 | sí |
| `POSSIBLE_DUPLICATE_MASTER` | D4 §5 / RF-033 | sí |
| `MASTER_CODE_EXISTS` | nuevo (código duplicado, bloqueo duro) | sí |
| `MASTER_NOT_FOUND` | nuevo (referencia a maestro inexistente) | sí |

`MASTER_CODE_EXISTS` y `MASTER_NOT_FOUND` siguen el patrón de los sprints 2–3, que ya agregaron `PERIOD_NOT_FOUND`, `ENTRY_NOT_FOUND` y `REVERSAL_ALREADY_EXISTS`.

### 7.7 Servicio (`master-data-service.ts`)

```ts
export type Master = Person | Category | Subcategory | ResultLine | LedgerAccount | Account;

export type CreateMasterCommand =
  | { entityType: 'PERSON'; displayName: string; kind: PersonKind; taxId?: string; validFrom: string; confirmPossibleDuplicate?: boolean }
  | { entityType: 'CATEGORY'; code: string; name: string; nature: CategoryNature; validFrom: string; confirmPossibleDuplicate?: boolean }
  | { entityType: 'SUBCATEGORY'; code: string; name: string; categoryId: string; validFrom: string; confirmPossibleDuplicate?: boolean }
  | { entityType: 'RESULT_LINE'; code: string; name: string; nature: ResultLineNature; order: number; validFrom: string; confirmPossibleDuplicate?: boolean }
  | { entityType: 'LEDGER_ACCOUNT'; code: string; name: string; nature: LedgerAccountNature; parentId?: string; isPostable: boolean; validFrom: string; confirmPossibleDuplicate?: boolean }
  | { entityType: 'ACCOUNT'; name: string; kind: AccountKind; ownership: AccountOwnership; financialInstitution?: string; currency: Currency; ledgerAccountId: string; isAvailable: boolean; isReconcilable: boolean; validFrom: string; confirmPossibleDuplicate?: boolean };

export type MasterDuplicate = {
  entityType: MasterEntityType;
  existingId: string;
  existingCode: string | null;
  existingName: string;
  reason: string;
};

export type MasterRepository = {
  findByCode(entityType: MasterEntityType, code: string): Promise<Master | null>;
  findById(entityType: MasterEntityType, id: string): Promise<Master | null>;
  findAll(entityType: MasterEntityType): Promise<Master[]>;
  save(master: Master): Promise<Master>;
};

export class MasterDataService {
  searchDuplicates(candidate: CreateMasterCommand): Promise<MasterDuplicate[]>;
  createMaster(ctx: CommandContext, command: CreateMasterCommand): Promise<Result<Master>>;
}
```

Reglas de `createMaster`:

1. Validar la estructura del maestro con su validador puro. Si falla, devolver el error correspondiente.
2. Si la entidad usa `code`, verificar unicidad dura con `findByCode`: si existe un maestro vigente con el mismo `code`, devolver `MASTER_CODE_EXISTS` (detalle con `existingId`).
3. Validar referencias: `Subcategory.categoryId`, `Account.ledgerAccountId` y `LedgerAccount.parentId` deben existir → si no, `MASTER_NOT_FOUND`.
4. Detectar duplicados posibles con `findDuplicateCandidates` (nombre normalizado y, para personas, `taxId`). Si hay candidatos y `confirmPossibleDuplicate !== true`, devolver `POSSIBLE_DUPLICATE_MASTER` (recuperable) con `details.candidates`.
5. Si todo es válido, crear el maestro con `id` generado, `validFrom` del comando, `validTo = null`, `createdAt = ctx.now` y `createdBy = ctx.actorUserId`, y devolverlo.

Reglas de `searchDuplicates`:

- Devuelve la lista de candidatos duplicados sin bloquear (es una consulta, no una mutación). No devuelve `Result`; si el repositorio no encuentra nada, devuelve `[]`.

## 8. Tests requeridos

### `masters.test.ts` (vigencia, personas, categorías, líneas)

- `isCurrentAt`: vigente cuando `validTo === null`; no vigente antes de `validFrom`; no vigente después de `validTo`.
- `validatePerson`: acepta persona válida; rechaza `displayName` vacío con `MISSING_REQUIRED_FIELD`.
- `validateCategory`: acepta categoría válida; rechaza `code` vacío.
- `validateSubcategory`: acepta subcategoría válida; rechaza `categoryId` vacío.
- `validateResultLine`: acepta línea con `order >= 0`; rechaza `order < 0` con `VALIDATION_FAILED`.

### `ledger-accounts-accounts.test.ts`

- `validateLedgerAccount`: acepta cuenta postable hoja; acepta agrupación no postable; rechaza `code` vacío.
- `validateAccount`: acepta cuenta propia disponible; rechaza cuenta `EXTERNA` con `isAvailable=true` (I-17) con `VALIDATION_FAILED`; rechaza `currency` inválido.

### `master-data-service.test.ts`

- Crea una persona válida → devuelve `Person` con `id` y `validTo = null`.
- Crea una categoría con `code` duplicado → `MASTER_CODE_EXISTS`.
- Crea una subcategoría con `categoryId` inexistente → `MASTER_NOT_FOUND`.
- Crea una cuenta financiera con `ledgerAccountId` inexistente → `MASTER_NOT_FOUND`.
- Crea un duplicado posible (mismo nombre normalizado) sin confirmación → `POSSIBLE_DUPLICATE_MASTER` con `details.candidates`.
- Crea un duplicado posible con `confirmPossibleDuplicate = true` → crea exitosamente.
- `searchDuplicates` devuelve candidatos por nombre normalizado y por `taxId` (personas).

## 9. Criterios de aceptación

- `npm run test` pasa.
- `npm run typecheck` pasa.
- `npm run lint` pasa.
- `MasterDataService` y los validadores no importan React, Astro, Supabase ni navegador.
- La cuenta financiera (`Account`) y la cuenta contable (`LedgerAccount`) quedan modeladas como entidades separadas.
- Una cuenta `EXTERNA` no puede marcarse disponible (invariante I-17/R-D2).
- No se crean maestros con `code` duplicado de forma silenciosa.
- No se toca UI, rutas públicas, `/prode`, Supabase ni deploy.

## 10. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto en este sprint | Tratamiento |
|---|---|---|
| P3 (titularidad/naturaleza de cuentas) | No se decide; `ownership` y `isAvailable` quedan como campos abiertos. | Se parametriza; no se asume titularidad de Santander WASHINGTON ni BaPro MILTON. |
| Discrepancia de naturalezas (D1: 5 naturalezas vs D2 rama 6 "Puente") | `LedgerAccountNature` debe admitir la rama 6. | Se resuelve agregando `PUENTE`; se documenta como pendiente de confirmación. |
| `account_ledger_map` versionado | Historia del mapeo cuenta ↔ contable. | Diferido; este sprint modela solo el mapeo vigente (`Account.ledgerAccountId`). |
| Asistente guiado (E2-05) | `runAssistant` y `decideSensitiveChange`. | Fuera de alcance (depende P3 + 13 preguntas y P13). |
| Exceso de abstracción | Podría frenar el MVP. | Un solo `MasterDataService` con comando unión discriminado; sin capas extra. |

## 11. Rollback

Este sprint no toca datos ni producción. Rollback esperado:

- Eliminar los archivos nuevos de `src/finanzas/domain/` (`masters.ts`, `persons.ts`, `categories.ts`, `ledger-accounts.ts`, `accounts.ts`), `src/finanzas/application/master-data-service.ts` y sus tests.
- Revertir las exportaciones de `src/finanzas/index.ts` y los códigos de error agregados en `types.ts` / `errors.ts`.
- No requiere cambios en Supabase, variables de entorno ni datos.

Si se detecta impacto indirecto en build, revertir únicamente los archivos creados por esta spec.
