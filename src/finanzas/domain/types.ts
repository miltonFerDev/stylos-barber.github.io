export type Currency = 'ARS' | 'USD';

export type Money = {
  amount: string;
  currency: Currency;
};

export type Timestamp = string;
export type UserId = string & { readonly __brand: 'UserId' };

export type RoleCode = 'DIRECCION' | 'TESORERIA' | 'CONTADOR' | 'ADMIN_TECNICO' | 'DEV';

export type CommandContext = {
  actorUserId: UserId;
  idempotencyKey: string;
  now: Timestamp;
};

export type DomainErrorCode =
  | 'VALIDATION_FAILED'
  | 'MISSING_REQUIRED_FIELD'
  | 'ENTRY_UNBALANCED'
  | 'CURRENCY_MISMATCH'
  | 'PERMISSION_DENIED'
  | 'DUPLICATE_IDEMPOTENCY'
  | 'CONCURRENCY_CONFLICT'
  | 'PERIOD_CLOSED'
  | 'PERIOD_NOT_FOUND'
  | 'PERIOD_ALREADY_EXISTS'
  | 'INVALID_STATE'
  | 'ENTRY_NOT_FOUND'
  | 'REVERSAL_ALREADY_EXISTS'
  | 'MISSING_REASON'
  | 'MASTER_NOT_CURRENT'
  | 'POSSIBLE_DUPLICATE_MASTER'
  | 'MASTER_CODE_EXISTS'
  | 'MASTER_NOT_FOUND'
  | 'ENTRY_IMMUTABLE'
  | 'MISSING_DUE_DATE'
  | 'POSSIBLE_DUPLICATE_OBLIGATION'
  | 'OBLIGATION_NOT_FOUND'
  | 'INVALID_OBLIGATION_STATE'
  | 'PAYMENT_NOT_FOUND'
  | 'INVALID_PAYMENT_STATE'
  | 'DUPLICATE_IDEMPOTENCY'
  | 'PAYMENT_EXCEEDS_PENDIENTE'
  | 'ACCOUNT_NOT_AVAILABLE'
  | 'PAYMENT_APPLICATION_MISMATCH'
  | 'TRANSFER_SAME_ACCOUNT'
  | 'INCOME_DISTRIBUTION_MISMATCH'
  | 'DUPLICATE_CLOSING'
  | 'ACCOUNT_NOT_RECONCILABLE'
  | 'RECONCILIATION_NOT_FOUND'
  | 'RECONCILIATION_ALREADY_RESOLVED'
  | 'EXTERNAL_NATURE_UNDEFINED'
  | 'UNSUPPORTED_MIME'
  | 'ATTACHMENT_TOO_LARGE'
  | 'SETTLEMENT_NOT_FOUND'
  | 'SETTLEMENT_ALREADY_REINTEGRADO'
  | 'STALE_RECONCILIATION'
  | 'RESERVE_UNDEFINED'
  | 'FORECAST_SCENARIO_INVALID'
  | 'INCOME_SOURCE_MISSING'
  | 'INVESTMENT_NOT_FOUND'
  | 'INVALID_INVESTMENT_STATE'
  | 'INVESTMENT_EXCEEDS_CAPACITY';

export type DomainError = {
  code: DomainErrorCode;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
};

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: DomainError };
