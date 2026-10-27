import type { AuditRecorder } from '../domain/audit';
import { depreciatesInMonth, monthlyDepreciation, type CapexConfig } from '../domain/depreciation';
import { domainError } from '../domain/errors';
import type { JournalEntry, JournalLineDraft } from '../domain/journal';
import { isPeriodOpen } from '../domain/periods';
import type { AccountingPeriodRepository, JournalEntryRepository, JournalService } from './journal-service';
import type { InvestmentRepository } from './investments-service';
import type { CommandContext, Result } from '../domain/types';

export type PostDepreciationCommand = {
  periodId: string;
};

export type DepreciationServiceDependencies = {
  investments: Pick<InvestmentRepository, 'findAllCapitalized'>;
  periods: AccountingPeriodRepository;
  journal: Pick<JournalService, 'postEntry'>;
  entries: Pick<JournalEntryRepository, 'findBySourceDocument'>;
  capex: CapexConfig;
  audit: AuditRecorder;
  createId: () => string;
};

/**
 * Postea la depreciación lineal de los activos capitalizados para un período.
 * Idempotente: un solo asiento `depreciation` por período (source_document_id =
 * periodId). Si no hay activos en ventana de depreciación, no postea nada.
 */
export class DepreciationService {
  constructor(private readonly dependencies: DepreciationServiceDependencies) {}

  async postDepreciation(ctx: CommandContext, command: PostDepreciationCommand): Promise<Result<JournalEntry | null>> {
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
        error: domainError('PERIOD_CLOSED', 'No se puede depreciar en un periodo cerrado o en revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    // idempotencia: un asiento de depreciación por período.
    const existing = await this.dependencies.entries.findBySourceDocument('depreciation', period.id);
    if (existing) {
      return { ok: true, value: existing };
    }

    const assets = await this.dependencies.investments.findAllCapitalized();
    const month = period.startsOn.slice(0, 7);

    const lines: JournalLineDraft[] = [];
    for (const asset of assets) {
      const usefulLife = asset.usefulLifeMonths ?? this.dependencies.capex.usefulLifeMonths;
      if (!asset.paidAt || !depreciatesInMonth(asset.paidAt, usefulLife, month)) continue;

      const monthly = monthlyDepreciation(asset.amount, usefulLife, this.dependencies.capex.residual);
      const zero = { amount: '0.00', currency: monthly.currency };
      lines.push(
        { ledgerAccountId: this.dependencies.capex.depreciationExpenseLedgerAccountId, debit: monthly, credit: zero },
        { ledgerAccountId: this.dependencies.capex.accumulatedDepreciationLedgerAccountId, debit: zero, credit: monthly }
      );
    }

    if (lines.length === 0) {
      return { ok: true, value: null };
    }

    const entryResult = await this.dependencies.journal.postEntry(ctx, {
      periodId: period.id,
      entryDate: period.startsOn,
      sourceDocumentType: 'depreciation',
      sourceDocumentId: period.id,
      description: `Depreciación ${period.code}`,
      lines,
    });

    if (!entryResult.ok) return entryResult;

    await this.dependencies.audit.record({
      entityType: 'depreciation',
      entityId: entryResult.value.id,
      action: 'DEPRECIATION_POSTED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: entryResult.value };
  }
}
