import { describe, expect, it } from 'vitest';
import { JournalService, type AccountingPeriodRepository, type JournalEntryRepository } from '../journal-service';
import type { AuditEventInput, AuditRecorder } from '../../domain/audit';
import type { JournalEntry, JournalLineDraft } from '../../domain/journal';
import type { AccountingPeriod } from '../../domain/periods';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;

const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'idem-1',
  now: '2026-10-13T12:00:00.000Z',
};

const lines: JournalLineDraft[] = [
  {
    ledgerAccountId: '1.1.1',
    debit: { amount: '1000.00', currency: 'ARS' },
    credit: { amount: '0.00', currency: 'ARS' },
  },
  {
    ledgerAccountId: '4.1.1',
    debit: { amount: '0.00', currency: 'ARS' },
    credit: { amount: '1000.00', currency: 'ARS' },
  },
];

const openPeriod: AccountingPeriod = {
  id: 'period-1',
  code: '2026-10',
  startsOn: '2026-10-01',
  endsOn: '2026-10-31',
  status: 'ABIERTO',
};

function createService(period: AccountingPeriod | null = openPeriod) {
  let currentPeriod = period;
  const savedEntries: JournalEntry[] = [];
  const auditEvents: AuditEventInput[] = [];
  const periods: AccountingPeriodRepository = {
    async findById() {
      return currentPeriod;
    },
    async findAll() {
      return [];
    },
  };
  const entries: JournalEntryRepository = {
    async findByIdempotencyKey(idempotencyKey) {
      return savedEntries.find(entry => entry.idempotencyKey === idempotencyKey) ?? null;
    },
    async findById(entryId) {
      return savedEntries.find(entry => entry.id === entryId) ?? null;
    },
    async findReversalForEntry(entryId) {
      return savedEntries.find(entry => entry.reversesEntryId === entryId) ?? null;
    },
    async save(entry) {
      savedEntries.push(entry);
      return entry;
    },
    async markReversed(entryId, reversedAt) {
      const entry = savedEntries.find(savedEntry => savedEntry.id === entryId);
      if (entry) entry.reversedAt = reversedAt;
    },
  };
  const audit: AuditRecorder = {
    async record(event) {
      auditEvents.push(event);
    },
  };

  return {
    service: new JournalService({ periods, entries, createId: () => `entry-${savedEntries.length + 1}`, audit }),
    savedEntries,
    auditEvents,
    setPeriod(nextPeriod: AccountingPeriod | null) {
      currentPeriod = nextPeriod;
    },
  };
}

