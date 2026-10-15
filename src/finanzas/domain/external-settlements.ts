import type { Money, UserId } from './types';

export type ExternalSettlementNature = 'PRESTAMO' | 'APORTE' | 'CUENTA_CORRIENTE';
export type ExternalSettlementStatus = 'CONFIRMADO' | 'REINTEGRADO';

export type ExternalSettlement = {
  id: string;
  sourcePersonId: string;
  externalAccountId: string | null;
  resultLineId: string;
  concept: string;
  amount: Money;
  nature: ExternalSettlementNature;
  effectiveDate: string;
  status: ExternalSettlementStatus;
  note: string | null;
  idempotencyKey: string;
  source: 'REAL';
  createdBy: UserId;
  createdAt: string;
};

export const EXTERNAL_SETTLEMENT_NATURES: readonly ExternalSettlementNature[] = [
  'PRESTAMO',
  'APORTE',
  'CUENTA_CORRIENTE',
];

export function isExternalSettlementNature(value: string): value is ExternalSettlementNature {
  return EXTERNAL_SETTLEMENT_NATURES.includes(value as ExternalSettlementNature);
}
