import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountMovementRepository } from '../domain/account-movements';
import type { AuditEventInput, AuditRecorder } from '../domain/audit';
import type { Reconciliation } from '../domain/closings';
import type { CommissionPayment, CommissionPaymentDistribution, CommissionRecord } from '../domain/commissions';
import type { ExternalSettlement } from '../domain/external-settlements';
import type { IncomeForecast } from '../domain/forecast';
import type { Investment, InvestmentEvaluation } from '../domain/investments';
import type { JournalEntry, JournalLineDraft } from '../domain/journal';
import type { Obligation } from '../domain/obligations';
import type { Payment, PaymentApplication } from '../domain/payments';
import type { Transfer } from '../domain/transfers';
import type { RoleCode, UserId } from '../domain/types';
import type { MasterRepository } from '../application/master-data-service';
import type { AccountingPeriodRepository, JournalEntryRepository } from '../application/journal-service';
import type { ObligationRepository } from '../application/obligations-service';
import type { IncomeRecordRepository, IncomeDistributionRepository } from '../application/incomes-service';
import type { DailyClosingRepository, ReconciliationRepository } from '../application/closings-service';
import type { PaymentRepository, PaymentApplicationRepository } from '../application/payments-service';
import type { TransferRepository } from '../application/transfers-service';
import type { ExternalSettlementRepository } from '../application/external-settlements-service';
import type { CommissionRepository } from '../application/commissions-service';
import type { InvestmentRepository, InvestmentEvaluationRepository } from '../application/investments-service';
import type { RoleRepository } from '../application/permission-service';
import type { PeriodRepository } from '../application/periods-service';
import type {
  ForecastAccountRepository,
  ForecastIncomeRepository,
  ForecastObligationRepository,
  ForecastReconciliationRepository,
  ForecastSettingsRepository,
} from '../application/forecast-service';
import type { AuditQueryRepository, JournalEntryQueryRepository } from '../application/reports-service';
import type { AttachmentRepository } from '../application/attachments-service';
import {
  mapAccount,
  mapAccountMovement,
  mapAccountingPeriod,
  mapAuditEvent,
  mapCategory,
  mapCommissionPayment,
  mapCommissionRecord,
  mapDailyClosing,
  mapExternalSettlement,
  mapIncomeDistribution,
  mapIncomeForecast,
  mapIncomeRecord,
  mapInvestment,
  mapJournalEntry,
  mapJournalLine,
  mapLedgerAccount,
  mapObligation,
  mapPayment,
  mapPaymentApplication,
  mapPerson,
  mapReconciliation,
  mapResultLine,
  mapSubcategory,
  mapTransfer,
  moneyToDb,
  type DbRow,
} from './mapping';
import type { Attachment } from '../domain/attachments';
import type { AccountingPeriod } from '../domain/periods';
import type { Currency, Money } from '../domain/types';

const MASTER_TABLES = {
  PERSON: 'persons',
  CATEGORY: 'categories',
  SUBCATEGORY: 'subcategories',
  RESULT_LINE: 'result_lines',
  LEDGER_ACCOUNT: 'ledger_accounts',
  ACCOUNT: 'accounts',
} as const;

function mapMasterRow(table: string, row: DbRow) {
  switch (table) {
    case 'persons': return mapPerson(row);
    case 'categories': return mapCategory(row);
    case 'subcategories': return mapSubcategory(row);
    case 'result_lines': return mapResultLine(row);
    case 'ledger_accounts': return mapLedgerAccount(row);
    case 'accounts': return mapAccount(row);
    default: throw new Error(`Master table desconocida: ${table}`);
  }
}

