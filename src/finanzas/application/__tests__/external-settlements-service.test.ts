import { describe, expect, it } from 'vitest';
import {
  ExternalSettlementsService,
  type ExternalSettlementRepository,
} from '../external-settlements-service';
import { JournalService, type AccountingPeriodRepository, type JournalEntryRepository } from '../journal-service';
import type { Master, MasterRepository } from '../master-data-service';
import type { AccountMovementRepository } from '../../domain/account-movements';
import type { AccountMovement } from '../../domain/account-movements';
import type { ExternalSettlement } from '../../domain/external-settlements';
import type { JournalEntry } from '../../domain/journal';
import type { AccountingPeriod } from '../../domain/periods';
import type { Authorizer } from '../permission-service';
import type { AuditEventInput, AuditRecorder } from '../../domain/audit';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;
const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'ext-1',
  now: '2026-10-13T12:00:00.000Z',
};

const openPeriod: AccountingPeriod = {
  id: 'period-1',
  code: '2026-10',
  startsOn: '2026-10-01',
  endsOn: '2026-10-31',
  status: 'ABIERTO',
};

const masters: Master[] = [
  {
    id: 'rl-1',
    entityType: 'RESULT_LINE',
    code: 'RL-1',
    name: 'Insumos',
    nature: 'GASTO',
    order: 1,
    ledgerAccountId: '5.6',
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: ctx.now,
    createdBy: userId,
  },
  {
    id: 'acc-1',
    entityType: 'ACCOUNT',
    name: 'Efectivo',
    kind: 'EFECTIVO',
    ownership: 'PROPIA',
    financialInstitution: null,
    currency: 'ARS',
    ledgerAccountId: '1.1.1',
    isAvailable: true,
    isReconcilable: true,
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: ctx.now,
    createdBy: userId,
  },
];

function createService(options?: { authorize?: Authorizer }) {
  let nextId = 0;
  const createId = () => `id-${++nextId}`;

  const savedSettlements: ExternalSettlement[] = [];
  const savedMovements: AccountMovement[] = [];
  const savedEntries: JournalEntry[] = [];
  const auditEvents: AuditEventInput[] = [];

  const settlements: ExternalSettlementRepository = {
    async findByIdempotencyKey(key) {
      return savedSettlements.find(s => s.idempotencyKey === key) ?? null;
    },
    async findById(id) {
      return savedSettlements.find(s => s.id === id) ?? null;
    },
    async save(settlement) {
      savedSettlements.push(settlement);
      return settlement;
    },
    async update(settlement) {
      const index = savedSettlements.findIndex(s => s.id === settlement.id);
      if (index >= 0) savedSettlements[index] = settlement;
      return settlement;
    },
  };

  const movements: AccountMovementRepository = {
    async findByAccount(accountId) {
      return savedMovements.filter(m => m.accountId === accountId);
    },
    async save(movement) {
      savedMovements.push(movement);
      return movement;
    },
  };

  const masterRepository: MasterRepository = {
    async findById(entityType, id) {
      return masters.find(m => m.entityType === entityType && m.id === id) ?? null;
    },
    async findByCode(entityType, code) {
      return masters.find(m => m.entityType === entityType && 'code' in m && m.code === code) ?? null;
    },
    async findAll(entityType) {
      return masters.filter(m => m.entityType === entityType);
    },
    async save(master) {
      masters.push(master);
      return master;
    },
  };

  const periods: AccountingPeriodRepository = {
    async findById() {
      return openPeriod;
    },
  };

  const entriesRepo: JournalEntryRepository = {
    async findByIdempotencyKey(key) {
      return savedEntries.find(e => e.idempotencyKey === key) ?? null;
    },
    async findById(id) {
      return savedEntries.find(e => e.id === id) ?? null;
    },
    async findReversalForEntry(id) {
      return savedEntries.find(e => e.reversesEntryId === id) ?? null;
    },
    async save(entry) {
      savedEntries.push(entry);
      return entry;
    },
    async markReversed() {},
  };

  const journal = new JournalService({ periods, entries: entriesRepo, audit: { record: async () => {} }, createId });

  const authorize: Authorizer = options?.authorize ?? (async () => ({ ok: true, value: undefined }));
  const audit: AuditRecorder = {
    async record(event) {
      auditEvents.push(event);
    },
  };

  return {
    service: new ExternalSettlementsService({
      settlements,
      movements,
      masters: masterRepository,
      periods,
      journal,
      authorize,
      audit,
      createId,
      settlementLedgerAccounts: { PRESTAMO: '2.3', CUENTA_CORRIENTE: '2.3', APORTE: '3.1' },
    }),
    savedSettlements,
    savedMovements,
    savedEntries,
    auditEvents,
  };
}

