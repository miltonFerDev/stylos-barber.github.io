import { domainError } from './errors';
import type { Money, Result } from './types';

const MONEY_AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function isValidMoneyAmount(amount: string): boolean {
  return MONEY_AMOUNT_PATTERN.test(amount);
}

export function moneyToMinorUnits(money: Money): Result<bigint> {
  if (!isValidMoneyAmount(money.amount)) {
    return {
      ok: false,
      error: domainError('VALIDATION_FAILED', 'El importe debe ser un decimal positivo con hasta 2 decimales.', true, {
        amount: money.amount,
      }),
    };
  }

  const [units, decimals = ''] = money.amount.split('.');
  const cents = decimals.padEnd(2, '0');

  return { ok: true, value: BigInt(`${units}${cents}`) };
}

export function toMinor(money: Money): bigint {
  const result = moneyToMinorUnits(money);
  return result.ok ? result.value : 0n;
}