function masterToRow(master: NonNullable<ReturnType<typeof mapMasterRow>>): { table: string; row: DbRow } {
  switch (master.entityType) {
    case 'PERSON':
      return { table: 'persons', row: { id: master.id, display_name: master.displayName, kind: master.kind, tax_id: master.taxId, valid_from: master.validFrom, valid_to: master.validTo, created_by: master.createdBy } };
    case 'CATEGORY':
      return { table: 'categories', row: { id: master.id, code: master.code, name: master.name, nature: master.nature, valid_from: master.validFrom, valid_to: master.validTo, created_by: master.createdBy } };
    case 'SUBCATEGORY':
      return { table: 'subcategories', row: { id: master.id, category_id: master.categoryId, code: master.code, name: master.name, valid_from: master.validFrom, valid_to: master.validTo, created_by: master.createdBy } };
    case 'RESULT_LINE':
      return { table: 'result_lines', row: { id: master.id, code: master.code, name: master.name, nature: master.nature, order: master.order, ledger_account_id: master.ledgerAccountId, valid_from: master.validFrom, valid_to: master.validTo, created_by: master.createdBy } };
    case 'LEDGER_ACCOUNT':
      return { table: 'ledger_accounts', row: { id: master.id, code: master.code, name: master.name, nature: master.nature, parent_id: master.parentId, is_postable: master.isPostable, valid_from: master.validFrom, valid_to: master.validTo, created_by: master.createdBy } };
    case 'ACCOUNT':
      return { table: 'accounts', row: { id: master.id, name: master.name, kind: master.kind, ownership: master.ownership, financial_institution: master.financialInstitution, currency: master.currency, ledger_account_id: master.ledgerAccountId, is_available: master.isAvailable, is_reconcilable: master.isReconcilable, valid_from: master.validFrom, valid_to: master.validTo, created_by: master.createdBy } };
  }
}

// =====================================================
// Maestros
// =====================================================
export class SupabaseMasterRepository implements MasterRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(entityType: keyof typeof MASTER_TABLES, id: string) {
    const table = MASTER_TABLES[entityType];
    const { data } = await this.supabase.from(table).select('*').eq('id', id).maybeSingle();
    return data ? mapMasterRow(table, data as DbRow) : null;
  }

  async findByCode(entityType: keyof typeof MASTER_TABLES, code: string) {
    const table = MASTER_TABLES[entityType];
    const { data } = await this.supabase.from(table).select('*').eq('code', code).maybeSingle();
    return data ? mapMasterRow(table, data as DbRow) : null;
  }

  async findAll(entityType: keyof typeof MASTER_TABLES) {
    const table = MASTER_TABLES[entityType];
    const { data } = await this.supabase.from(table).select('*');
    return (data ?? []).map((row) => mapMasterRow(table, row as DbRow));
  }

  async save(master: NonNullable<ReturnType<typeof mapMasterRow>>) {
    const { table, row } = masterToRow(master);
    await this.supabase.from(table).insert(row);
    return master;
  }
}

// =====================================================
// Períodos y asientos
// =====================================================
export class SupabaseAccountingPeriodRepository implements AccountingPeriodRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(periodId: string) {
    const { data } = await this.supabase.from('accounting_periods').select('*').eq('id', periodId).maybeSingle();
    return data ? mapAccountingPeriod(data as DbRow) : null;
  }

  async findAll() {
    const { data } = await this.supabase.from('accounting_periods').select('*').order('starts_on', { ascending: false });
    return (data ?? []).map((row) => mapAccountingPeriod(row as DbRow));
  }
}

export class SupabasePeriodRepository implements PeriodRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByCode(code: string) {
    const { data } = await this.supabase.from('accounting_periods').select('*').eq('code', code).maybeSingle();
    return data ? mapAccountingPeriod(data as DbRow) : null;
  }

  async findById(id: string) {
    const { data } = await this.supabase.from('accounting_periods').select('*').eq('id', id).maybeSingle();
    return data ? mapAccountingPeriod(data as DbRow) : null;
  }

  async save(period: AccountingPeriod) {
    await this.supabase.from('accounting_periods').insert({
      id: period.id,
      code: period.code,
      starts_on: period.startsOn,
      ends_on: period.endsOn,
      status: period.status,
    });
    return period;
  }

  async update(period: AccountingPeriod) {
    await this.supabase.from('accounting_periods').update({ status: period.status }).eq('id', period.id);
    return period;
  }
}

