import type { AccountMovement } from '../domain/account-movements';
import type { Account } from '../domain/accounts';
import type { AuditEvent } from '../domain/audit';
import type { Category, ResultLine, Subcategory } from '../domain/categories';
import type { DailyClosing, Reconciliation } from '../domain/closings';
import type { ExternalSettlement } from '../domain/external-settlements';
import type { IncomeForecast } from '../domain/forecast';
import type { IncomeDistribution, IncomeRecord } from '../domain/incomes';
import type { Investment, InvestmentEvaluation } from '../domain/investments';
import type { JournalEntry, JournalLineDraft } from '../domain/journal';
import type { LedgerAccount } from '../domain/ledger-accounts';
import type { Obligation } from '../domain/obligations';
import type { Payment, PaymentApplication } from '../domain/payments';
import type { Person } from '../domain/persons';
import type { AccountingPeriod } from '../domain/periods';
import type { Transfer } from '../domain/transfers';
import type { Currency, Money, UserId } from '../domain/types';

export type DbRow = Record<string, unknown>;

function asUserId(value: unknown): UserId {
  return value as UserId;
}

function nullOrString(value: unknown): string | null {
  return value == null ? null : String(value);
}

// =====================================================
// Money: numeric(18,2) <-> Money
// =====================================================
export function moneyToDb(money: Money): number {
  return Number(money.amount);
}

export function dbToMoney(value: unknown, currency: Currency): Money {
  const n = value == null ? 0 : Number(value);
  return { amount: n.toFixed(2), currency };
}

// =====================================================
// Maestros
// =====================================================
export function mapPerson(row: DbRow): Person {
  return {
    id: String(row.id),
    entityType: 'PERSON',
    displayName: String(row.display_name),
    kind: row.kind as Person['kind'],
    taxId: nullOrString(row.tax_id),
    validFrom: String(row.valid_from),
    validTo: nullOrString(row.valid_to),
    createdAt: String(row.created_at),
    createdBy: asUserId(row.created_by),
  };
}

export function mapCategory(row: DbRow): Category {
  return {
    id: String(row.id),
    entityType: 'CATEGORY',
    code: String(row.code),
    name: String(row.name),
    nature: row.nature as Category['nature'],
    validFrom: String(row.valid_from),
    validTo: nullOrString(row.valid_to),
    createdAt: String(row.created_at),
    createdBy: asUserId(row.created_by),
  };
}

export function mapSubcategory(row: DbRow): Subcategory {
  return {
    id: String(row.id),
    entityType: 'SUBCATEGORY',
    code: String(row.code),
    name: String(row.name),
    categoryId: String(row.category_id),
    validFrom: String(row.valid_from),
    validTo: nullOrString(row.valid_to),
    createdAt: String(row.created_at),
    createdBy: asUserId(row.created_by),
  };
}

export function mapResultLine(row: DbRow): ResultLine {
  return {
    id: String(row.id),
    entityType: 'RESULT_LINE',
    code: String(row.code),
    name: String(row.name),
    nature: row.nature as ResultLine['nature'],
    order: Number(row.order),
    ledgerAccountId: String(row.ledger_account_id),
    validFrom: String(row.valid_from),
    validTo: nullOrString(row.valid_to),
    createdAt: String(row.created_at),
    createdBy: asUserId(row.created_by),
  };
}

export function mapLedgerAccount(row: DbRow): LedgerAccount {
  return {
    id: String(row.id),
    entityType: 'LEDGER_ACCOUNT',
    code: String(row.code),
    name: String(row.name),
    nature: row.nature as LedgerAccount['nature'],
    parentId: nullOrString(row.parent_id),
    isPostable: Boolean(row.is_postable),
    validFrom: String(row.valid_from),
    validTo: nullOrString(row.valid_to),
    createdAt: String(row.created_at),
    createdBy: asUserId(row.created_by),
  };
}

export function mapAccount(row: DbRow): Account {
  return {
    id: String(row.id),
    entityType: 'ACCOUNT',
    name: String(row.name),
    kind: row.kind as Account['kind'],
    ownership: row.ownership as Account['ownership'],
    financialInstitution: nullOrString(row.financial_institution),
    currency: row.currency as Currency,
    ledgerAccountId: String(row.ledger_account_id),
    isAvailable: Boolean(row.is_available),
    isReconcilable: Boolean(row.is_reconcilable),
    validFrom: String(row.valid_from),
    validTo: nullOrString(row.valid_to),
    createdAt: String(row.created_at),
    createdBy: asUserId(row.created_by),
  };
}

