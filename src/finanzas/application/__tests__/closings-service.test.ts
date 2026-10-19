import { describe, expect, it } from 'vitest';
import {
  ClosingsService,
  type DailyClosingRepository,
  type ReconciliationRepository,
} from '../closings-service';
import { JournalService, type AccountingPeriodRepository, type JournalEntryRepository } from '../journal-service';
import type { Master, MasterRepository } from '../master-data-service';
import type { AccountMovementRepository } from '../../domain/account-movements';
import type { AccountMovement } from '../../domain/account-movements';
import type { DailyClosing, Reconciliation } from '../../domain/closings';
import type { JournalEntry } from '../../domain/journal';
import type { AccountingPeriod } from '../../domain/periods';
import type { Authorizer } from '../permission-service';
import type { AuditEventInput, AuditRecorder } from '../../domain/audit';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;
const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'clo-1',
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
  {
    id: 'acc-nonrecon',
    entityType: 'ACCOUNT',
    name: 'Cuenta no conciliable',
    kind: 'BILLETERA',
    ownership: 'PROPIA',
    financialInstitution: null,
    currency: 'ARS',
    ledgerAccountId: '1.1.3',
    isAvailable: true,
    isReconcilable: false,
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: ctx.now,
    createdBy: userId,
  },
];

function movement(direction: 'IN' | 'OUT', amount: string): AccountMovement {
  return {
    id: `m-${direction}-${amount}`,
    accountId: 'acc-1',
    effectiveDate: '2026-10-13',
    amount: { amount, currency: 'ARS' },
    direction,
    sourceDocumentType: 'test',
    sourceDocumentId: 't-1',
    journalEntryId: 'e-1',
    idempotencyKey: 'idem',
    createdAt: ctx.now,
  };
}

