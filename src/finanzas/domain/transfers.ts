import type { Money, UserId } from './types';

export type TransferStatus = 'BORRADOR' | 'CONFIRMADO' | 'ANULADO' | 'REVERTIDO';

export type Transfer = {
  id: string;
  effectiveDate: string;
  fromAccountId: string;
  toAccountId: string;
  amount: Money;
  status: TransferStatus;
  idempotencyKey: string;
  source: 'REAL';
  createdBy: UserId;
  createdAt: string;
};
