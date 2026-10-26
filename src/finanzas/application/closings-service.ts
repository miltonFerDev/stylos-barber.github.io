import type { AccountMovementRepository } from '../domain/account-movements';
import type { AuditRecorder } from '../domain/audit';
import {
  computeDifference,
  minorToMoney,
  movementNet,
  type DailyClosing,
  type Reconciliation,
  type ReconciliationResolution,
} from '../domain/closings';
import { domainError } from '../domain/errors';
import type { JournalLineDraft } from '../domain/journal';
import { isCurrentAt } from '../domain/masters';
import { toMinor } from '../domain/money';
import { isPeriodOpen } from '../domain/periods';
import type { AccountingPeriodRepository, JournalService } from './journal-service';
import type { MasterRepository } from './master-data-service';
import type { Authorizer } from './permission-service';
import type { CommandContext, Money, Result } from '../domain/types';

export type RegisterDailyClosingCommand = {
  accountId: string;
  closingDate: string;
  periodId: string;
  realBalance: Money;
};

export type ResolveDifferenceCommand = {
  reconciliationId: string;
  resolution: ReconciliationResolution;
  reason: string;
};

export type DailyClosingRepository = {
  findByAccountAndDate(accountId: string, closingDate: string): Promise<DailyClosing | null>;
  save(closing: DailyClosing): Promise<DailyClosing>;
};

export type ReconciliationRepository = {
  findById(id: string): Promise<Reconciliation | null>;
  findAll(): Promise<Reconciliation[]>;
  save(reconciliation: Reconciliation): Promise<Reconciliation>;
  update(reconciliation: Reconciliation): Promise<Reconciliation>;
};

export type ClosingsServiceDependencies = {
  closings: DailyClosingRepository;
  reconciliations: ReconciliationRepository;
  movements: AccountMovementRepository;
  masters: MasterRepository;
  periods: AccountingPeriodRepository;
  journal: Pick<JournalService, 'postEntry'>;
  authorize: Authorizer;
  audit: AuditRecorder;
  createId: () => string;
  adjustmentLedgerAccounts: { shortfall: string; surplus: string };
};

export class ClosingsService {
  constructor(private readonly dependencies: ClosingsServiceDependencies) {}

