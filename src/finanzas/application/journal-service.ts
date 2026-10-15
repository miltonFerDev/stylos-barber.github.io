import type { AuditRecorder } from '../domain/audit';
import { domainError } from '../domain/errors';
import {
  createReversalDraft,
  validateBalancedEntry,
  type JournalEntry,
  type JournalLineDraft,
} from '../domain/journal';
import { isPeriodOpen, type AccountingPeriod } from '../domain/periods';
import type { CommandContext, Result } from '../domain/types';

export type PostJournalEntryCommand = {
  periodId: string;
  entryDate: string;
  sourceDocumentType: string;
  sourceDocumentId: string;
  description: string;
  lines: JournalLineDraft[];
};

export type ReverseJournalEntryCommand = {
  originalEntryId: string;
  periodId: string;
  entryDate: string;
  reason: string;
};

export type UpdateJournalEntryCommand = {
  entryId: string;
  description?: string;
  lines?: JournalLineDraft[];
};

export type AccountingPeriodRepository = {
  findById(periodId: string): Promise<AccountingPeriod | null>;
};

export type JournalEntryRepository = {
  findByIdempotencyKey(idempotencyKey: string): Promise<JournalEntry | null>;
  findById(entryId: string): Promise<JournalEntry | null>;
  findReversalForEntry(entryId: string): Promise<JournalEntry | null>;
  save(entry: JournalEntry): Promise<JournalEntry>;
  markReversed(entryId: string, reversedAt: string): Promise<void>;
};

export type JournalServiceDependencies = {
  periods: AccountingPeriodRepository;
  entries: JournalEntryRepository;
  createId: () => string;
  audit: AuditRecorder;
};

export class JournalService {
  constructor(private readonly dependencies: JournalServiceDependencies) {}

  async postEntry(ctx: CommandContext, command: PostJournalEntryCommand): Promise<Result<JournalEntry>> {
    const previousEntry = await this.dependencies.entries.findByIdempotencyKey(ctx.idempotencyKey);

    if (previousEntry) {
      return { ok: true, value: previousEntry };
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
        error: domainError('PERIOD_CLOSED', 'No se puede postear en un periodo contable cerrado o en revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const draft = {
      description: command.description,
      lines: command.lines,
    };
    const balancedEntry = validateBalancedEntry(draft);

    if (!balancedEntry.ok) {
      return balancedEntry;
    }

    const entry: JournalEntry = {
      ...balancedEntry.value,
      id: this.dependencies.createId(),
      periodId: period.id,
      entryDate: command.entryDate,
      postingDate: ctx.now,
      status: 'CONFIRMADO',
      sourceDocumentType: command.sourceDocumentType,
      sourceDocumentId: command.sourceDocumentId,
      idempotencyKey: ctx.idempotencyKey,
      createdBy: ctx.actorUserId,
      createdAt: ctx.now,
    };

    const savedEntry = await this.dependencies.entries.save(entry);
    await this.dependencies.audit.record({
      entityType: 'journal_entry',
      entityId: savedEntry.id,
      action: 'JOURNAL_ENTRY_POSTED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: savedEntry };
  }

  async reverseEntry(ctx: CommandContext, command: ReverseJournalEntryCommand): Promise<Result<JournalEntry>> {
    const previousEntry = await this.dependencies.entries.findByIdempotencyKey(ctx.idempotencyKey);

    if (previousEntry) {
      return { ok: true, value: previousEntry };
    }

    if (command.reason.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REASON', 'La reversion requiere un motivo.', true),
      };
    }

    const originalEntry = await this.dependencies.entries.findById(command.originalEntryId);

    if (!originalEntry) {
      return {
        ok: false,
        error: domainError('ENTRY_NOT_FOUND', 'El asiento original no existe.', true, {
          entryId: command.originalEntryId,
        }),
      };
    }

    const existingReversal = await this.dependencies.entries.findReversalForEntry(originalEntry.id);

    if (existingReversal) {
      return {
        ok: false,
        error: domainError('REVERSAL_ALREADY_EXISTS', 'El asiento ya tiene una reversion registrada.', false, {
          entryId: originalEntry.id,
          reversalEntryId: existingReversal.id,
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
        error: domainError('PERIOD_CLOSED', 'No se puede revertir en un periodo contable cerrado o en revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const reversalDraft = createReversalDraft(originalEntry, command.reason.trim());
    const balancedEntry = validateBalancedEntry(reversalDraft);

    if (!balancedEntry.ok) {
      return balancedEntry;
    }

    const reversalEntry: JournalEntry = {
      ...balancedEntry.value,
      id: this.dependencies.createId(),
      periodId: period.id,
      entryDate: command.entryDate,
      postingDate: ctx.now,
      status: 'CONFIRMADO',
      sourceDocumentType: 'journal_entry_reversal',
      sourceDocumentId: originalEntry.id,
      idempotencyKey: ctx.idempotencyKey,
      createdBy: ctx.actorUserId,
      createdAt: ctx.now,
      reversesEntryId: originalEntry.id,
    };

    const savedReversal = await this.dependencies.entries.save(reversalEntry);
    await this.dependencies.entries.markReversed(originalEntry.id, ctx.now);
    await this.dependencies.audit.record({
      entityType: 'journal_entry',
      entityId: savedReversal.id,
      action: 'JOURNAL_ENTRY_REVERSED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: command.reason.trim(),
    });

    return { ok: true, value: savedReversal };
  }

  async updateEntry(_ctx: CommandContext, command: UpdateJournalEntryCommand): Promise<Result<JournalEntry>> {
    return {
      ok: false,
      error: domainError('ENTRY_IMMUTABLE', 'Los asientos confirmados son inmutables; usa la reversion para corregir.', false, {
        entryId: command.entryId,
      }),
    };
  }

  async deleteEntry(_ctx: CommandContext, entryId: string): Promise<Result<JournalEntry>> {
    return {
      ok: false,
      error: domainError('ENTRY_IMMUTABLE', 'Los asientos confirmados no se pueden eliminar; usa la reversion para corregir.', false, {
        entryId,
      }),
    };
  }
}
