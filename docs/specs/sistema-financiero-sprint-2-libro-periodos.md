# Spec — Sistema financiero sprint 2: libro y períodos mínimos

> Fase: desarrollo incremental. Depende de `docs/specs/sistema-financiero-sprint-1-fundaciones.md` y de `src/finanzas/` creado en sprint 1.

## 1. Resumen

Este sprint agrega el primer servicio de aplicación del sistema financiero: posteo de asientos contra períodos contables mínimos. Sigue siendo dominio/aplicación pura, sin UI, Supabase ni migraciones SQL.

## 2. Objetivo

- Modelar períodos contables mínimos.
- Validar que solo se postea en períodos abiertos.
- Crear `JournalService.postEntry` con idempotencia.
- Mantener asientos confirmados como resultado inmutable de una operación lógica.
- Probar balance, período cerrado e idempotencia sin base de datos.

## 3. Fuentes

| Fuente | Uso |
|---|---|
| `docs/diseno-financiero/ER.md` | Estados de período y asientos, invariantes I-01, I-04, I-18, I-20. |
| `docs/diseno-financiero/contratos-dominio.md` | `JournalService`, patrón transaccional, `CommandContext`, idempotencia y errores. |
| `docs/diseno-financiero/pruebas.md` | BAL-01, BAL-03, IDEM-01, DB-06 en versión unitaria/in-memory. |
| `docs/diseno-financiero/backlog-desarrollo.md` | E3 Libro, períodos, asientos y auditoría. |

## 4. Alcance incluido

- Tipos mínimos de período contable.
- Tipos de asiento confirmado.
- Repositorios port definidos como interfaces, sin infraestructura real.
- Implementación in-memory solo para tests.
- `JournalService.postEntry(ctx, command)`.
- Tests unitarios de posteo exitoso, asiento desbalanceado, período cerrado e idempotencia.

## 5. Alcance excluido

- Supabase, SQL, RLS, triggers o migraciones.
- UI financiera.
- Reversión de asientos.
- Numeración contable definitiva.
- Auditoría persistida.
- Auth real y RBAC server-side.
- Movimientos de cuenta, pagos, obligaciones o ingresos.

## 6. Cambios por archivo esperados

Crear:

| Archivo | Responsabilidad |
|---|---|
| `src/finanzas/domain/periods.ts` | Tipos y validadores mínimos de período. |
| `src/finanzas/application/journal-service.ts` | Servicio de aplicación para postear asientos. |
| `src/finanzas/application/__tests__/journal-service.test.ts` | Tests de servicio con repositorios in-memory. |

Editar:

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/types.ts` | Agregar `PERIOD_NOT_FOUND` si hace falta. |
| `src/finanzas/domain/errors.ts` | Exponer el nuevo error si se agrega. |
| `src/finanzas/domain/journal.ts` | Agregar tipos de asiento confirmado si corresponde. |
| `src/finanzas/index.ts` | Exportar nuevos módulos. |

## 7. Contratos a implementar

### 7.1 Períodos

```ts
export type AccountingPeriodStatus = 'ABIERTO' | 'EN_REVISION' | 'CERRADO';

export type AccountingPeriod = {
  id: string;
  code: string;
  startsOn: string;
  endsOn: string;
  status: AccountingPeriodStatus;
};
```

### 7.2 Asiento confirmado

```ts
export type JournalEntryStatus = 'CONFIRMADO';

export type JournalEntry = JournalEntryDraft & {
  id: string;
  periodId: string;
  entryDate: string;
  postingDate: string;
  status: JournalEntryStatus;
  sourceDocumentType: string;
  sourceDocumentId: string;
  idempotencyKey: string;
  createdBy: UserId;
  createdAt: Timestamp;
};
```

### 7.3 Servicio

```ts
export type PostJournalEntryCommand = {
  periodId: string;
  entryDate: string;
  sourceDocumentType: string;
  sourceDocumentId: string;
  description: string;
  lines: JournalLineDraft[];
};

export class JournalService {
  postEntry(ctx: CommandContext, command: PostJournalEntryCommand): Promise<Result<JournalEntry>>;
}
```

Reglas:

- Si `idempotencyKey` ya existe, devolver el asiento previo sin duplicar.
- Si el período no existe, devolver `PERIOD_NOT_FOUND` o `VALIDATION_FAILED` con detalle.
- Si el período está `CERRADO`, devolver `PERIOD_CLOSED`.
- Si el asiento está desbalanceado, devolver `ENTRY_UNBALANCED`.
- Si todo es válido, guardar y devolver asiento `CONFIRMADO`.

## 8. Tests requeridos

- Postea un asiento balanceado en período abierto.
- Rechaza asiento desbalanceado con `ENTRY_UNBALANCED`.
- Rechaza posteo en período cerrado con `PERIOD_CLOSED`.
- Reintento con misma `idempotencyKey` devuelve el asiento previo y no duplica.
- Rechaza período inexistente.

## 9. Criterios de aceptación

- `npm run test` pasa.
- `npm run typecheck` pasa.
- `npm run lint` pasa.
- `JournalService` no importa React, Astro, Supabase ni navegador.
- La idempotencia está testeada con repositorio in-memory.
- No se toca UI, rutas públicas, `/prode`, Supabase ni deploy.

## 10. Riesgos y pendientes

- La idempotencia real todavía dependerá de constraints de DB en un sprint posterior.
- La numeración definitiva de asientos queda pendiente.
- Auditoría persistente queda fuera de alcance.
- Reversión por asiento inverso queda para el siguiente incremento de libro.

## 11. Rollback

Eliminar los archivos nuevos de `src/finanzas/application/`, `src/finanzas/domain/periods.ts` y revertir las exportaciones/tipos agregados.
