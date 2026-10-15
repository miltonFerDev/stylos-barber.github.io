import type { AccountMovementRepository } from '../domain/account-movements';
import type { AuditRecorder } from '../domain/audit';
import { domainError } from '../domain/errors';
import {
  distributionsMatchIncome,
  totalIncomeMinor,
  type IncomeDistribution,
  type IncomeRecord,
} from '../domain/incomes';
import type { JournalLineDraft } from '../domain/journal';
import { isCurrentAt } from '../domain/masters';
import { isValidMoneyAmount, toMinor } from '../domain/money';
import { isPeriodOpen } from '../domain/periods';
import type { AccountingPeriodRepository, JournalService } from './journal-service';
import type { MasterRepository } from './master-data-service';
import type { Authorizer } from './permission-service';
import type { CommandContext, Money, Result } from '../domain/types';

export type RegisterDailyIncomeCommand = {
  effectiveDate: string;
  periodId: string;
  serviceAmount: Money;
  productAmount: Money;
  distributions: Array<{ accountId: string; amount: Money }>;
  adjustmentNote?: string;
};

export type IncomeRecordRepository = {
  findByIdempotencyKey(key: string): Promise<IncomeRecord | null>;
  save(record: IncomeRecord): Promise<IncomeRecord>;
};

export type IncomeDistributionRepository = {
  save(distribution: IncomeDistribution): Promise<IncomeDistribution>;
};

export type IncomesServiceDependencies = {
  incomes: IncomeRecordRepository;
  distributions: IncomeDistributionRepository;
  movements: AccountMovementRepository;
  masters: MasterRepository;
  periods: AccountingPeriodRepository;
  journal: Pick<JournalService, 'postEntry'>;
  authorize: Authorizer;
  audit: AuditRecorder;
  createId: () => string;
  incomeLedgerAccounts: { servicios: string; productos: string };
};

export class IncomesService {
  constructor(private readonly dependencies: IncomesServiceDependencies) {}

  async registerDailyIncome(ctx: CommandContext, command: RegisterDailyIncomeCommand): Promise<Result<IncomeRecord>> {
    const authorized = await this.dependencies.authorize(ctx, 'REGISTER_DAILY_INCOME');
    if (!authorized.ok) return authorized;

    const previous = await this.dependencies.incomes.findByIdempotencyKey(ctx.idempotencyKey);
    if (previous) {
      return {
        ok: false,
        error: domainError('DUPLICATE_IDEMPOTENCY', 'El ingreso ya fue registrado con esta clave.', true, {
          previousIncome: previous,
        }),
      };
    }

    if (command.effectiveDate.trim().length === 0 || command.periodId.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'La fecha efectiva y el periodo son obligatorios.', true, {
          fields: ['effectiveDate', 'periodId'],
        }),
      };
    }

    const allAmounts = [command.serviceAmount, command.productAmount, ...command.distributions.map(d => d.amount)];
    if (allAmounts.some(m => !isValidMoneyAmount(m.amount))) {
      return {
        ok: false,
        error: domainError('VALIDATION_FAILED', 'Uno de los importes es invalido.', true),
      };
    }

    if (totalIncomeMinor(command.serviceAmount, command.productAmount) <= 0n) {
      return {
        ok: false,
        error: domainError('VALIDATION_FAILED', 'El ingreso total debe ser mayor a cero.', true),
      };
    }

    if (!distributionsMatchIncome(command.distributions.map(d => d.amount), command.serviceAmount, command.productAmount)) {
      return {
        ok: false,
        error: domainError('INCOME_DISTRIBUTION_MISMATCH', 'La suma de distribuciones debe igualar el ingreso total.', true),
      };
    }

    for (const distribution of command.distributions) {
      const account = await this.dependencies.masters.findById('ACCOUNT', distribution.accountId);
      if (!account || account.entityType !== 'ACCOUNT') {
        return {
          ok: false,
          error: domainError('MASTER_NOT_FOUND', 'La cuenta receptora no existe.', true, {
            id: distribution.accountId,
          }),
        };
      }
      if (account.ownership !== 'PROPIA' || !account.isAvailable || !isCurrentAt(account, ctx.now)) {
        return {
          ok: false,
          error: domainError('ACCOUNT_NOT_AVAILABLE', 'La cuenta receptora no esta disponible.', true, {
            accountId: account.id,
          }),
        };
      }
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
        error: domainError('PERIOD_CLOSED', 'No se puede registrar ingreso en un periodo cerrado o en revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const currency = command.serviceAmount.currency;
    const zero: Money = { amount: '0.00', currency };

    const debitLines: JournalLineDraft[] = [];
    for (const distribution of command.distributions) {
      const account = await this.dependencies.masters.findById('ACCOUNT', distribution.accountId);
      if (!account || account.entityType !== 'ACCOUNT') continue;

      debitLines.push({
        ledgerAccountId: account.ledgerAccountId,
        debit: distribution.amount,
        credit: zero,
      });
    }

    const creditLines: JournalLineDraft[] = [];
    if (toMinor(command.serviceAmount) > 0n) {
      creditLines.push({
        ledgerAccountId: this.dependencies.incomeLedgerAccounts.servicios,
        debit: zero,
        credit: command.serviceAmount,
      });
    }
    if (toMinor(command.productAmount) > 0n) {
      creditLines.push({
        ledgerAccountId: this.dependencies.incomeLedgerAccounts.productos,
        debit: zero,
        credit: command.productAmount,
      });
    }

    const incomeId = this.dependencies.createId();

    const entryResult = await this.dependencies.journal.postEntry(ctx, {
      periodId: period.id,
      entryDate: command.effectiveDate,
      sourceDocumentType: 'income_record',
      sourceDocumentId: incomeId,
      description: 'Ingreso diario',
      lines: [...debitLines, ...creditLines],
    });

    if (!entryResult.ok) return entryResult;

    for (const distribution of command.distributions) {
      await this.dependencies.movements.save({
        id: this.dependencies.createId(),
        accountId: distribution.accountId,
        effectiveDate: command.effectiveDate,
        amount: distribution.amount,
        direction: 'IN',
        sourceDocumentType: 'income_record',
        sourceDocumentId: incomeId,
        journalEntryId: entryResult.value.id,
        idempotencyKey: ctx.idempotencyKey,
        createdAt: ctx.now,
      });
    }

    const incomeRecord: IncomeRecord = {
      id: incomeId,
      effectiveDate: command.effectiveDate,
      serviceAmount: command.serviceAmount,
      productAmount: command.productAmount,
      status: 'CONFIRMADO',
      periodId: command.periodId,
      adjustmentNote: command.adjustmentNote ?? null,
      idempotencyKey: ctx.idempotencyKey,
      source: 'REAL',
      createdBy: ctx.actorUserId,
      createdAt: ctx.now,
    };

    await this.dependencies.incomes.save(incomeRecord);

    for (const distribution of command.distributions) {
      await this.dependencies.distributions.save({
        id: this.dependencies.createId(),
        incomeRecordId: incomeId,
        accountId: distribution.accountId,
        amount: distribution.amount,
      });
    }

    await this.dependencies.audit.record({
      entityType: 'income_record',
      entityId: incomeRecord.id,
      action: 'INCOME_CREATED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: incomeRecord };
  }
}