function createService(options?: { movementsSeed?: AccountMovement[]; authorize?: Authorizer }) {
  let nextId = 0;
  const createId = () => `id-${++nextId}`;

  const savedMovements: AccountMovement[] = options?.movementsSeed ?? [];
  const savedClosings: DailyClosing[] = [];
  const savedReconciliations: Reconciliation[] = [];
  const savedEntries: JournalEntry[] = [];
  const auditEvents: AuditEventInput[] = [];

  const closings: DailyClosingRepository = {
    async findByAccountAndDate(accountId, closingDate) {
      return savedClosings.find(c => c.accountId === accountId && c.closingDate === closingDate) ?? null;
    },
    async save(closing) {
      savedClosings.push(closing);
      return closing;
    },
  };

  const reconciliations: ReconciliationRepository = {
    async findById(id) {
      return savedReconciliations.find(r => r.id === id) ?? null;
    },
    async save(reconciliation) {
      savedReconciliations.push(reconciliation);
      return reconciliation;
    },
    async update(reconciliation) {
      const index = savedReconciliations.findIndex(r => r.id === reconciliation.id);
      if (index >= 0) savedReconciliations[index] = reconciliation;
      return reconciliation;
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
    async findAll() {
      return [];
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
    service: new ClosingsService({
      closings,
      reconciliations,
      movements,
      masters: masterRepository,
      periods,
      journal,
      authorize,
      audit,
      createId,
      adjustmentLedgerAccounts: { shortfall: '5.10', surplus: '4.3' },
    }),
    savedClosings,
    savedReconciliations,
    savedMovements,
    savedEntries,
    auditEvents,
  };
}

describe('ClosingsService.registerDailyClosing', () => {
  it('cierra sin diferencia y no crea reconciliacion', async () => {
    const { service, savedClosings, savedReconciliations } = createService({
      movementsSeed: [movement('IN', '1000.00')],
    });

    const result = await service.registerDailyClosing(ctx, {
      accountId: 'acc-1',
      closingDate: '2026-10-13',
      periodId: 'period-1',
      realBalance: { amount: '1000.00', currency: 'ARS' },
    });

    expect(result.ok).toBe(true);
    expect(savedClosings).toHaveLength(1);
    expect(savedReconciliations).toHaveLength(0);
  });

  it('cierra con faltante y crea reconciliacion PENDIENTE', async () => {
    const { service, savedReconciliations } = createService({
      movementsSeed: [movement('IN', '1200.00')],
    });

    const result = await service.registerDailyClosing(ctx, {
      accountId: 'acc-1',
      closingDate: '2026-10-13',
      periodId: 'period-1',
      realBalance: { amount: '1000.00', currency: 'ARS' },
    });

    expect(result.ok).toBe(true);
    expect(savedReconciliations).toHaveLength(1);
    expect(savedReconciliations[0].status).toBe('PENDIENTE');
    expect(savedReconciliations[0].isShortfall).toBe(true);
    expect(savedReconciliations[0].difference).toEqual({ amount: '200.00', currency: 'ARS' });
  });

  it('rechaza cuenta no conciliable', async () => {
    const { service } = createService();

    const result = await service.registerDailyClosing(ctx, {
      accountId: 'acc-nonrecon',
      closingDate: '2026-10-13',
      periodId: 'period-1',
      realBalance: { amount: '0.00', currency: 'ARS' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ACCOUNT_NOT_RECONCILABLE');
  });

  it('rechaza cierre duplicado', async () => {
    const { service } = createService({ movementsSeed: [movement('IN', '1000.00')] });

    const command = {
      accountId: 'acc-1',
      closingDate: '2026-10-13',
      periodId: 'period-1',
      realBalance: { amount: '1000.00', currency: 'ARS' as const },
    };

    const first = await service.registerDailyClosing(ctx, command);
    const second = await service.registerDailyClosing(ctx, command);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe('DUPLICATE_CLOSING');
  });
});

describe('ClosingsService.resolveDifference', () => {
  it('resuelve EXPLICADA sin asiento', async () => {
    const { service, savedReconciliations, savedEntries } = createService({
      movementsSeed: [movement('IN', '1200.00')],
    });

    await service.registerDailyClosing(ctx, {
      accountId: 'acc-1',
      closingDate: '2026-10-13',
      periodId: 'period-1',
      realBalance: { amount: '1000.00', currency: 'ARS' },
    });

    const reconciliationId = savedReconciliations[0].id;

    const result = await service.resolveDifference(ctx, {
      reconciliationId,
      resolution: 'EXPLICADA',
      reason: 'Diferencia por error de conteo',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('RESUELTA');
    expect(savedEntries).toHaveLength(0);
  });

  it('resuelve AJUSTE faltante con asiento y movimiento OUT', async () => {
    const { service, savedReconciliations, savedMovements, savedEntries } = createService({
      movementsSeed: [movement('IN', '1200.00')],
    });

    await service.registerDailyClosing(ctx, {
      accountId: 'acc-1',
      closingDate: '2026-10-13',
      periodId: 'period-1',
      realBalance: { amount: '1000.00', currency: 'ARS' },
    });

    const result = await service.resolveDifference(ctx, {
      reconciliationId: savedReconciliations[0].id,
      resolution: 'AJUSTE',
      reason: 'Faltante de caja',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(savedEntries).toHaveLength(1);
    expect(savedEntries[0].lines[0].ledgerAccountId).toBe('5.10');
    expect(savedEntries[0].lines[1].ledgerAccountId).toBe('1.1.1');

    const adjustmentMovement = savedMovements.find(m => m.sourceDocumentType === 'reconciliation_adjustment');
    expect(adjustmentMovement?.direction).toBe('OUT');
  });

  it('resuelve AJUSTE sobrante con asiento y movimiento IN', async () => {
    const { service, savedReconciliations, savedMovements, savedEntries } = createService({
      movementsSeed: [movement('IN', '1000.00')],
    });

    await service.registerDailyClosing(ctx, {
      accountId: 'acc-1',
      closingDate: '2026-10-13',
      periodId: 'period-1',
      realBalance: { amount: '1200.00', currency: 'ARS' },
    });

    const result = await service.resolveDifference(ctx, {
      reconciliationId: savedReconciliations[0].id,
      resolution: 'AJUSTE',
      reason: 'Sobrante de caja',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(savedEntries[0].lines[0].ledgerAccountId).toBe('1.1.1');
    expect(savedEntries[0].lines[1].ledgerAccountId).toBe('4.3');

    const adjustmentMovement = savedMovements.find(m => m.sourceDocumentType === 'reconciliation_adjustment');
    expect(adjustmentMovement?.direction).toBe('IN');
  });

  it('rechaza reconciliacion ya resuelta', async () => {
    const { service, savedReconciliations } = createService({
      movementsSeed: [movement('IN', '1200.00')],
    });

    await service.registerDailyClosing(ctx, {
      accountId: 'acc-1',
      closingDate: '2026-10-13',
      periodId: 'period-1',
      realBalance: { amount: '1000.00', currency: 'ARS' },
    });

    const reconciliationId = savedReconciliations[0].id;

    await service.resolveDifference(ctx, { reconciliationId, resolution: 'EXPLICADA', reason: 'Primera resolucion' });
    const second = await service.resolveDifference(ctx, { reconciliationId, resolution: 'EXPLICADA', reason: 'Segunda' });

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe('RECONCILIATION_ALREADY_RESOLVED');
  });

  it('rechaza sin permiso', async () => {
    const denied: Authorizer = async () => ({
      ok: false,
      error: { code: 'PERMISSION_DENIED', message: 'No tenes permiso.', recoverable: false },
    });
    const { service } = createService({ authorize: denied });

    const result = await service.registerDailyClosing(ctx, {
      accountId: 'acc-1',
      closingDate: '2026-10-13',
      periodId: 'period-1',
      realBalance: { amount: '0.00', currency: 'ARS' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});