describe('JournalService.postEntry', () => {
  it('postea un asiento balanceado en periodo abierto', async () => {
    const { service, savedEntries } = createService();

    const result = await service.postEntry(ctx, {
      periodId: openPeriod.id,
      entryDate: '2026-10-13',
      sourceDocumentType: 'income_record',
      sourceDocumentId: 'income-1',
      description: 'Ingreso diario',
      lines,
    });

    expect(result.ok).toBe(true);
    expect(savedEntries).toHaveLength(1);
    if (result.ok) {
      expect(result.value.status).toBe('CONFIRMADO');
      expect(result.value.periodId).toBe(openPeriod.id);
      expect(result.value.idempotencyKey).toBe(ctx.idempotencyKey);
    }
  });

  it('rechaza un asiento desbalanceado', async () => {
    const { service, savedEntries } = createService();

    const result = await service.postEntry(ctx, {
      periodId: openPeriod.id,
      entryDate: '2026-10-13',
      sourceDocumentType: 'income_record',
      sourceDocumentId: 'income-1',
      description: 'Ingreso diario',
      lines: [lines[0], { ...lines[1], credit: { amount: '999.99', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(false);
    expect(savedEntries).toHaveLength(0);
    if (!result.ok) expect(result.error.code).toBe('ENTRY_UNBALANCED');
  });

  it('rechaza posteo en periodo cerrado', async () => {
    const { service, savedEntries } = createService({ ...openPeriod, status: 'CERRADO' });

    const result = await service.postEntry(ctx, {
      periodId: openPeriod.id,
      entryDate: '2026-10-13',
      sourceDocumentType: 'income_record',
      sourceDocumentId: 'income-1',
      description: 'Ingreso diario',
      lines,
    });

    expect(result.ok).toBe(false);
    expect(savedEntries).toHaveLength(0);
    if (!result.ok) expect(result.error.code).toBe('PERIOD_CLOSED');
  });

  it('reintento con misma idempotencyKey devuelve el asiento previo y no duplica', async () => {
    const { service, savedEntries } = createService();
    const command = {
      periodId: openPeriod.id,
      entryDate: '2026-10-13',
      sourceDocumentType: 'income_record',
      sourceDocumentId: 'income-1',
      description: 'Ingreso diario',
      lines,
    };

    const firstResult = await service.postEntry(ctx, command);
    const secondResult = await service.postEntry(ctx, command);

    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);
    expect(savedEntries).toHaveLength(1);
    if (firstResult.ok && secondResult.ok) expect(secondResult.value).toEqual(firstResult.value);
  });

  it('rechaza periodo inexistente', async () => {
    const { service, savedEntries } = createService(null);

    const result = await service.postEntry(ctx, {
      periodId: 'missing-period',
      entryDate: '2026-10-13',
      sourceDocumentType: 'income_record',
      sourceDocumentId: 'income-1',
      description: 'Ingreso diario',
      lines,
    });

    expect(result.ok).toBe(false);
    expect(savedEntries).toHaveLength(0);
    if (!result.ok) expect(result.error.code).toBe('PERIOD_NOT_FOUND');
  });

  it('revierte un asiento creando un asiento inverso', async () => {
    const { service, savedEntries } = createService();
    const postResult = await service.postEntry(ctx, {
      periodId: openPeriod.id,
      entryDate: '2026-10-13',
      sourceDocumentType: 'income_record',
      sourceDocumentId: 'income-1',
      description: 'Ingreso diario',
      lines,
    });

    expect(postResult.ok).toBe(true);
    if (!postResult.ok) return;

    const reversalResult = await service.reverseEntry(
      { ...ctx, idempotencyKey: 'reverse-1', now: '2026-10-14T12:00:00.000Z' },
      {
        originalEntryId: postResult.value.id,
        periodId: openPeriod.id,
        entryDate: '2026-10-14',
        reason: 'Correccion operativa',
      }
    );

    expect(reversalResult.ok).toBe(true);
    expect(savedEntries).toHaveLength(2);
    if (reversalResult.ok) {
      expect(reversalResult.value.reversesEntryId).toBe(postResult.value.id);
      expect(reversalResult.value.lines[0].debit).toEqual(postResult.value.lines[0].credit);
      expect(reversalResult.value.lines[0].credit).toEqual(postResult.value.lines[0].debit);
    }
  });

  it('conserva las lineas e importes del asiento original al revertir', async () => {
    const { service, savedEntries } = createService();
    const postResult = await service.postEntry(ctx, {
      periodId: openPeriod.id,
      entryDate: '2026-10-13',
      sourceDocumentType: 'income_record',
      sourceDocumentId: 'income-1',
      description: 'Ingreso diario',
      lines,
    });

    expect(postResult.ok).toBe(true);
    if (!postResult.ok) return;

    const originalLines = structuredClone(postResult.value.lines);

    await service.reverseEntry(
      { ...ctx, idempotencyKey: 'reverse-1' },
      {
        originalEntryId: postResult.value.id,
        periodId: openPeriod.id,
        entryDate: '2026-10-14',
        reason: 'Correccion operativa',
      }
    );

    expect(savedEntries[0].lines).toEqual(originalLines);
    expect(savedEntries[0].reversedAt).toBe(ctx.now);
  });

  it('rechaza una segunda reversion del mismo asiento', async () => {
    const { service } = createService();
    const postResult = await service.postEntry(ctx, {
      periodId: openPeriod.id,
      entryDate: '2026-10-13',
      sourceDocumentType: 'income_record',
      sourceDocumentId: 'income-1',
      description: 'Ingreso diario',
      lines,
    });

    expect(postResult.ok).toBe(true);
    if (!postResult.ok) return;

    const reversalCommand = {
      originalEntryId: postResult.value.id,
      periodId: openPeriod.id,
      entryDate: '2026-10-14',
      reason: 'Correccion operativa',
    };

    await service.reverseEntry({ ...ctx, idempotencyKey: 'reverse-1' }, reversalCommand);
    const secondReversal = await service.reverseEntry({ ...ctx, idempotencyKey: 'reverse-2' }, reversalCommand);

    expect(secondReversal.ok).toBe(false);
    if (!secondReversal.ok) expect(secondReversal.error.code).toBe('REVERSAL_ALREADY_EXISTS');
  });

  it('rechaza una reversion sin motivo', async () => {
    const { service } = createService();

    const result = await service.reverseEntry(ctx, {
      originalEntryId: 'entry-1',
      periodId: openPeriod.id,
      entryDate: '2026-10-14',
      reason: '   ',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MISSING_REASON');
  });

  it('rechaza la reversion de un asiento inexistente', async () => {
    const { service } = createService();

    const result = await service.reverseEntry(ctx, {
      originalEntryId: 'missing-entry',
      periodId: openPeriod.id,
      entryDate: '2026-10-14',
      reason: 'Correccion operativa',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ENTRY_NOT_FOUND');
  });

  it('rechaza la reversion en periodo cerrado', async () => {
    const { service, setPeriod } = createService();
    const postResult = await service.postEntry(ctx, {
      periodId: openPeriod.id,
      entryDate: '2026-10-13',
      sourceDocumentType: 'income_record',
      sourceDocumentId: 'income-1',
      description: 'Ingreso diario',
      lines,
    });

    expect(postResult.ok).toBe(true);
    if (!postResult.ok) return;

    setPeriod({ ...openPeriod, status: 'CERRADO' });

    const result = await service.reverseEntry({ ...ctx, idempotencyKey: 'reverse-closed' }, {
      originalEntryId: postResult.value.id,
      periodId: openPeriod.id,
      entryDate: '2026-10-14',
      reason: 'Correccion operativa',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERIOD_CLOSED');
  });
});

describe('JournalService — auditoria e inmutabilidad', () => {
  it('registra un evento de auditoria al postear', async () => {
    const { service, auditEvents } = createService();

    await service.postEntry(ctx, {
      periodId: openPeriod.id,
      entryDate: '2026-10-13',
      sourceDocumentType: 'income_record',
      sourceDocumentId: 'income-1',
      description: 'Ingreso diario',
      lines,
    });

    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0].action).toBe('JOURNAL_ENTRY_POSTED');
    expect(auditEvents[0].entityType).toBe('journal_entry');
  });

  it('registra un evento de auditoria con motivo al revertir', async () => {
    const { service, auditEvents } = createService();

    const postResult = await service.postEntry(ctx, {
      periodId: openPeriod.id,
      entryDate: '2026-10-13',
      sourceDocumentType: 'income_record',
      sourceDocumentId: 'income-1',
      description: 'Ingreso diario',
      lines,
    });

    expect(postResult.ok).toBe(true);
    if (!postResult.ok) return;

    await service.reverseEntry({ ...ctx, idempotencyKey: 'reverse-1' }, {
      originalEntryId: postResult.value.id,
      periodId: openPeriod.id,
      entryDate: '2026-10-14',
      reason: 'Correccion operativa',
    });

    const reversalEvent = auditEvents.find(e => e.action === 'JOURNAL_ENTRY_REVERSED');
    expect(reversalEvent).toBeDefined();
    expect(reversalEvent?.reason).toBe('Correccion operativa');
  });

  it('rechaza la actualizacion de un asiento confirmado', async () => {
    const { service } = createService();
    const result = await service.updateEntry(ctx, { entryId: 'entry-1', description: 'Editado' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ENTRY_IMMUTABLE');
  });

  it('rechaza la eliminacion de un asiento confirmado', async () => {
    const { service } = createService();
    const result = await service.deleteEntry(ctx, 'entry-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ENTRY_IMMUTABLE');
  });
});