export class SupabaseJournalEntryRepository implements JournalEntryRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  private async hydrate(entry: DbRow): Promise<JournalEntry> {
    const { data } = await this.supabase
      .from('journal_lines')
      .select('*')
      .eq('entry_id', entry.id)
      .order('id', { ascending: true });
    const lines: JournalLineDraft[] = (data ?? []).map((l) => mapJournalLine(l as DbRow));
    return mapJournalEntry(entry, lines);
  }

  async findByIdempotencyKey(key: string) {
    const { data } = await this.supabase.from('journal_entries').select('*').eq('idempotency_key', key).maybeSingle();
    return data ? this.hydrate(data as DbRow) : null;
  }

  async findById(entryId: string) {
    const { data } = await this.supabase.from('journal_entries').select('*').eq('id', entryId).maybeSingle();
    return data ? this.hydrate(data as DbRow) : null;
  }

  async findReversalForEntry(entryId: string) {
    const { data } = await this.supabase.from('journal_entries').select('*').eq('reverses_entry_id', entryId).maybeSingle();
    return data ? this.hydrate(data as DbRow) : null;
  }

  async findBySourceDocument(sourceDocumentType: string, sourceDocumentId: string) {
    const { data } = await this.supabase
      .from('journal_entries')
      .select('*')
      .eq('source_document_type', sourceDocumentType)
      .eq('source_document_id', sourceDocumentId)
      .is('reverses_entry_id', null)
      .maybeSingle();
    return data ? this.hydrate(data as DbRow) : null;
  }

  async save(entry: JournalEntry) {
    const p_entry = {
      id: entry.id,
      entry_date: entry.entryDate,
      posting_date: entry.postingDate,
      period_id: entry.periodId,
      source_document_type: entry.sourceDocumentType,
      source_document_id: entry.sourceDocumentId,
      description: entry.description,
      status: entry.status,
      reverses_entry_id: entry.reversesEntryId ?? null,
      idempotency_key: entry.idempotencyKey,
      created_by: entry.createdBy,
      created_at: entry.createdAt,
    };
    const p_lines = entry.lines.map((line) => ({
      ledger_account_id: line.ledgerAccountId,
      debit: moneyToDb(line.debit),
      credit: moneyToDb(line.credit),
      currency: line.debit.currency,
    }));

    const { error } = await this.supabase.rpc('insert_journal_entry', { p_entry, p_lines });
    if (error) throw error;

    return this.hydrate(p_entry as DbRow);
  }

  async markReversed(entryId: string, reversedAt: string) {
    await this.supabase.from('journal_entries').update({ reversed_at: reversedAt }).eq('id', entryId);
  }
}

// =====================================================
// Tesorería
// =====================================================
export class SupabaseAccountMovementRepository implements AccountMovementRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByAccount(accountId: string) {
    const { data } = await this.supabase
      .from('account_movements')
      .select('*')
      .eq('account_id', accountId)
      .order('effective_date', { ascending: true });
    return (data ?? []).map((m) => mapAccountMovement(m as DbRow));
  }

  async findByAccountIds(accountIds: string[]) {
    if (accountIds.length === 0) return [];
    const { data } = await this.supabase
      .from('account_movements')
      .select('*')
      .in('account_id', accountIds)
      .order('effective_date', { ascending: true });
    return (data ?? []).map((m) => mapAccountMovement(m as DbRow));
  }

  async save(movement: ReturnType<typeof mapAccountMovement>) {
    await this.supabase.from('account_movements').insert({
      id: movement.id,
      account_id: movement.accountId,
      effective_date: movement.effectiveDate,
      amount: moneyToDb(movement.amount),
      direction: movement.direction,
      currency: movement.amount.currency,
      source_document_type: movement.sourceDocumentType,
      source_document_id: movement.sourceDocumentId,
      journal_entry_id: movement.journalEntryId,
      idempotency_key: movement.idempotencyKey,
      created_at: movement.createdAt,
    });
    return movement;
  }
}