describe('ExternalSettlementsService.registerExternalPayment', () => {
  it('registra PRESTAMO con asiento Db 5.6 / Hr 2.3 sin movimiento propio', async () => {
    const { service, savedMovements, savedEntries } = createService();

    const result = await service.registerExternalPayment(ctx, {
      sourcePersonId: 'person-1',
      resultLineId: 'rl-1',
      concept: 'Insumos pagados por MARI',
      amount: { amount: '500.00', currency: 'ARS' },
      nature: 'PRESTAMO',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(savedMovements).toHaveLength(0);
    expect(savedEntries).toHaveLength(1);
    expect(savedEntries[0].lines[0].ledgerAccountId).toBe('5.6');
    expect(savedEntries[0].lines[1].ledgerAccountId).toBe('2.3');
  });

  it('registra APORTE con asiento Db 5.6 / Hr 3.1', async () => {
    const { service, savedEntries } = createService();

    const result = await service.registerExternalPayment(ctx, {
      sourcePersonId: 'person-1',
      resultLineId: 'rl-1',
      concept: 'Insumos',
      amount: { amount: '500.00', currency: 'ARS' },
      nature: 'APORTE',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(true);
    expect(savedEntries[0].lines[1].ledgerAccountId).toBe('3.1');
  });

  it('rechaza naturaleza invalida', async () => {
    const { service } = createService();

    const result = await service.registerExternalPayment(ctx, {
      sourcePersonId: 'person-1',
      resultLineId: 'rl-1',
      concept: 'Insumos',
      amount: { amount: '500.00', currency: 'ARS' },
      nature: 'INVALIDA' as never,
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('EXTERNAL_NATURE_UNDEFINED');
  });
});

describe('ExternalSettlementsService.registerReimbursement', () => {
  it('reintegra con asiento Db 2.3 / Hr 1.1.1 y movimiento OUT', async () => {
    const { service, savedSettlements, savedMovements, savedEntries } = createService();

    const created = await service.registerExternalPayment(ctx, {
      sourcePersonId: 'person-1',
      resultLineId: 'rl-1',
      concept: 'Insumos',
      amount: { amount: '500.00', currency: 'ARS' },
      nature: 'PRESTAMO',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await service.registerReimbursement(
      { ...ctx, idempotencyKey: 'reim-1' },
      {
        settlementId: created.value.id,
        accountId: 'acc-1',
        effectiveDate: '2026-10-14',
        periodId: 'period-1',
        amount: { amount: '500.00', currency: 'ARS' },
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('REINTEGRADO');
    expect(savedSettlements[0].status).toBe('REINTEGRADO');

    const reimbursementEntry = savedEntries.find(e => e.sourceDocumentType === 'external_settlement_reimbursement');
    expect(reimbursementEntry?.lines[0].ledgerAccountId).toBe('2.3');
    expect(reimbursementEntry?.lines[1].ledgerAccountId).toBe('1.1.1');

    expect(savedMovements).toHaveLength(1);
    expect(savedMovements[0].direction).toBe('OUT');
  });

  it('rechaza reintegrar un settlement ya reintegrado', async () => {
    const { service } = createService();

    const created = await service.registerExternalPayment(ctx, {
      sourcePersonId: 'person-1',
      resultLineId: 'rl-1',
      concept: 'Insumos',
      amount: { amount: '500.00', currency: 'ARS' },
      nature: 'PRESTAMO',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const reintegroCommand = {
      settlementId: created.value.id,
      accountId: 'acc-1',
      effectiveDate: '2026-10-14',
      periodId: 'period-1',
      amount: { amount: '500.00', currency: 'ARS' as const },
    };

    await service.registerReimbursement({ ...ctx, idempotencyKey: 'reim-1' }, reintegroCommand);
    const second = await service.registerReimbursement({ ...ctx, idempotencyKey: 'reim-2' }, reintegroCommand);

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe('SETTLEMENT_ALREADY_REINTEGRADO');
  });

  it('rechaza sin permiso', async () => {
    const denied: Authorizer = async () => ({
      ok: false,
      error: { code: 'PERMISSION_DENIED', message: 'No tenes permiso.', recoverable: false },
    });
    const { service } = createService({ authorize: denied });

    const result = await service.registerExternalPayment(ctx, {
      sourcePersonId: 'person-1',
      resultLineId: 'rl-1',
      concept: 'Insumos',
      amount: { amount: '500.00', currency: 'ARS' },
      nature: 'PRESTAMO',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});
