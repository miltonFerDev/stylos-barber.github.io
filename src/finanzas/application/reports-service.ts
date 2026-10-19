import type { AccountMovementRepository } from '../domain/account-movements';
import type { AuditEvent } from '../domain/audit';
import { minorToMoney, movementNet } from '../domain/closings';
import { domainError } from '../domain/errors';
import type { JournalEntry } from '../domain/journal';
import type { AccountKind, AccountOwnership } from '../domain/masters';
import type { ObligationPriority, ObligationStatus } from '../domain/obligations';
import {
  computeIncomeStatement,
  isOverdue,
  obligationAmount,
  overdueSummary,
  summarizeByStatus,
  type IncomeStatementTotals,
  type ObligationBucket,
} from '../domain/reports';
import type { MasterRepository } from './master-data-service';
import type { ObligationRepository } from './obligations-service';
import type { Authorizer } from './permission-service';
import type { CommandContext, Currency, Money, Result } from '../domain/types';

export type AuditQueryRepository = {
  findByEntity(entityType: string, entityId: string): Promise<AuditEvent[]>;
};

export type JournalEntryQueryRepository = {
  findByPeriod(periodId: string): Promise<JournalEntry[]>;
};

export type AvailabilityLine = {
  accountId: string;
  name: string;
  kind: AccountKind;
  ownership: AccountOwnership;
  currency: Currency;
  balance: Money;
  isAvailable: boolean;
};

export type AvailabilityReport = {
  lines: AvailabilityLine[];
  totalAvailable: Money;
  currency: Currency;
};

export type ObligationLine = {
  id: string;
  concept: string;
  status: ObligationStatus;
  dueDate: string;
  amount: Money;
  isOverdue: boolean;
  priority: ObligationPriority;
  expectedPaymentDate: string | null;
};

export type ObligationsReport = {
  lines: ObligationLine[];
  byStatus: Partial<Record<ObligationStatus, ObligationBucket>>;
  overdue: ObligationBucket;
  currency: Currency;
};

export type AuditHistoryReport = {
  entityType: string;
  entityId: string;
  events: AuditEvent[];
};

export type AuditHistoryCommand = {
  entityType: string;
  entityId: string;
};

export type IncomeStatementCommand = {
  periodId: string;
};

export type IncomeStatement = IncomeStatementTotals & {
  periodId: string;
  currency: Currency;
};

export type ReportsServiceDependencies = {
  masters: MasterRepository;
  movements: AccountMovementRepository;
  obligations: ObligationRepository;
  auditHistory: AuditQueryRepository;
  journalEntries: JournalEntryQueryRepository;
  authorize: Authorizer;
};

export class ReportsService {
  constructor(private readonly dependencies: ReportsServiceDependencies) {}

  async availabilityReport(ctx: CommandContext): Promise<Result<AvailabilityReport>> {
    const authorized = await this.dependencies.authorize(ctx, 'VIEW_BALANCES');
    if (!authorized.ok) return authorized;

    const accounts = await this.dependencies.masters.findAll('ACCOUNT');

    const lines: AvailabilityLine[] = [];
    let totalMinor = 0n;
    let currency: Currency = 'ARS';

    for (const master of accounts) {
      if (master.entityType !== 'ACCOUNT') continue;

      const movements = await this.dependencies.movements.findByAccount(master.id);
      const netMinor = movementNet(movements);

      currency = master.currency;
      lines.push({
        accountId: master.id,
        name: master.name,
        kind: master.kind,
        ownership: master.ownership,
        currency: master.currency,
        balance: minorToMoney(netMinor, master.currency),
        isAvailable: master.isAvailable,
      });

      if (master.ownership === 'PROPIA' && master.isAvailable) {
        totalMinor += netMinor;
      }
    }

    return {
      ok: true,
      value: { lines, totalAvailable: minorToMoney(totalMinor, currency), currency },
    };
  }

  async obligationsReport(ctx: CommandContext): Promise<Result<ObligationsReport>> {
    const authorized = await this.dependencies.authorize(ctx, 'VIEW_BALANCES');
    if (!authorized.ok) return authorized;

    const obligations = await this.dependencies.obligations.findAll();

    const lines: ObligationLine[] = obligations.map((obligation) => ({
      id: obligation.id,
      concept: obligation.concept,
      status: obligation.status,
      dueDate: obligation.dueDate,
      amount: obligationAmount(obligation),
      isOverdue: isOverdue(obligation, ctx.now),
      priority: obligation.priority,
      expectedPaymentDate: obligation.expectedPaymentDate,
    }));

    return {
      ok: true,
      value: {
        lines,
        byStatus: summarizeByStatus(obligations),
        overdue: overdueSummary(obligations, ctx.now),
        currency: 'ARS',
      },
    };
  }

  async auditHistory(ctx: CommandContext, command: AuditHistoryCommand): Promise<Result<AuditHistoryReport>> {
    const authorized = await this.dependencies.authorize(ctx, 'VIEW_AUDIT');
    if (!authorized.ok) return authorized;

    if (command.entityType.trim().length === 0 || command.entityId.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'La entidad y su id son obligatorios.', true, {
          fields: ['entityType', 'entityId'],
        }),
      };
    }

    const events = await this.dependencies.auditHistory.findByEntity(command.entityType, command.entityId);

    return {
      ok: true,
      value: { entityType: command.entityType, entityId: command.entityId, events },
    };
  }

  async incomeStatement(ctx: CommandContext, command: IncomeStatementCommand): Promise<Result<IncomeStatement>> {
    const authorized = await this.dependencies.authorize(ctx, 'VIEW_BALANCES');
    if (!authorized.ok) return authorized;

    if (command.periodId.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'El periodo contable es obligatorio.', true, {
          field: 'periodId',
        }),
      };
    }

    const entries = await this.dependencies.journalEntries.findByPeriod(command.periodId);
    const resultLines = (await this.dependencies.masters.findAll('RESULT_LINE')).filter(
      (master) => master.entityType === 'RESULT_LINE'
    );

    const totals = computeIncomeStatement(entries, resultLines);

    return {
      ok: true,
      value: { periodId: command.periodId, currency: 'ARS', ...totals },
    };
  }
}