export class SupabaseDailyClosingRepository implements DailyClosingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByAccountAndDate(accountId: string, closingDate: string) {
    const { data } = await this.supabase
      .from('daily_closings')
      .select('*')
      .eq('account_id', accountId)
      .eq('closing_date', closingDate)
      .maybeSingle();
    return data ? mapDailyClosing(data as DbRow) : null;
  }

  async save(closing: ReturnType<typeof mapDailyClosing>) {
    await this.supabase.from('daily_closings').insert({
      id: closing.id,
      account_id: closing.accountId,
      closing_date: closing.closingDate,
      real_balance: moneyToDb(closing.realBalance),
      currency: closing.realBalance.currency,
      status: closing.status,
      created_by: closing.createdBy,
      created_at: closing.createdAt,
    });
    return closing;
  }
}

export class SupabaseReconciliationRepository implements ReconciliationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string) {
    const { data } = await this.supabase.from('reconciliations').select('*').eq('id', id).maybeSingle();
    return data ? mapReconciliation(data as DbRow) : null;
  }

  async findAll() {
    const { data } = await this.supabase.from('reconciliations').select('*').order('as_of', { ascending: false });
    return (data ?? []).map((r) => mapReconciliation(r as DbRow));
  }

  async save(reconciliation: Reconciliation) {
    await this.supabase.from('reconciliations').insert({
      id: reconciliation.id,
      account_id: reconciliation.accountId,
      period_id: reconciliation.periodId,
      as_of: reconciliation.asOf,
      theoretical_balance: moneyToDb(reconciliation.theoreticalBalance),
      real_balance: moneyToDb(reconciliation.realBalance),
      difference: moneyToDb(reconciliation.difference),
      currency: reconciliation.difference.currency,
      is_shortfall: reconciliation.isShortfall,
      status: reconciliation.status,
      resolution_note: reconciliation.resolutionNote,
      resolved_by: reconciliation.resolvedBy,
    });
    return reconciliation;
  }

  async update(reconciliation: Reconciliation) {
    await this.supabase.from('reconciliations').update({
      status: reconciliation.status,
      resolution_note: reconciliation.resolutionNote,
      resolved_by: reconciliation.resolvedBy,
    }).eq('id', reconciliation.id);
    return reconciliation;
  }
}

// =====================================================
// Operación (documentos)
// =====================================================
export class SupabaseObligationRepository implements ObligationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string) {
    const { data } = await this.supabase.from('obligations').select('*').eq('id', id).maybeSingle();
    return data ? mapObligation(data as DbRow) : null;
  }

  async findAll() {
    const { data } = await this.supabase.from('obligations').select('*');
    return (data ?? []).map((o) => mapObligation(o as DbRow));
  }

  async save(obligation: Obligation) {
    await this.supabase.from('obligations').insert({
      id: obligation.id,
      concept: obligation.concept,
      person_id: obligation.personId,
      category_id: obligation.categoryId,
      result_line_id: obligation.resultLineId,
      planned_account_id: obligation.plannedAccountId,
      estimated_amount: moneyToDb(obligation.estimatedAmount),
      estimated_amount_version: obligation.estimatedAmountVersion,
      final_amount: obligation.finalAmount == null ? null : moneyToDb(obligation.finalAmount),
      currency: obligation.estimatedAmount.currency,
      is_estimated: obligation.isEstimated,
      due_date: obligation.dueDate,
      expected_payment_date: obligation.expectedPaymentDate,
      priority: obligation.priority,
      status: obligation.status,
      period_id: obligation.periodId,
      recurrence_rule_id: obligation.recurrenceRuleId,
      source: obligation.source,
      created_by: obligation.createdBy,
      created_at: obligation.createdAt,
      idempotency_key: obligation.idempotencyKey,
    });
    return obligation;
  }

  async update(obligation: Obligation) {
    await this.supabase.from('obligations').update({
      concept: obligation.concept,
      due_date: obligation.dueDate,
      expected_payment_date: obligation.expectedPaymentDate,
      priority: obligation.priority,
      final_amount: obligation.finalAmount == null ? null : moneyToDb(obligation.finalAmount),
      is_estimated: obligation.isEstimated,
      estimated_amount_version: obligation.estimatedAmountVersion,
      status: obligation.status,
    }).eq('id', obligation.id);
    return obligation;
  }
}

