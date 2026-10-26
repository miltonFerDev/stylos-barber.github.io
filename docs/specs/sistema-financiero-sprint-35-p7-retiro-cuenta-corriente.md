# Spec — Sistema financiero sprint 35: P7 retiro contra cuenta corriente

> Decisión P7 (cerrada 2026-10-20, confirmada con el dueño): el flujo del dueño es una **cuenta corriente** (`nature = CUENTA_CORRIENTE`). La inyección suma y el retiro resta, se neta solo.
> Inyección = gasto pagado por cuentas del dueño (ya existe: `registerExternalPayment`). Este sprint agrega el **retiro** (el complemento).

## 1. Problema

Solo existe la "entrada" (inyección). Falta el "retiro": cuando el dueño separa efectivo excedente de la caja diaria y se lo lleva, eso baja la cuenta corriente. Hoy no hay forma de registrarlo.

## 2. Objetivo

Agregar `ExternalSettlementsService.registerCurrentAccountWithdrawal`: saca efectivo de una cuenta PROPIA, debita la cuenta corriente (`2.3`) y registra el flujo como un `external_settlements` de `CUENTA_CORRIENTE` (sin línea de resultado, porque no es un gasto).

## 3. Alcance incluido

- `RegisterCurrentAccountWithdrawalCommand` + método `registerCurrentAccountWithdrawal`.
- `ExternalSettlement.resultLineId` nullable (un retiro no tiene gasto).
- Migración `024`: `external_settlements.result_line_id DROP NOT NULL`.
- Acción de auditoría `EXTERNAL_SETTLEMENT_WITHDRAWN`.
- Tests.

## 4. Alcance excluido

- Límite de saldo: **no hay** — "se neta solo" (la cuenta corriente puede quedar a favor del dueño).
- Cableado al contenedor / endpoints / UI (siguen siendo slices futuros; igual que E4-09 no está expuesto aún).
- Reversión del retiro.

## 5. Decisiones

| # | Decisión | Resolución |
|---|---|---|
| 1 | Contrapartida | `settlementLedgerAccounts['CUENTA_CORRIENTE']` (`2.3`), igual que la inyección. |
| 2 | Asiento | `Db 2.3 / Hr account.ledgerAccountId (1.1.x)` + movimiento `OUT` de la cuenta propia. |
| 3 | Registro | Un `external_settlements` con `nature=CUENTA_CORRIENTE`, `status=CONFIRMADO`, `resultLineId=null`. |
| 4 | Dirección | No se guarda campo `direction`; el sentido sale del asiento (débito 2.3 = retiro). |
| 5 | Permiso | `REGISTER_EXTERNAL_SETTLEMENT` (DIRECCION + TESORERIA), igual que la inyección. |
| 6 | `sourcePersonId` | El dueño (persona que se lleva el efectivo). |

## 6. Contratos

```ts
export type RegisterCurrentAccountWithdrawalCommand = {
  sourcePersonId: string;   // el dueño
  accountId: string;        // cuenta PROPIA desde la que sale el efectivo
  amount: Money;
  effectiveDate: string;
  periodId: string;
  concept: string;
  note?: string;
};

registerCurrentAccountWithdrawal(ctx, command): Promise<Result<ExternalSettlement>>;
```

Errores reutilizados: `MISSING_REQUIRED_FIELD`, `ACCOUNT_NOT_AVAILABLE`, `MASTER_NOT_FOUND`, `PERIOD_NOT_FOUND`, `PERIOD_CLOSED`, `PERMISSION_DENIED` (y `VALIDATION_FAILED`/`INVALID_AMOUNT` vía `validatePositiveAmount`).

## 7. Archivos

| Archivo | Cambio |
|---|---|
| `src/finanzas/domain/external-settlements.ts` | `resultLineId: string \| null`. |
| `src/finanzas/repositories/mapping.ts` | `mapExternalSettlement` usa `nullOrString` para `result_line_id`. |
| `src/finanzas/domain/audit.ts` | `EXTERNAL_SETTLEMENT_WITHDRAWN`. |
| `src/finanzas/application/external-settlements-service.ts` | comando + método. |
| `supabase/migrations/024_external_settlements_result_line_nullable.sql` | `ALTER COLUMN result_line_id DROP NOT NULL`. |
| `src/finanzas/application/__tests__/external-settlements-service.test.ts` | Tests del retiro. |

## 8. Criterios de aceptación

- `npm run test` / `typecheck` / `lint` / `build` pasan.
- Retiro → asiento `Db 2.3 / Hr 1.1.1` + movimiento `OUT` + settlement `CUENTA_CORRIENTE` con `resultLineId=null`.
- Inyección (`registerExternalPayment`) sigue sin movimiento propio (no regresiona).
- `result_line_id` acepta `NULL` en la tabla (verificable tras `db push`).

## 9. Riesgos / pendientes

| Riesgo | Tratamiento |
|---|---|
| Retiro sin límite de saldo | Aceptado por P7 ("se neta solo"). La cuenta corriente puede quedar a favor del dueño. |
| `result_line_id` nullable amplía el contrato | Solo la usan los retiros; el resto sigue exigiendo línea de resultado. |
| Sin cableado a contenedor/UI | Igual que el resto de E4-09: dominio listo, exposición en slice futuro. |

## 10. Rollback

`git revert` de los cambios de dominio/repo/audit + `ALTER TABLE external_settlements ALTER COLUMN result_line_id SET NOT NULL` (tras borrar retiros con `NULL`).
