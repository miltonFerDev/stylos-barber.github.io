import type { Money } from './types';

export type MovementDirection = 'IN' | 'OUT';

export type AccountMovement = {
  id: string;
  accountId: string;
  effectiveDate: string;
  amount: Money;
  direction: MovementDirection;
  sourceDocumentType: string;
  sourceDocumentId: string;
  journalEntryId: string;
  idempotencyKey: string;
  createdAt: string;
};

export type AccountMovementRepository = {
  findByAccount(accountId: string): Promise<AccountMovement[]>;
  findByAccountIds(accountIds: string[]): Promise<AccountMovement[]>;
  findBySourceDocument(sourceDocumentType: string, sourceDocumentId: string): Promise<AccountMovement[]>;
  save(movement: AccountMovement): Promise<AccountMovement>;
};