export class SupabaseIncomeRecordRepository implements IncomeRecordRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByIdempotencyKey(key: string) {
    const { data } = await this.supabase.from('income_records').select('*').eq('idempotency_key', key).maybeSingle();
    return data ? mapIncomeRecord(data as DbRow) : null;
  }

  async save(record: ReturnType<typeof mapIncomeRecord>) {
    await this.supabase.from('income_records').insert({
      id: record.id,
      effective_date: record.effectiveDate,
      service_amount: moneyToDb(record.serviceAmount),
      product_amount: moneyToDb(record.productAmount),
      currency: record.serviceAmount.currency,
      status: record.status,
      period_id: record.periodId,
      adjustment_note: record.adjustmentNote,
      idempotency_key: record.idempotencyKey,
      source: record.source,
      created_by: record.createdBy,
      created_at: record.createdAt,
    });
    return record;
  }
}

export class SupabaseIncomeDistributionRepository implements IncomeDistributionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(distribution: ReturnType<typeof mapIncomeDistribution>) {
    await this.supabase.from('income_distributions').insert({
      id: distribution.id,
      income_record_id: distribution.incomeRecordId,
      account_id: distribution.accountId,
      amount: moneyToDb(distribution.amount),
      currency: distribution.amount.currency,
    });
    return distribution;
  }
}

export class SupabasePaymentRepository implements PaymentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByIdempotencyKey(key: string) {
    const { data } = await this.supabase.from('payments').select('*').eq('idempotency_key', key).maybeSingle();
    return data ? mapPayment(data as DbRow) : null;
  }

  async findById(id: string) {
    const { data } = await this.supabase.from('payments').select('*').eq('id', id).maybeSingle();
    return data ? mapPayment(data as DbRow) : null;
  }

  async findAll() {
    const { data } = await this.supabase.from('payments').select('*').order('created_at', { ascending: false });
    return (data ?? []).map((p) => mapPayment(p as DbRow));
  }

  async save(payment: Payment) {
    await this.supabase.from('payments').insert({
      id: payment.id,
      effective_date: payment.effectiveDate,
      account_id: payment.accountId,
      amount: moneyToDb(payment.amount),
      currency: payment.amount.currency,
      status: payment.status,
      attachment_required: payment.attachmentRequired,
      idempotency_key: payment.idempotencyKey,
      source: payment.source,
      created_by: payment.createdBy,
      created_at: payment.createdAt,
    });
    return payment;
  }

  async update(payment: Payment) {
    await this.supabase.from('payments').update({ status: payment.status }).eq('id', payment.id);
    return payment;
  }
}

export class SupabasePaymentApplicationRepository implements PaymentApplicationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findAll() {
    const { data } = await this.supabase.from('payment_applications').select('*').is('reversed_at', null);
    return (data ?? []).map((a) => mapPaymentApplication(a as DbRow));
  }

  async findByObligation(obligationId: string) {
    const { data } = await this.supabase
      .from('payment_applications')
      .select('*')
      .eq('obligation_id', obligationId)
      .is('reversed_at', null);
    return (data ?? []).map((a) => mapPaymentApplication(a as DbRow));
  }

  async findByPayment(paymentId: string) {
    const { data } = await this.supabase.from('payment_applications').select('*').eq('payment_id', paymentId);
    return (data ?? []).map((a) => mapPaymentApplication(a as DbRow));
  }

  async markReversedByPayment(paymentId: string, reversedAt: string) {
    await this.supabase.from('payment_applications').update({ reversed_at: reversedAt }).eq('payment_id', paymentId);
  }

  async save(application: PaymentApplication) {
    await this.supabase.from('payment_applications').insert({
      id: application.id,
      payment_id: application.paymentId,
      obligation_id: application.obligationId,
      applied_amount: moneyToDb(application.appliedAmount),
      currency: application.appliedAmount.currency,
    });
    return application;
  }
}

