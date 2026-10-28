import type { UserId } from './types';

export type AuditAction =
  | 'JOURNAL_ENTRY_POSTED'
  | 'JOURNAL_ENTRY_REVERSED'
  | 'MASTER_CREATED'
  | 'OBLIGATION_CREATED'
  | 'OBLIGATION_CONFIRMED'
  | 'OBLIGATION_ANNULLED'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_REVERSED'
  | 'TRANSFER_CREATED'
  | 'INCOME_CREATED'
  | 'CLOSING_CREATED'
  | 'RECONCILIATION_RESOLVED'
  | 'EXTERNAL_SETTLEMENT_CREATED'
  | 'EXTERNAL_SETTLEMENT_REIMBURSED'
  | 'EXTERNAL_SETTLEMENT_WITHDRAWN'
  | 'ATTACHMENT_LINKED'
  | 'INVESTMENT_CANDIDATE_CREATED'
  | 'INVESTMENT_DECIDED'
  | 'INVESTMENT_PAID'
  | 'DEPRECIATION_POSTED'
  | 'COMMISSION_ACCRUED'
  | 'COMMISSION_PAID';

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