// =====================================================
// Períodos y asientos
// =====================================================
export function mapAccountingPeriod(row: DbRow): AccountingPeriod {
  return {
    id: String(row.id),
    code: String(row.code),
    startsOn: String(row.starts_on),
    endsOn: String(row.ends_on),
    status: row.status as AccountingPeriod['status'],
  };
}

export function mapJournalLine(row: DbRow): JournalLineDraft {
  const currency = row.currency as Currency;
  return {
    ledgerAccountId: String(row.ledger_account_id),
    debit: dbToMoney(row.debit, currency),
    credit: dbToMoney(row.credit, currency),
  };
}

export function mapJournalEntry(row: DbRow, lines: JournalLineDraft[]): JournalEntry {
  return {
    id: String(row.id),
    periodId: String(row.period_id),
    entryDate: String(row.entry_date),
    postingDate: String(row.posting_date),
    status: row.status as JournalEntry['status'],
    sourceDocumentType: String(row.source_document_type),
    sourceDocumentId: String(row.source_document_id),
    idempotencyKey: String(row.idempotency_key),
    createdBy: asUserId(row.created_by),
    createdAt: String(row.created_at),
    description: String(row.description),
    lines,
    ...(row.reverses_entry_id != null ? { reversesEntryId: String(row.reverses_entry_id) } : {}),
    ...(row.reversed_at != null ? { reversedAt: String(row.reversed_at) } : {}),
  };
}

// =====================================================
// Tesorería
// =====================================================
export function mapAccountMovement(row: DbRow): AccountMovement {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    effectiveDate: String(row.effective_date),
    amount: dbToMoney(row.amount, row.currency as Currency),
    direction: row.direction as AccountMovement['direction'],
    sourceDocumentType: String(row.source_document_type),
    sourceDocumentId: String(row.source_document_id),
    journalEntryId: String(row.journal_entry_id),
    idempotencyKey: String(row.idempotency_key),
    createdAt: String(row.created_at),
  };
}

export function mapDailyClosing(row: DbRow): DailyClosing {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    closingDate: String(row.closing_date),
    realBalance: dbToMoney(row.real_balance, row.currency as Currency),
    status: row.status as DailyClosing['status'],
    createdBy: asUserId(row.created_by),
    createdAt: String(row.created_at),
  };
}

export function mapReconciliation(row: DbRow): Reconciliation {
  const currency = row.currency as Currency;
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    periodId: String(row.period_id),
    asOf: String(row.as_of),
    theoreticalBalance: dbToMoney(row.theoretical_balance, currency),
    realBalance: dbToMoney(row.real_balance, currency),
    difference: dbToMoney(row.difference, currency),
    isShortfall: Boolean(row.is_shortfall),
    status: row.status as Reconciliation['status'],
    resolutionNote: nullOrString(row.resolution_note),
    resolvedBy: row.resolved_by == null ? null : asUserId(row.resolved_by),
  };
}

// =====================================================
// Operación (documentos)
// =====================================================
export function mapObligation(row: DbRow): Obligation {
  const currency = row.currency as Currency;
  return {
    id: String(row.id),
    concept: String(row.concept),
    personId: String(row.person_id),
    categoryId: String(row.category_id),
    resultLineId: String(row.result_line_id),
    plannedAccountId: String(row.planned_account_id),
    estimatedAmount: dbToMoney(row.estimated_amount, currency),
    estimatedAmountVersion: Number(row.estimated_amount_version),
    finalAmount: row.final_amount == null ? null : dbToMoney(row.final_amount, currency),
    isEstimated: Boolean(row.is_estimated),
    dueDate: String(row.due_date),
    expectedPaymentDate: nullOrString(row.expected_payment_date),
    priority: row.priority as Obligation['priority'],
    status: row.status as Obligation['status'],
    periodId: String(row.period_id),
    recurrenceRuleId: nullOrString(row.recurrence_rule_id),
    source: 'REAL',
    createdBy: asUserId(row.created_by),
    createdAt: String(row.created_at),
    idempotencyKey: String(row.idempotency_key),
  };
}

export function mapPayment(row: DbRow): Payment {
  return {
    id: String(row.id),
    effectiveDate: String(row.effective_date),
    accountId: String(row.account_id),
    amount: dbToMoney(row.amount, row.currency as Currency),
    status: row.status as Payment['status'],
    attachmentRequired: Boolean(row.attachment_required),
    idempotencyKey: String(row.idempotency_key),
    source: 'REAL',
    createdBy: asUserId(row.created_by),
    createdAt: String(row.created_at),
  };
}

