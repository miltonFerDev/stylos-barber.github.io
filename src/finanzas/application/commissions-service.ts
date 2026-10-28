import type { AccountMovementRepository } from '../domain/account-movements';
import type { AuditRecorder } from '../domain/audit';
import { minorToMoney } from '../domain/closings';
import {
  pendingBalanceMinor,
  type CommissionPayment,
  type CommissionPaymentDistribution,
  type CommissionRecord,
} from '../domain/commissions';
import { domainError } from '../domain/errors';
import type { JournalLineDraft } from '../domain/journal';
import { isCurrentAt } from '../domain/masters';
import { toMinor } from '../domain/money';
import { validatePositiveAmount } from '../domain/obligations';
import { isPeriodOpen } from '../domain/periods';
import type { AccountingPeriodRepository, JournalService } from './journal-service';
import type { MasterRepository } from './master-data-service';
import type { Authorizer } from './permission-service';
import type { CommandContext, Money, Result } from '../domain/types';

export type RegisterCommissionDevengoCommand = {
  barberId: string;
  amount: Money;
  effectiveDate: string;
  periodId: string;
};

export type RegisterCommissionPaymentCommand = {
  barberId: string;
  effectiveDate: string;
  periodId: string;
  distributions: Array<{ accountId: string; amount: Money }>;
};

export type CommissionRepository = {
  findRecordsByBarber(barberId: string): Promise<CommissionRecord[]>;
  findPaymentsByBarber(barberId: string): Promise<CommissionPayment[]>;
  findRecordByIdempotencyKey(key: string): Promise<CommissionRecord | null>;
  findPaymentByIdempotencyKey(key: string): Promise<CommissionPayment | null>;
  saveRecord(record: CommissionRecord): Promise<CommissionRecord>;
  savePayment(payment: CommissionPayment): Promise<CommissionPayment>;
  saveDistribution(distribution: CommissionPaymentDistribution): Promise<CommissionPaymentDistribution>;
};

export type CommissionsServiceDependencies = {
  commissions: CommissionRepository;
  movements: AccountMovementRepository;
  masters: MasterRepository;
  periods: AccountingPeriodRepository;
  journal: Pick<JournalService, 'postEntry'>;
  authorize: Authorizer;
  audit: AuditRecorder;
  createId: () => string;
  commissionLedgerAccounts: { expense: string; payable: string };
};

export class CommissionsService {
  constructor(private readonly dependencies: CommissionsServiceDependencies) {}

  /** Saldo pendiente (devengado no pagado) de un barbero. */
  async pendingBalance(barberId: string): Promise<Money> {
    const [records, payments] = await Promise.all([
      this.dependencies.commissions.findRecordsByBarber(barberId),
      this.dependencies.commissions.findPaymentsByBarber(barberId),
    ]);
    const currency = records[0]?.amount.currency ?? payments[0]?.amount.currency ?? 'ARS';
    return minorToMoney(pendingBalanceMinor(records, payments), currency);
  }