  async registerDailyClosing(ctx: CommandContext, command: RegisterDailyClosingCommand): Promise<Result<DailyClosing>> {
    const authorized = await this.dependencies.authorize(ctx, 'RECONCILE_ACCOUNT');
    if (!authorized.ok) return authorized;

    const previous = await this.dependencies.closings.findByAccountAndDate(command.accountId, command.closingDate);
    if (previous) {
      return {
        ok: false,
        error: domainError('DUPLICATE_CLOSING', 'Ya existe un cierre para esa cuenta y fecha.', true, {
          accountId: command.accountId,
          closingDate: command.closingDate,
        }),
      };
    }

    const account = await this.dependencies.masters.findById('ACCOUNT', command.accountId);
    if (!account || account.entityType !== 'ACCOUNT') {
      return {
        ok: false,
        error: domainError('MASTER_NOT_FOUND', 'La cuenta no existe.', true, { id: command.accountId }),
      };
    }
    if (!account.isReconcilable) {
      return {
        ok: false,
        error: domainError('ACCOUNT_NOT_RECONCILABLE', 'La cuenta no es conciliable.', true, {
          accountId: account.id,
        }),
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
        error: domainError('PERIOD_CLOSED', 'No se puede cerrar en un periodo cerrado o en revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const movements = await this.dependencies.movements.findByAccount(account.id);
    const theoreticalMinor = movementNet(movements);
    const realMinor = toMinor(command.realBalance);

    const closing: DailyClosing = {
      id: this.dependencies.createId(),
      accountId: account.id,
      closingDate: command.closingDate,
      realBalance: command.realBalance,
      status: 'CONFIRMADO',
      createdBy: ctx.actorUserId,
      createdAt: ctx.now,
    };

    await this.dependencies.closings.save(closing);

    if (theoreticalMinor !== realMinor) {
      const theoretical = minorToMoney(theoreticalMinor > 0n ? theoreticalMinor : 0n, command.realBalance.currency);
      const { difference, isShortfall } = computeDifference(theoretical, command.realBalance);

      const reconciliation: Reconciliation = {
        id: this.dependencies.createId(),
        accountId: account.id,
        periodId: period.id,
        asOf: command.closingDate,
        theoreticalBalance: theoretical,
        realBalance: command.realBalance,
        difference,
        isShortfall,
        status: 'PENDIENTE',
        resolutionNote: null,
        resolvedBy: null,
      };

      await this.dependencies.reconciliations.save(reconciliation);
    }

    await this.dependencies.audit.record({
      entityType: 'daily_closing',
      entityId: closing.id,
      action: 'CLOSING_CREATED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: closing };
  }

  async resolveDifference(ctx: CommandContext, command: ResolveDifferenceCommand): Promise<Result<Reconciliation>> {
    const authorized = await this.dependencies.authorize(ctx, 'RECONCILE_ACCOUNT');
    if (!authorized.ok) return authorized;

    if (command.reason.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REASON', 'La resolucion requiere un motivo.', true),
      };
    }

    const reconciliation = await this.dependencies.reconciliations.findById(command.reconciliationId);
    if (!reconciliation) {
      return {
        ok: false,
        error: domainError('RECONCILIATION_NOT_FOUND', 'La reconciliacion no existe.', true, {
          reconciliationId: command.reconciliationId,
        }),
      };
    }

    if (reconciliation.status !== 'PENDIENTE') {
      return {
        ok: false,
        error: domainError('RECONCILIATION_ALREADY_RESOLVED', 'La reconciliacion ya fue resuelta.', false, {
          reconciliationId: reconciliation.id,
          status: reconciliation.status,
        }),
      };
    }

    const period = await this.dependencies.periods.findById(reconciliation.periodId);
    if (!period) {
      return {
        ok: false,
        error: domainError('PERIOD_NOT_FOUND', 'El periodo contable no existe.', true, {
          periodId: reconciliation.periodId,
        }),
      };
    }
    if (!isPeriodOpen(period)) {
      return {
        ok: false,
        error: domainError('PERIOD_CLOSED', 'No se puede resolver en un periodo cerrado o en revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    if (command.resolution === 'AJUSTE') {
      const account = await this.dependencies.masters.findById('ACCOUNT', reconciliation.accountId);
      if (!account || account.entityType !== 'ACCOUNT') {
        return {
          ok: false,
          error: domainError('MASTER_NOT_FOUND', 'La cuenta no existe.', true, { id: reconciliation.accountId }),
        };
      }
      if (!account.isReconcilable || !isCurrentAt(account, ctx.now)) {
        return {
          ok: false,
          error: domainError('ACCOUNT_NOT_RECONCILABLE', 'La cuenta no es conciliable o no esta vigente.', true, {
            accountId: account.id,
          }),
        };
      }

      const zero: Money = { amount: '0.00', currency: reconciliation.difference.currency };
      const lines: JournalLineDraft[] = reconciliation.isShortfall
        ? [
            { ledgerAccountId: this.dependencies.adjustmentLedgerAccounts.shortfall, debit: reconciliation.difference, credit: zero },
            { ledgerAccountId: account.ledgerAccountId, debit: zero, credit: reconciliation.difference },
          ]
        : [
            { ledgerAccountId: account.ledgerAccountId, debit: reconciliation.difference, credit: zero },
            { ledgerAccountId: this.dependencies.adjustmentLedgerAccounts.surplus, debit: zero, credit: reconciliation.difference },
          ];

      const entryResult = await this.dependencies.journal.postEntry(ctx, {
        periodId: period.id,
        entryDate: reconciliation.asOf,
        sourceDocumentType: 'reconciliation_adjustment',
        sourceDocumentId: reconciliation.id,
        description: `Ajuste de conciliacion (${reconciliation.isShortfall ? 'faltante' : 'sobrante'})`,
        lines,
      });

      if (!entryResult.ok) return entryResult;

      await this.dependencies.movements.save({
        id: this.dependencies.createId(),
        accountId: account.id,
        effectiveDate: reconciliation.asOf,
        amount: reconciliation.difference,
        direction: reconciliation.isShortfall ? 'OUT' : 'IN',
        sourceDocumentType: 'reconciliation_adjustment',
        sourceDocumentId: reconciliation.id,
        journalEntryId: entryResult.value.id,
        idempotencyKey: ctx.idempotencyKey,
        createdAt: ctx.now,
      });
    }

    const resolved: Reconciliation = {
      ...reconciliation,
      status: 'RESUELTA',
      resolutionNote: command.reason.trim(),
      resolvedBy: ctx.actorUserId,
    };

    const saved = await this.dependencies.reconciliations.update(resolved);
    await this.dependencies.audit.record({
      entityType: 'reconciliation',
      entityId: saved.id,
      action: 'RECONCILIATION_RESOLVED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: command.reason.trim(),
    });

    return { ok: true, value: saved };
  }
}
