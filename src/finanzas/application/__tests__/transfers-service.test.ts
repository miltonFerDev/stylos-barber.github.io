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
    async save(transfer) {
      savedTransfers.push(transfer);
      return transfer;
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

  const period = options?.period ?? openPeriod;
  const periods: AccountingPeriodRepository = {
    async findById() {
      return period;
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
    service: new TransfersService({
      transfers,
      movements,
      masters: masterRepository,
      periods,
      journal,
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
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe('DUPLICATE_IDEMPOTENCY');
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
