import { describe, expect, it } from 'vitest';
import { DepreciationService } from '../depreciation-service';
import { JournalService, type AccountingPeriodRepository, type JournalEntryRepository } from '../journal-service';
import type { Investment } from '../../domain/investments';
import type { JournalEntry } from '../../domain/journal';
import type { AccountingPeriod } from '../../domain/periods';
import type { CommandContext, UserId } from '../../domain/types';
import type { AuditEventInput } from '../../domain/audit';

const userId = 'user-1' as UserId;
const ctx: CommandContext = { actorUserId: userId, idempotencyKey: 'dep-1', now: '2026-10-13T12:00:00.000Z' };

const capex = {
  threshold: { amount: '1000.00', currency: 'ARS' as const },
  usefulLifeMonths: 60,
  residual: { amount: '0.00', currency: 'ARS' as const },
  capitalizeLedgerAccountId: '1.3',
  expenseLedgerAccountId: '5.11',
  accumulatedDepreciationLedgerAccountId: '1.3.9',
  depreciationExpenseLedgerAccountId: '5.9',
};

function makeAsset(paidAt: string): Investment {
  return {
    id: 'inv-1',
    concept: 'Equipamiento',
    amount: { amount: '1200.00', currency: 'ARS' },
    tentativeDate: '2026-01-01',
    status: 'PAGADA',
    decisionNote: null,
    createdBy: userId,
    createdAt: '2026-01-01T00:00:00Z',
    paidAt,
    capitalized: true,
    usefulLifeMonths: 60,
  };
}

function createService(assets: Investment[], period: AccountingPeriod) {
  const savedEntries: JournalEntry[] = [];
  const auditEvents: AuditEventInput[] = [];
  let nextId = 0;
  const createId = () => `id-${++nextId}`;

  const investments = { findAllCapitalized: async () => assets };

  const periods: AccountingPeriodRepository = {
    findById: async () => period,
    findAll: async () => [],
  };

  const entriesRepo: JournalEntryRepository = {
    findByIdempotencyKey: async (key) => savedEntries.find((e) => e.idempotencyKey === key) ?? null,
    findById: async (id) => savedEntries.find((e) => e.id === id) ?? null,
    findReversalForEntry: async (id) => savedEntries.find((e) => e.reversesEntryId === id) ?? null,
    findBySourceDocument: async (type, id) =>
      savedEntries.find((e) => e.sourceDocumentType === type && e.sourceDocumentId === id) ?? null,
    save: async (entry) => {
      savedEntries.push(entry);
      return entry;
    },
    markReversed: async () => {},
  };

  const journal = new JournalService({ periods, entries: entriesRepo, audit: { record: async () => {} }, createId });
  const audit = { record: async (event: AuditEventInput) => { auditEvents.push(event); } };

  const service = new DepreciationService({
    investments,
    periods,
    journal,
    entries: entriesRepo,
    capex,
    audit,
    createId,
  });

  return { service, savedEntries, auditEvents };
}

const febPeriod: AccountingPeriod = {
  id: 'period-1',
  code: '2026-02',
  startsOn: '2026-02-01',
  endsOn: '2026-02-28',
  status: 'ABIERTO',
};

describe('DepreciationService.postDepreciation', () => {
  it('postea la cuota del mes con asiento Db 5.9 / Hr 1.3.9', async () => {
    const { service, savedEntries, auditEvents } = createService([makeAsset('2026-01-15')], febPeriod);

    const result = await service.postDepreciation(ctx, { periodId: 'period-1' });

    expect(result.ok).toBe(true);
    if (!result.ok || result.value === null) throw new Error('esperaba asiento');
    expect(savedEntries).toHaveLength(1);
    expect(savedEntries[0].lines[0].ledgerAccountId).toBe('5.9');
    expect(savedEntries[0].lines[0].debit.amount).toBe('20.00');
    expect(savedEntries[0].lines[1].ledgerAccountId).toBe('1.3.9');
    expect(auditEvents[0].action).toBe('DEPRECIATION_POSTED');
  });

  it('es idempotente por período', async () => {
    const { service, savedEntries } = createService([makeAsset('2026-01-15')], febPeriod);

    await service.postDepreciation(ctx, { periodId: 'period-1' });
    await service.postDepreciation({ ...ctx, idempotencyKey: 'dep-2' }, { periodId: 'period-1' });

    expect(savedEntries).toHaveLength(1);
  });

  it('no postea en el mes de pago (fuera de ventana)', async () => {
    const janPeriod: AccountingPeriod = {
      id: 'period-1',
      code: '2026-01',
      startsOn: '2026-01-01',
      endsOn: '2026-01-31',
      status: 'ABIERTO',
    };
    const { service, savedEntries } = createService([makeAsset('2026-01-15')], janPeriod);

    const result = await service.postDepreciation(ctx, { periodId: 'period-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('esperaba ok');
    expect(result.value).toBeNull();
    expect(savedEntries).toHaveLength(0);
  });
});