export function mapPaymentApplication(row: DbRow): PaymentApplication {
  return {
    id: String(row.id),
    paymentId: String(row.payment_id),
    obligationId: String(row.obligation_id),
    appliedAmount: dbToMoney(row.applied_amount, row.currency as Currency),
  };
}

export function mapTransfer(row: DbRow): Transfer {
  return {
    id: String(row.id),
    effectiveDate: String(row.effective_date),
    fromAccountId: String(row.from_account_id),
    toAccountId: String(row.to_account_id),
    amount: dbToMoney(row.amount, row.currency as Currency),
    status: row.status as Transfer['status'],
    idempotencyKey: String(row.idempotency_key),
    source: 'REAL',
    createdBy: asUserId(row.created_by),
    createdAt: String(row.created_at),
  };
}

export function mapIncomeRecord(row: DbRow): IncomeRecord {
  const currency = row.currency as Currency;
  return {
    id: String(row.id),
    effectiveDate: String(row.effective_date),
    serviceAmount: dbToMoney(row.service_amount, currency),
    productAmount: dbToMoney(row.product_amount, currency),
    status: row.status as IncomeRecord['status'],
    periodId: String(row.period_id),
    adjustmentNote: nullOrString(row.adjustment_note),
    idempotencyKey: String(row.idempotency_key),
    source: 'REAL',
    createdBy: asUserId(row.created_by),
    createdAt: String(row.created_at),
  };
}

export function mapIncomeDistribution(row: DbRow): IncomeDistribution {
  return {
    id: String(row.id),
    incomeRecordId: String(row.income_record_id),
    accountId: String(row.account_id),
    amount: dbToMoney(row.amount, row.currency as Currency),
  };
}

export function mapExternalSettlement(row: DbRow): ExternalSettlement {
  return {
    id: String(row.id),
    sourcePersonId: String(row.source_person_id),
    externalAccountId: nullOrString(row.external_account_id),
    resultLineId: String(row.result_line_id),
    concept: String(row.concept),
    amount: dbToMoney(row.amount, row.currency as Currency),
    nature: row.nature as ExternalSettlement['nature'],
    effectiveDate: String(row.effective_date),
    status: row.status as ExternalSettlement['status'],
    note: nullOrString(row.note),
    idempotencyKey: String(row.idempotency_key),
    source: 'REAL',
    createdBy: asUserId(row.created_by),
    createdAt: String(row.created_at),
  };
}

// =====================================================
// Planificación / proyección
// =====================================================
export function mapIncomeForecast(row: DbRow): IncomeForecast {
  return {
    id: String(row.id),
    scenario: row.scenario as IncomeForecast['scenario'],
    forecastDate: String(row.forecast_date),
    amount: dbToMoney(row.amount, row.currency as Currency),
    source: row.source as IncomeForecast['source'],
    confidence: row.confidence as IncomeForecast['confidence'],
    accountId: nullOrString(row.account_id),
  };
}

export function mapInvestment(row: DbRow): Investment {
  return {
    id: String(row.id),
    concept: String(row.concept),
    amount: dbToMoney(row.amount, row.currency as Currency),
    tentativeDate: String(row.tentative_date),
    status: row.status as Investment['status'],
    decisionNote: nullOrString(row.decision_note),
    createdBy: asUserId(row.created_by),
    createdAt: String(row.created_at),
  };
}

export function mapInvestmentEvaluation(row: DbRow): InvestmentEvaluation {
  const currency = row.currency as Currency;
  return {
    id: String(row.id),
    investmentId: String(row.investment_id),
    scenario: row.scenario as InvestmentEvaluation['scenario'],
    minProjectedBalance: dbToMoney(row.min_projected_balance, currency),
    capacityAmount: dbToMoney(row.capacity_amount, currency),
    confidence: row.confidence as InvestmentEvaluation['confidence'],
    evaluatedAt: String(row.evaluated_at),
  };
}

// =====================================================
// Soporte
// =====================================================
export function mapAuditEvent(row: DbRow): AuditEvent {
  return {
    id: String(row.id),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    action: row.action as AuditEvent['action'],
    actorUserId: asUserId(row.actor_user_id),
    occurredAt: String(row.occurred_at),
    reason: nullOrString(row.reason),
  };
}
