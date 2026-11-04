import { describe, expect, it } from 'vitest';
import { TransfersService, type TransferRepository } from '../transfers-service';
import { JournalService, type AccountingPeriodRepository, type JournalEntryRepository } from '../journal-service';
import type { Master, MasterRepository } from '../master-data-service';
import type { AccountMovementRepository } from '../../domain/account-movements';
import type { AccountMovement } from '../../domain/account-movements';
import type { Transfer } from '../../domain/transfers';
import type { JournalEntry } from '../../domain/journal';
import type { AccountingPeriod } from '../../domain/periods';
import type { Authorizer } from '../permission-service';
import type { AuditEventInput, AuditRecorder } from '../../domain/audit';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;
const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'trf-1',
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
    id: 'acc-2',
    entityType: 'ACCOUNT',
    name: 'Santander DENNYS',
    kind: 'BANCO',
    ownership: 'PROPIA',
    financialInstitution: 'Santander',
    currency: 'ARS',
    ledgerAccountId: '1.1.2',
    isAvailable: true,
    isReconcilable: true,
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: ctx.now,
    createdBy: userId,
  },
  {
    id: 'acc-ext',
    entityType: 'ACCOUNT',
    name: 'Mercado Pago MARI',
    kind: 'BILLETERA',
    ownership: 'EXTERNA',
    financialInstitution: null,
    currency: 'ARS',
    ledgerAccountId: '6.3',
    isAvailable: false,
    isReconcilable: false,
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: ctx.now,
    createdBy: userId,
  },
];