export class SupabaseTransferRepository implements TransferRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByIdempotencyKey(key: string) {
    const { data } = await this.supabase.from('transfers').select('*').eq('idempotency_key', key).maybeSingle();
    return data ? mapTransfer(data as DbRow) : null;
  }

  async save(transfer: Transfer) {
    await this.supabase.from('transfers').insert({
      id: transfer.id,
      effective_date: transfer.effectiveDate,
      from_account_id: transfer.fromAccountId,
      to_account_id: transfer.toAccountId,
      amount: moneyToDb(transfer.amount),
      currency: transfer.amount.currency,
      status: transfer.status,
      idempotency_key: transfer.idempotencyKey,
      source: transfer.source,
      created_by: transfer.createdBy,
      created_at: transfer.createdAt,
    });
    return transfer;
  }
}

export class SupabaseExternalSettlementRepository implements ExternalSettlementRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByIdempotencyKey(key: string) {
    const { data } = await this.supabase.from('external_settlements').select('*').eq('idempotency_key', key).maybeSingle();
    return data ? mapExternalSettlement(data as DbRow) : null;
  }

  async findById(id: string) {
    const { data } = await this.supabase.from('external_settlements').select('*').eq('id', id).maybeSingle();
    return data ? mapExternalSettlement(data as DbRow) : null;
  }

  async save(settlement: ExternalSettlement) {
    await this.supabase.from('external_settlements').insert({
      id: settlement.id,
      source_person_id: settlement.sourcePersonId,
      external_account_id: settlement.externalAccountId,
      result_line_id: settlement.resultLineId,
      concept: settlement.concept,
      amount: moneyToDb(settlement.amount),
      currency: settlement.amount.currency,
      nature: settlement.nature,
      effective_date: settlement.effectiveDate,
      status: settlement.status,
      note: settlement.note,
      idempotency_key: settlement.idempotencyKey,
      source: settlement.source,
      created_by: settlement.createdBy,
      created_at: settlement.createdAt,
    });
    return settlement;
  }

  async update(settlement: ExternalSettlement) {
    await this.supabase.from('external_settlements').update({ status: settlement.status }).eq('id', settlement.id);
    return settlement;
  }
}

export class SupabaseCommissionRepository implements CommissionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findRecordsByBarber(barberId: string) {
    const { data } = await this.supabase.from('commission_records').select('*').eq('barber_id', barberId);
    return (data ?? []).map((r) => mapCommissionRecord(r as DbRow));
  }

  async findPaymentsByBarber(barberId: string) {
    const { data } = await this.supabase.from('commission_payments').select('*').eq('barber_id', barberId);
    return (data ?? []).map((p) => mapCommissionPayment(p as DbRow));
  }

  async findRecordByIdempotencyKey(key: string) {
    const { data } = await this.supabase.from('commission_records').select('*').eq('idempotency_key', key).maybeSingle();
    return data ? mapCommissionRecord(data as DbRow) : null;
  }

  async findPaymentByIdempotencyKey(key: string) {
    const { data } = await this.supabase.from('commission_payments').select('*').eq('idempotency_key', key).maybeSingle();
    return data ? mapCommissionPayment(data as DbRow) : null;
  }

  async saveRecord(record: CommissionRecord) {
    await this.supabase.from('commission_records').insert({
      id: record.id,
      barber_id: record.barberId,
      effective_date: record.effectiveDate,
      amount: moneyToDb(record.amount),
      currency: record.amount.currency,
      period_id: record.periodId,
      idempotency_key: record.idempotencyKey,
      created_by: record.createdBy,
      created_at: record.createdAt,
    });
    return record;
  }

  async savePayment(payment: CommissionPayment) {
    await this.supabase.from('commission_payments').insert({
      id: payment.id,
      barber_id: payment.barberId,
      effective_date: payment.effectiveDate,
      amount: moneyToDb(payment.amount),
      currency: payment.amount.currency,
      period_id: payment.periodId,
      idempotency_key: payment.idempotencyKey,
      created_by: payment.createdBy,
      created_at: payment.createdAt,
    });
    return payment;
  }

  async saveDistribution(distribution: CommissionPaymentDistribution) {
    await this.supabase.from('commission_payment_distributions').insert({
      id: distribution.id,
      commission_payment_id: distribution.commissionPaymentId,
      account_id: distribution.accountId,
      amount: moneyToDb(distribution.amount),
      currency: distribution.amount.currency,
    });
    return distribution;
  }
}

