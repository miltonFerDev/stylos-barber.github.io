import type { AccountMovement } from './account-movements';
import { toMinor } from './money';
import type { Currency, Money, UserId } from './types';

export type DailyClosingStatus = 'BORRADOR' | 'CONFIRMADO';
export type ReconciliationStatus = 'PENDIENTE' | 'RESUELTA';
export type ReconciliationResolution = 'AJUSTE' | 'EXPLICADA';

export type DailyClosing = {
  id: string;
  accountId: string;
  closingDate: string;
  realBalance: Money;
  status: DailyClosingStatus;
  createdBy: UserId;
  createdAt: string;
};

export type Reconciliation = {
  id: string;
  accountId: string;
  periodId: string;
  asOf: string;
  theoreticalBalance: Money;
  realBalance: Money;
  difference: Money;
  isShortfall: boolean;
  status: ReconciliationStatus;
  resolutionNote: string | null;
  resolvedBy: UserId | null;
};

export function minorToMoney(minor: bigint, currency: Currency): Money {
  const sign = minor < 0n ? '-' : '';
  const abs = minor < 0n ? -minor : minor;
  const units = abs / 100n;
  const cents = abs % 100n;
  return { amount: `${sign}${units}.${cents.toString().padStart(2, '0')}`, currency };
}

export function movementNet(movements: AccountMovement[]): bigint {
  return movements.reduce((net, movement) => {
    const value = toMinor(movement.amount);
    return movement.direction === 'IN' ? net + value : net - value;
  }, 0n);
}

export function computeDifference(
  theoretical: Money,
  real: Money
): { difference: Money; isShortfall: boolean } {
  const theoreticalMinor = toMinor(theoretical);
  const realMinor = toMinor(real);
  const isShortfall = theoreticalMinor > realMinor;
  const differenceMinor = isShortfall ? theoreticalMinor - realMinor : realMinor - theoreticalMinor;

  return { difference: minorToMoney(differenceMinor, theoretical.currency), isShortfall };
}