  async registerCommissionDevengo(
    ctx: CommandContext,
    command: RegisterCommissionDevengoCommand
  ): Promise<Result<CommissionRecord>> {
    const authorized = await this.dependencies.authorize(ctx, 'REGISTER_COMMISSION');
    if (!authorized.ok) return authorized;

    const previous = await this.dependencies.commissions.findRecordByIdempotencyKey(ctx.idempotencyKey);
    if (previous) {
      return { ok: true, value: previous };
    }

    const amount = validatePositiveAmount(command.amount);
    if (!amount.ok) return amount;

    if (
      command.barberId.trim().length === 0 ||
      command.effectiveDate.trim().length === 0 ||
      command.periodId.trim().length === 0
    ) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'Faltan campos obligatorios.', true),
      };
    }

    const barber = await this.dependencies.masters.findById('PERSON', command.barberId);
    if (!barber || barber.entityType !== 'PERSON') {
      return {
        ok: false,
        error: domainError('MASTER_NOT_FOUND', 'El barbero no existe.', true, { barberId: command.barberId }),
      };
    }
    if (!isCurrentAt(barber, ctx.now)) {
      return {
        ok: false,
        error: domainError('MASTER_NOT_CURRENT', 'El barbero no esta vigente.', true, { barberId: barber.id }),
      };
    }

    const period = await this.dependencies.periods.findById(command.periodId);
    if (!period) {
      return {
        ok: false,
        error: domainError('PERIOD_NOT_FOUND', 'El periodo contable no existe.', true, { periodId: command.periodId }),
      };
    }
    if (!isPeriodOpen(period)) {
      return {
        ok: false,
        error: domainError('PERIOD_CLOSED', 'No se puede devengar en un periodo cerrado o en revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const zero: Money = { amount: '0.00', currency: command.amount.currency };
    const recordId = this.dependencies.createId();

    const entryResult = await this.dependencies.journal.postEntry(ctx, {
      periodId: period.id,
      entryDate: command.effectiveDate,
      sourceDocumentType: 'commission_record',
      sourceDocumentId: recordId,
      description: 'Comision a barbero',
      lines: [
        { ledgerAccountId: this.dependencies.commissionLedgerAccounts.expense, debit: command.amount, credit: zero },
        { ledgerAccountId: this.dependencies.commissionLedgerAccounts.payable, debit: zero, credit: command.amount },
      ] as JournalLineDraft[],
    });

    if (!entryResult.ok) return entryResult;

    const record: CommissionRecord = {
      id: recordId,
      barberId: command.barberId,
      effectiveDate: command.effectiveDate,
      amount: command.amount,
      periodId: command.periodId,
      idempotencyKey: ctx.idempotencyKey,
      createdBy: ctx.actorUserId,
      createdAt: ctx.now,
    };

    await this.dependencies.commissions.saveRecord(record);
    await this.dependencies.audit.record({
      entityType: 'commission_record',
      entityId: record.id,
      action: 'COMMISSION_ACCRUED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: record };
  }

  async registerCommissionPayment(
    ctx: CommandContext,
    command: RegisterCommissionPaymentCommand
  ): Promise<Result<CommissionPayment>> {
    const authorized = await this.dependencies.authorize(ctx, 'REGISTER_COMMISSION');
    if (!authorized.ok) return authorized;

    const previous = await this.dependencies.commissions.findPaymentByIdempotencyKey(ctx.idempotencyKey);
    if (previous) {
      return { ok: true, value: previous };
    }

    if (
      command.barberId.trim().length === 0 ||
      command.effectiveDate.trim().length === 0 ||
      command.periodId.trim().length === 0 ||
      command.distributions.length === 0
    ) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'Faltan campos obligatorios.', true),
      };
    }

    const barber = await this.dependencies.masters.findById('PERSON', command.barberId);
    if (!barber || barber.entityType !== 'PERSON') {
      return {
        ok: false,
        error: domainError('MASTER_NOT_FOUND', 'El barbero no existe.', true, { barberId: command.barberId }),
      };
    }

    const period = await this.dependencies.periods.findById(command.periodId);
    if (!period) {
      return {
        ok: false,
        error: domainError('PERIOD_NOT_FOUND', 'El periodo contable no existe.', true, { periodId: command.periodId }),
      };
    }
    if (!isPeriodOpen(period)) {
      return {
        ok: false,
        error: domainError('PERIOD_CLOSED', 'No se puede pagar en un periodo cerrado o en revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const currency = command.distributions[0].amount.currency;
    const accounts = new Map<string, string>(); // accountId -> ledgerAccountId
    let totalMinor = 0n;

    for (const distribution of command.distributions) {
      const amount = validatePositiveAmount(distribution.amount);
      if (!amount.ok) return amount;

      const account = await this.dependencies.masters.findById('ACCOUNT', distribution.accountId);
      if (!account || account.entityType !== 'ACCOUNT') {
        return {
          ok: false,
          error: domainError('MASTER_NOT_FOUND', 'La cuenta de pago no existe.', true, { id: distribution.accountId }),
        };
      }
      if (account.ownership !== 'PROPIA' || !account.isAvailable || !isCurrentAt(account, ctx.now)) {
        return {
          ok: false,
          error: domainError('ACCOUNT_NOT_AVAILABLE', 'La cuenta de pago no esta disponible.', true, {
            accountId: account.id,
          }),
        };
      }

      totalMinor += toMinor(distribution.amount);
      accounts.set(account.id, account.ledgerAccountId);
    }

    const pending = await this.pendingBalance(command.barberId);
    if (totalMinor > toMinor(pending)) {
      return {
        ok: false,
        error: domainError(
          'COMMISSION_EXCEEDS_PENDING',
          'El pago supera el saldo pendiente del barbero.',
          true,
          { pending: pending.amount, requested: minorToMoney(totalMinor, currency).amount }
        ),
      };
    }

    const zero: Money = { amount: '0.00', currency };
    const totalMoney = minorToMoney(totalMinor, currency);
    const paymentId = this.dependencies.createId();

    const creditLines: JournalLineDraft[] = command.distributions.map((distribution) => ({
      ledgerAccountId: accounts.get(distribution.accountId)!,
      debit: zero,
      credit: distribution.amount,
    }));

    const entryResult = await this.dependencies.journal.postEntry(ctx, {
      periodId: period.id,
      entryDate: command.effectiveDate,
      sourceDocumentType: 'commission_payment',
      sourceDocumentId: paymentId,
      description: 'Pago de comision a barbero',
      lines: [
        { ledgerAccountId: this.dependencies.commissionLedgerAccounts.payable, debit: totalMoney, credit: zero },
        ...creditLines,
      ],
    });

    if (!entryResult.ok) return entryResult;

    for (const distribution of command.distributions) {
      await this.dependencies.movements.save({
        id: this.dependencies.createId(),
        accountId: distribution.accountId,
        effectiveDate: command.effectiveDate,
        amount: distribution.amount,
        direction: 'OUT',
        sourceDocumentType: 'commission_payment',
        sourceDocumentId: paymentId,
        journalEntryId: entryResult.value.id,
        idempotencyKey: ctx.idempotencyKey,
        createdAt: ctx.now,
      });
    }

    const payment: CommissionPayment = {
      id: paymentId,
      barberId: command.barberId,
      effectiveDate: command.effectiveDate,
      amount: totalMoney,
      periodId: command.periodId,
      idempotencyKey: ctx.idempotencyKey,
      createdBy: ctx.actorUserId,
      createdAt: ctx.now,
    };

    await this.dependencies.commissions.savePayment(payment);

    for (const distribution of command.distributions) {
      await this.dependencies.commissions.saveDistribution({
        id: this.dependencies.createId(),
        commissionPaymentId: paymentId,
        accountId: distribution.accountId,
        amount: distribution.amount,
      });
    }

    await this.dependencies.audit.record({
      entityType: 'commission_payment',
      entityId: payment.id,
      action: 'COMMISSION_PAID',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: payment };
  }
}