// =====================================================
// Planificación / proyección
// =====================================================
export class SupabaseInvestmentRepository implements InvestmentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string) {
    const { data } = await this.supabase.from('investments').select('*').eq('id', id).maybeSingle();
    return data ? mapInvestment(data as DbRow) : null;
  }

  async findAllCapitalized() {
    const { data } = await this.supabase
      .from('investments')
      .select('*')
      .eq('status', 'PAGADA')
      .eq('capitalized', true);
    return (data ?? []).map((i) => mapInvestment(i as DbRow));
  }

  async findAll() {
    const { data } = await this.supabase.from('investments').select('*').order('created_at', { ascending: false });
    return (data ?? []).map((i) => mapInvestment(i as DbRow));
  }

  async save(investment: Investment) {
    await this.supabase.from('investments').insert({
      id: investment.id,
      concept: investment.concept,
      amount: moneyToDb(investment.amount),
      currency: investment.amount.currency,
      tentative_date: investment.tentativeDate,
      status: investment.status,
      decision_note: investment.decisionNote,
      created_by: investment.createdBy,
      created_at: investment.createdAt,
      paid_at: investment.paidAt,
      capitalized: investment.capitalized,
      useful_life_months: investment.usefulLifeMonths,
    });
    return investment;
  }

  async update(investment: Investment) {
    await this.supabase.from('investments').update({
      status: investment.status,
      decision_note: investment.decisionNote,
      paid_at: investment.paidAt,
      capitalized: investment.capitalized,
      useful_life_months: investment.usefulLifeMonths,
    }).eq('id', investment.id);
    return investment;
  }
}

export class SupabaseInvestmentEvaluationRepository implements InvestmentEvaluationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(evaluation: InvestmentEvaluation) {
    await this.supabase.from('investment_evaluations').insert({
      id: evaluation.id,
      investment_id: evaluation.investmentId,
      scenario: evaluation.scenario,
      min_projected_balance: moneyToDb(evaluation.minProjectedBalance),
      capacity_amount: moneyToDb(evaluation.capacityAmount),
      currency: evaluation.minProjectedBalance.currency,
      confidence: evaluation.confidence,
      evaluated_at: evaluation.evaluatedAt,
    });
    return evaluation;
  }
}

// =====================================================
// Seguridad / identidad
// =====================================================
export class SupabaseRoleRepository implements RoleRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findUserRoles(userId: UserId) {
    const { data } = await this.supabase
      .from('user_roles')
      .select('roles(code)')
      .eq('user_id', userId);
    const roles: RoleCode[] = [];
    for (const row of data ?? []) {
      const nested = (row as DbRow).roles as { code: RoleCode } | null;
      if (nested?.code) roles.push(nested.code);
    }
    return roles;
  }

  async findActiveDelegations(userId: UserId, at: string) {
    const { data } = await this.supabase
      .from('role_delegations')
      .select('role_code')
      .eq('delegate_user_id', userId)
      .lte('starts_at', at)
      .gte('ends_at', at);
    return (data ?? []).map((d) => (d as DbRow).role_code as RoleCode);
  }
}

