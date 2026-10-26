# Spec — Sistema financiero sprint 31: reversión de pagos desde UI

> Épica **E4 Tesorería** (E4-03 pagos). Continúa el sprint 30 (dominio/servicio/test de `reversePayment` ya implementado).
> Este sprint expone la reversión: endpoint HTTP + listado de pagos + acción en UI.
> Fuente de verdad de dominio: `docs/diseno-financiero/contratos-dominio.md` §4.7, `seguridad.md` (RBAC), `sistema-financiero-sprint-30-reversion-pagos.md` §4.

## 1. Problema

`PaymentsService.reversePayment` ya existe (sprint 30), pero no se puede invocar desde la web: no hay endpoint ni UI que liste pagos `CONFIRMADO` para revertirlos. Un pago mal aplicado queda irreversible para el dueño.

## 2. Objetivo

Permitir revertir un pago `CONFIRMADO` desde la UI: listar pagos reversibles y disparar la reversión capturando motivo, período abierto y fecha de reversión.

## 3. Alcance incluido

- `PaymentRepository.findAll()` (listado de pagos) + impl Supabase ordenada por `created_at` desc.
- `GET /api/finanzas/pagos/historial` → `{ payments, periods }` (solo `CONFIRMADO` + períodos abiertos).
- `POST /api/finanzas/pagos/[id]/revertir` → `{ payment }`.
- UI: sección "Pagos recientes" en el tab **Pagar** con acción "Revertir" y form inline (motivo, período, fecha).
- Tests de los handlers nuevos.

## 4. Alcance excluido

- Revertir `CONCILIADO` (ya excluido en sprint 30 §4; requiere reabrir conciliación).
- Reversión de transferencias/ingresos/ajustes (`ReversalService` genérico, CU-021 completo): fuera de alcance.
- Filtros/paginación del listado (MVP: todos los `CONFIRMADO`, orden desc).
- `REVERSAL_LIMIT_EXCEEDED` (P12 cerrada: sin límite monetario).

## 5. Decisiones

| # | Decisión | Resolución |
|---|---|---|
| 1 | Dónde vive la UI | Tab **Pagar** (`RegistrarPago.tsx`), sección "Pagos recientes" bajo el formulario. **Nota**: el checkpoint decía "botón en Agenda", pero Agenda lista obligaciones (vencidas/próximas), no pagos. Los pagos se registran y viven en "Pagar". |
| 2 | Listado | Nuevo `GET /api/finanzas/pagos/historial`. No se sobrecarga el `GET /api/finanzas/pagos` existente (ese arma el form de pago). |
| 3 | Permiso del listado | `REVERSE_PAYMENT` (DIRECCION + TESORERIA). Quien no puede revertir no ve el listado. |
| 4 | Pagos listados | Solo `status = 'CONFIRMADO'` (reversibles). Se filtra en el handler tras `findAll()`. |
| 5 | Id del pago | Viene del path (`params.id`), no del body. |
| 6 | Período/fecha | `periodId` y `reversalDate` los elige el usuario en el form (períodos abiertos, default el primero; fecha default hoy). El servicio ya valida período abierto (`PERIOD_CLOSED`). |
| 7 | Motivo | `reason` obligatorio no vacío (servicio ya devuelve `MISSING_REASON`). |
| 8 | Nombre de cuenta en listado | Se resuelve join con `masters.findAll('ACCOUNT')` en el handler (no expone datos privados; solo id/nombre de cuenta). |

## 6. Contratos

```ts
// PaymentRepository crece
findAll(): Promise<Payment[]>;

// GET /api/finanzas/pagos/historial -> 200
type HistorialPayload = {
  payments: Array<{
    id: string;
    effectiveDate: string;
    amount: Money;
    status: PaymentStatus;
    accountName: string;
  }>;
  periods: Array<{ id: string; code: string }>; // solo abiertos
};

// POST /api/finanzas/pagos/:id/revertir
// body: { reason: string; periodId: string; reversalDate: string }
// 200 { payment } | 400 { error, message } | 401 | 403
```

Errores reutilizados del sprint 30: `PAYMENT_NOT_FOUND`, `INVALID_PAYMENT_STATE`, `REVERSAL_ALREADY_EXISTS`, `MISSING_REASON`, `ENTRY_NOT_FOUND`, `PERIOD_CLOSED`, `PERIOD_NOT_FOUND`, `PERMISSION_DENIED`.

## 7. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/application/payments-service.ts` | `findAll()` en la interfaz `PaymentRepository` (sin lógica de servicio). |
| `src/finanzas/repositories/supabase-repositories.ts` | `SupabasePaymentRepository.findAll()` (`.order('created_at', { ascending: false })` + `mapPayment`). |
| `src/finanzas/presentation/pagos.ts` | `handleHistorialPagos` + `handleReversarPago`. |
| `src/finanzas/presentation/container.ts` | Hoist `paymentsRepo` (instancia compartida) y exponerla en el contenedor. |
| `src/pages/api/finanzas/pagos/historial.ts` | `GET` → `handleHistorialPagos`. |
| `src/pages/api/finanzas/pagos/[id]/revertir.ts` | `POST` → `handleReversarPago` (usa `params.id`). |
| `src/finanzas/ui/RegistrarPago.tsx` | Sección "Pagos recientes" + form de reversión inline. |
| `src/finanzas/presentation/__tests__/pagos.test.ts` | Tests de `handleReversarPago` y `handleHistorialPagos`. |

## 8. Criterios de aceptación

- `npm run test` / `typecheck` / `build` pasan.
- `GET .../pagos/historial` con rol sin `REVERSE_PAYMENT` → `403`.
- `GET .../pagos/historial` devuelve solo pagos `CONFIRMADO` + períodos abiertos.
- `POST .../pagos/:id/revertir` con body válido → `200 { payment }` con `status = 'REVERTIDO'`.
- `POST .../pagos/:id/revertir` sin motivo → `400 MISSING_REASON`; id inexistente → `400 PAYMENT_NOT_FOUND`; ya revertido → `400 REVERSAL_ALREADY_EXISTS`.
- La UI muestra la lista, permite revertir y refresca la lista tras revertir.

## 9. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| Migración `022` sin aplicar en Supabase | Bloquea la reversión en producción hasta `supabase db push` (ya marcado en `docs/CHECKPOINT.md`). |
| Listado sin paginación | MVP aceptado; si crece el volumen se pagina (`LIMIT`/cursor). |
| `findAll()` carga todos los pagos | Aceptado por volumen bajo; el filtro `CONFIRMADO` se hace en handler (no en SQL) por simplicidad. |

## 10. Rollback

Revertir los handlers/rutas nuevos, la sección UI, el método `findAll()` del repositorio y exponer `paymentsRepo` en el contenedor. Sin migraciones nuevas (usa la `022` ya existente).