function createService(options?: { authorize?: Authorizer; period?: AccountingPeriod | null }) {
  let nextId = 0;
  const createId = () => `id-${++nextId}`;

  const savedTransfers: Transfer[] = [];
  const savedMovements: AccountMovement[] = [];
  const savedEntries: JournalEntry[] = [];
  const auditEvents: AuditEventInput[] = [];

  const transfers: TransferRepository = {
    async findByIdempotencyKey(key) {
      return savedTransfers.find(t => t.idempotencyKey === key) ?? null;
    },
    async findById(id) {
      return savedTransfers.find(t => t.id === id) ?? null;
    },
    async findAll() {
      return savedTransfers;
    },
    async save(transfer) {
      savedTransfers.push(transfer);
      return transfer;
    },
    async update(transfer) {
      const index = savedTransfers.findIndex(t => t.id === transfer.id);
      if (index >= 0) savedTransfers[index] = transfer;
      return transfer;
    },
  };

  const movements: AccountMovementRepository = {
    async findByAccount(accountId) {
      return savedMovements.filter(m => m.accountId === accountId);
    },
    async findByAccountIds(accountIds) {
      return savedMovements.filter(m => accountIds.includes(m.accountId));
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

  const period = options?.period ?? openPeriod;
  const periods: AccountingPeriodRepository = {
    async findById() {
      return period;
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
    async findBySourceDocument(sourceDocumentType, sourceDocumentId) {
      return savedEntries.find(e => e.sourceDocumentType === sourceDocumentType && e.sourceDocumentId === sourceDocumentId && !e.reversesEntryId) ?? null;
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
    service: new TransfersService({
      transfers,
      movements,
      masters: masterRepository,
      periods,
      journal,
      journalEntries: entriesRepo,
      authorize,
      audit,
      createId,
    }),
    savedTransfers,
    savedMovements,
    savedEntries,
    auditEvents,
  };
}

describe('TransfersService.registerTransfer', () => {
  it('registra una transferencia valida', async () => {
    const { service, savedTransfers, savedMovements, savedEntries, auditEvents } = createService();

    const result = await service.registerTransfer(ctx, {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: { amount: '500.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('CONFIRMADO');
    expect(savedTransfers).toHaveLength(1);
    expect(savedMovements).toHaveLength(2);
    expect(savedMovements[0].direction).toBe('OUT');
    expect(savedMovements[1].direction).toBe('IN');

    expect(savedEntries).toHaveLength(1);
    expect(savedEntries[0].lines[0].ledgerAccountId).toBe('1.1.2');
    expect(savedEntries[0].lines[1].ledgerAccountId).toBe('1.1.1');

    expect(auditEvents.some(e => e.action === 'TRANSFER_CREATED')).toBe(true);
  });

  it('rechaza origen igual a destino', async () => {
    const { service } = createService();

    const result = await service.registerTransfer(ctx, {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-1',
      amount: { amount: '500.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('TRANSFER_SAME_ACCOUNT');
  });

  it('rechaza cuenta no disponible', async () => {
    const { service } = createService();

    const result = await service.registerTransfer(ctx, {
      fromAccountId: 'acc-ext',
      toAccountId: 'acc-1',
      amount: { amount: '500.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ACCOUNT_NOT_AVAILABLE');
  });

  it('rechaza reintento con misma clave', async () => {
    const { service } = createService();

    const command = {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: { amount: '500.00', currency: 'ARS' as const },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    };

    const first = await service.registerTransfer(ctx, command);
    const second = await service.registerTransfer(ctx, command);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) expect(second.value.id).toBe(first.value.id);
  });

  it('rechaza sin permiso', async () => {
    const denied: Authorizer = async () => ({
      ok: false,
      error: { code: 'PERMISSION_DENIED', message: 'No tenes permiso.', recoverable: false },
    });
    const { service } = createService({ authorize: denied });

    const result = await service.registerTransfer(ctx, {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: { amount: '500.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});

describe('TransfersService.reverseTransfer', () => {
  const reversalCtx: CommandContext = {
    actorUserId: userId,
    idempotencyKey: 'trf-rev-1',
    now: '2026-10-14T12:00:00.000Z',
  };

  it('revierte una transferencia con movimientos inversos y asiento reverso', async () => {
    const { service, savedTransfers, savedMovements, savedEntries, auditEvents } = createService();

    const reg = await service.registerTransfer(ctx, {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: { amount: '500.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;

    const result = await service.reverseTransfer(reversalCtx, {
      transferId: reg.value.id,
      reason: 'Error de origen',
      reversalDate: '2026-10-14',
      periodId: 'period-1',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('REVERTIDO');
    expect(savedTransfers[0].status).toBe('REVERTIDO');
    expect(savedMovements).toHaveLength(4);
    expect(savedMovements[2].direction).toBe('IN');
    expect(savedMovements[2].accountId).toBe('acc-1');
    expect(savedMovements[3].direction).toBe('OUT');
    expect(savedMovements[3].accountId).toBe('acc-2');
    expect(savedEntries).toHaveLength(2);
    expect(savedEntries[1].reversesEntryId).toBe(savedEntries[0].id);
    expect(auditEvents.some(e => e.action === 'TRANSFER_REVERSED')).toBe(true);
  });

  it('rechaza una segunda reversión con REVERSAL_ALREADY_EXISTS', async () => {
    const { service } = createService();

    const reg = await service.registerTransfer(ctx, {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: { amount: '500.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;

    const command = { transferId: reg.value.id, reason: 'x', reversalDate: '2026-10-14', periodId: 'period-1' };
    const first = await service.reverseTransfer(reversalCtx, command);
    expect(first.ok).toBe(true);
    const second = await service.reverseTransfer(reversalCtx, command);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe('REVERSAL_ALREADY_EXISTS');
  });

  it('devuelve TRANSFER_NOT_FOUND si no existe', async () => {
    const { service } = createService();
    const result = await service.reverseTransfer(reversalCtx, {
      transferId: 'missing',
      reason: 'x',
      reversalDate: '2026-10-14',
      periodId: 'period-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('TRANSFER_NOT_FOUND');
  });

  it('devuelve MISSING_REASON sin motivo', async () => {
    const { service } = createService();
    const result = await service.reverseTransfer(reversalCtx, {
      transferId: 'any',
      reason: '   ',
      reversalDate: '2026-10-14',
      periodId: 'period-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MISSING_REASON');
  });
});