export class SupabaseAuditRecorder implements AuditRecorder {
  constructor(private readonly supabase: SupabaseClient) {}

  async record(event: AuditEventInput) {
    await this.supabase.from('audit_events').insert({
      entity_type: event.entityType,
      entity_id: event.entityId,
      action: event.action,
      actor_user_id: event.actorUserId,
      occurred_at: event.occurredAt,
      reason: event.reason,
    });
  }
}

export class SupabaseAuditQueryRepository implements AuditQueryRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByEntity(entityType: string, entityId: string) {
    const { data } = await this.supabase
      .from('audit_events')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('occurred_at', { ascending: false });
    return (data ?? []).map((e) => mapAuditEvent(e as DbRow));
  }
}

export class SupabaseJournalEntryQueryRepository implements JournalEntryQueryRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByPeriod(periodId: string) {
    const { data } = await this.supabase.from('journal_entries').select('*').eq('period_id', periodId);
    const rows = data ?? [];
    const entryIds = rows.map((row) => row.id);

    const linesByEntry = new Map<string, JournalLineDraft[]>();
    if (entryIds.length > 0) {
      const { data: allLines } = await this.supabase
        .from('journal_lines')
        .select('*')
        .in('entry_id', entryIds)
        .order('id', { ascending: true });
      for (const line of allLines ?? []) {
        const entryId = String(line.entry_id);
        const list = linesByEntry.get(entryId) ?? [];
        list.push(mapJournalLine(line as DbRow));
        linesByEntry.set(entryId, list);
      }
    }

    return rows.map((row) => mapJournalEntry(row as DbRow, linesByEntry.get(String(row.id)) ?? []));
  }
}

// =====================================================
// Previsión
// =====================================================
export class SupabaseForecastAccountRepository implements ForecastAccountRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listAccounts() {
    const { data } = await this.supabase.from('accounts').select('*');
    return (data ?? []).map((a) => mapAccount(a as DbRow));
  }
}

export class SupabaseForecastReconciliationRepository implements ForecastReconciliationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findLatestByAccount(accountId: string) {
    const { data } = await this.supabase
      .from('daily_closings')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', 'CONFIRMADO')
      .order('closing_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const closing = mapDailyClosing(data as DbRow);
    return { realBalance: closing.realBalance, asOf: closing.closingDate };
  }
}

export class SupabaseForecastIncomeRepository implements ForecastIncomeRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listForScenario(scenario: IncomeForecast['scenario']) {
    const { data } = await this.supabase.from('income_forecasts').select('*').eq('scenario', scenario);
    return (data ?? []).map((f) => mapIncomeForecast(f as DbRow));
  }
}

export class SupabaseForecastObligationRepository implements ForecastObligationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listActive() {
    const { data } = await this.supabase.from('obligations').select('*').in('status', ['PENDIENTE', 'PROGRAMADA', 'PARCIAL', 'VENCIDA']);
    return (data ?? []).map((o) => mapObligation(o as DbRow));
  }
}

export class SupabaseForecastSettingsRepository implements ForecastSettingsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getReserve(currency: Currency): Promise<Money | null> {
    const { data } = await this.supabase
      .from('settings_parameters')
      .select('*')
      .eq('key', 'reserve')
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const value = String((data as DbRow).value);
    return { amount: Number(value).toFixed(2), currency };
  }
}

// =====================================================
// Adjuntos (metadatos; storage en E8d)
// =====================================================
export class SupabaseAttachmentRepository implements AttachmentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(attachment: Attachment) {
    await this.supabase.from('attachments').insert({
      id: attachment.id,
      entity_type: attachment.entityType,
      entity_id: attachment.entityId,
      storage_key: attachment.storageKey,
      checksum: attachment.checksum,
      mime: attachment.mime,
      size_bytes: attachment.sizeBytes,
      is_private: attachment.isPrivate,
      uploaded_by: attachment.uploadedBy,
      created_at: attachment.createdAt,
    });
    return attachment;
  }
}
