# Spec — Sistema financiero sprint 1: fundaciones de dominio

> Fase: desarrollo inicial. Esta spec habilita una implementación mínima y testeable del dominio financiero, sin UI operativa, sin base de datos productiva y sin migración de datos reales.

## 1. Resumen

El sprint 1 crea la base técnica aislada del sistema financiero: tipos de dominio, errores tipados, roles mínimos, modelo inicial de asiento y validaciones puras para balance contable. El objetivo es empezar por reglas testeables antes de construir pantallas, persistencia o flujos operativos.

La implementación debe convivir con el sitio actual, `/prode` y la landing sin modificar comportamiento existente.

## 2. Objetivo

Crear una fundación pequeña, explícita y verificable para el futuro MVP financiero:

- Separar el dominio financiero en su propio módulo.
- Representar dinero como string decimal, no como floating point.
- Definir `Result<T>` y `DomainError` para evitar errores genéricos.
- Definir roles mínimos de negocio.
- Modelar borradores de asientos y líneas.
- Validar en una función pura que un asiento está balanceado.
- Cubrir las reglas iniciales con tests unitarios rápidos.

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/specs/sistema-financiero-diseno.md` | Principios técnicos, alcance general, reglas de rechazo. |
| `docs/diseno-financiero/backlog-desarrollo.md` | Sprint 1 sugerido, E0, E1 y E3 inicial. |
| `docs/diseno-financiero/ER.md` | Convenciones de tipos, asientos, líneas, balance e inmutabilidad futura. |
| `docs/diseno-financiero/contratos-dominio.md` | `CommandContext`, `Result<T>`, `DomainError`, `RoleCode`, catálogo de errores. |
| `docs/diseno-financiero/pruebas.md` | Tests `BAL-01`, `BAL-06` y `UT-08`. |

## 4. Alcance incluido

- Crear estructura aislada bajo `src/finanzas/`.
- Crear tipos base de dominio financiero.
- Crear catálogo inicial de errores tipados.
- Crear helpers mínimos de dinero decimal.
- Crear modelo mínimo de asiento contable en borrador.
- Crear función pura de validación de asiento balanceado.
- Crear roles mínimos `DIRECCION` y `TESORERIA`, manteniendo tipos preparados para `CONTADOR` y `ADMIN_TECNICO`.
- Crear tests unitarios con Vitest para balance e importes inválidos.

## 5. Alcance excluido

- UI financiera, rutas Astro o navegación.
- Supabase, SQL, migraciones, RLS o storage.
- Auth real, sesiones o resolución server-side de permisos.
- Servicios transaccionales de pagos, obligaciones, ingresos, transferencias o cierres.
- Migración desde AppSheet/Sheets.
- Datos reales de producción.
- Cierre de decisiones pendientes de negocio.
- Cambios en landing, `/prode`, `/escuela`, analytics o deploy.

## 6. Cambios por archivo esperados

Crear:

| Archivo | Responsabilidad |
|---|---|
| `src/finanzas/domain/types.ts` | Tipos base: dinero, contexto, resultado, errores, roles. |
| `src/finanzas/domain/errors.ts` | Constantes/listas de códigos de error iniciales. |
| `src/finanzas/domain/money.ts` | Validación y normalización mínima de importes decimales. |
| `src/finanzas/domain/journal.ts` | Tipos de asiento/línea y validación de balance. |
| `src/finanzas/domain/roles.ts` | Roles mínimos y helpers simples de rol. |
| `src/finanzas/domain/__tests__/journal.test.ts` | Tests de asiento balanceado/desbalanceado. |
| `src/finanzas/domain/__tests__/money.test.ts` | Tests de importes válidos e inválidos. |
| `src/finanzas/index.ts` | Barrel export del módulo financiero. |

Editar solo si es estrictamente necesario:

| Archivo | Condición |
|---|---|
| `package.json` | Solo si falta script de tests. Actualmente existe `npm run test`, por lo tanto no debería tocarse. |

No tocar:

- `src/prode/**`
- `src/pages/index.astro`
- `src/components/layout/**`
- `supabase/**`
- `.github/**`
- Configuración de deploy
- `.env*`

## 7. Arquitectura mínima propuesta

```text
src/
  finanzas/
    index.ts
    domain/
      types.ts
      errors.ts
      money.ts
      journal.ts
      roles.ts
      __tests__/
        journal.test.ts
        money.test.ts
```

Reglas:

- `domain/` no importa React, Astro, Supabase ni APIs del navegador.
- Las funciones de dominio son puras y testeables.
- Los importes se calculan como centavos enteros internamente cuando sea necesario para comparar sumas.
- No se introduce persistencia todavía.
- No se crea UI todavía.

## 8. Tipos y contratos a implementar

### 8.1 Tipos base

```ts
export type Currency = 'ARS' | 'USD';

export type Money = {
  amount: string;
  currency: Currency;
};

export type Timestamp = string;
export type UserId = string & { readonly __brand: 'UserId' };

export type RoleCode = 'DIRECCION' | 'TESORERIA' | 'CONTADOR' | 'ADMIN_TECNICO';

export type CommandContext = {
  actorUserId: UserId;
  idempotencyKey: string;
  now: Timestamp;
};

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: DomainError };

export type DomainError = {
  code: DomainErrorCode;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
};
```

### 8.2 Errores iniciales

Debe incluir como mínimo:

- `VALIDATION_FAILED`
- `MISSING_REQUIRED_FIELD`
- `ENTRY_UNBALANCED`
- `CURRENCY_MISMATCH`
- `PERMISSION_DENIED`
- `DUPLICATE_IDEMPOTENCY`
- `CONCURRENCY_CONFLICT`
- `PERIOD_CLOSED`

Se pueden incluir más códigos del catálogo D4 si no aumenta complejidad.

### 8.3 Dinero

Funciones mínimas esperadas:

```ts
export function isValidMoneyAmount(amount: string): boolean;
export function moneyToMinorUnits(money: Money): Result<bigint>;
```

Reglas:

- `amount` debe ser string decimal positivo o cero, con máximo 2 decimales.
- No aceptar `NaN`, `Infinity`, notación exponencial, negativos, strings vacíos ni más de 2 decimales.
- No usar `parseFloat` para lógica financiera.
- Convertir a centavos como `bigint` para comparaciones/sumas.

### 8.4 Asientos

Tipos mínimos esperados:

```ts
export type JournalLineDraft = {
  ledgerAccountId: string;
  debit: Money;
  credit: Money;
};

export type JournalEntryDraft = {
  description: string;
  lines: JournalLineDraft[];
};
```

Función mínima esperada:

```ts
export function validateBalancedEntry(entry: JournalEntryDraft): Result<JournalEntryDraft>;
```

Reglas:

- Un asiento debe tener al menos 2 líneas.
- Cada línea debe tener misma moneda en débito y crédito.
- Una línea no puede tener débito y crédito positivos al mismo tiempo.
- Una línea no puede tener débito y crédito ambos en cero.
- Todas las líneas del asiento deben compartir moneda.
- La suma de débitos debe ser igual a la suma de créditos.
- Si falla balance, devolver `ENTRY_UNBALANCED`.
- Si falla formato/estructura, devolver `VALIDATION_FAILED` o `CURRENCY_MISMATCH` según corresponda.

### 8.5 Roles

Definir constantes simples:

```ts
export const FINANCE_ROLE_CODES = ['DIRECCION', 'TESORERIA', 'CONTADOR', 'ADMIN_TECNICO'] as const;
export const INITIAL_OPERATIVE_ROLE_CODES = ['DIRECCION', 'TESORERIA'] as const;
```

No implementar auth real en este sprint.

## 9. Tests requeridos

### `journal.test.ts`

Casos mínimos:

- Acepta asiento balanceado con dos líneas.
- Rechaza asiento desbalanceado con `ENTRY_UNBALANCED`.
- Rechaza asiento con una sola línea.
- Rechaza línea con débito y crédito positivos al mismo tiempo.
- Rechaza línea con débito y crédito ambos en cero.
- Rechaza monedas mezcladas.

### `money.test.ts`

Casos mínimos:

- Acepta `0`, `0.00`, `1`, `1.5`, `1.50`, `1500000.99`.
- Rechaza `''`, `-1`, `1.999`, `1e3`, `NaN`, `Infinity`, `abc`.
- Convierte `1.50` a `150n`.
- Convierte `0.01` a `1n`.

## 10. Criterios de aceptación

- Existe `src/finanzas/` con dominio puro y sin dependencias de UI, Supabase ni navegador.
- `npm run test` pasa.
- `npm run typecheck` pasa.
- `npm run lint` pasa si se ejecuta como alias de `astro check`.
- No se modifica comportamiento de landing, `/prode` ni `/escuela`.
- No se agregan migraciones ni policies.
- Las reglas de dinero no usan punto flotante para comparar importes.
- La validación de asiento devuelve `Result<T>` con errores tipados.
- Tests cubren `BAL-01`, `BAL-06` y `UT-08` en nivel unitario inicial.

## 11. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto en este sprint | Tratamiento |
|---|---|---|
| P-REC | No afecta todavía porque no se postean hechos reales. | No implementar devengamiento ni pagos. |
| P3 | No afecta todavía porque no se modelan cuentas financieras reales. | Dejar fuera de alcance. |
| P7 | No afecta todavía porque no hay fondos externos/MARI. | Dejar fuera de alcance. |
| P11 | No afecta todavía porque no hay sueldo. | Dejar fuera de alcance. |
| P12 | No afecta todavía porque no hay reversión real. | Dejar fuera de alcance. |
| Exceso de abstracción | Podría frenar el MVP. | Mantener funciones directas y tipos mínimos. |
| Precisión monetaria | Riesgo financiero central. | Usar string decimal + `bigint` en centavos. |

## 12. Rollback

Este sprint no toca datos ni producción. Rollback esperado:

- Eliminar `src/finanzas/**`.
- Eliminar tests asociados.
- No requiere cambios en Supabase, variables de entorno ni datos.

Si se detecta impacto indirecto en build, revertir únicamente los archivos creados por esta spec.
