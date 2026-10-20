import { describe, expect, it } from 'vitest';
import {
  IncomesService,
  type IncomeDistributionRepository,
  type IncomeRecordRepository,
} from '../incomes-service';
import { JournalService, type AccountingPeriodRepository, type JournalEntryRepository } from '../journal-service';
import type { Master, MasterRepository } from '../master-data-service';
import type { AccountMovementRepository } from '../../domain/account-movements';
import type { AccountMovement } from '../../domain/account-movements';
import type { IncomeRecord, IncomeDistribution } from '../../domain/incomes';
import type { JournalEntry } from '../../domain/journal';
import type { AccountingPeriod } from '../../domain/periods';
import type { Authorizer } from '../permission-service';
import type { AuditEventInput, AuditRecorder } from '../../domain/audit';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;
const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'inc-1',
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
    name: 'Mercado Pago Dennys',
    kind: 'BILLETERA',
    ownership: 'PROPIA',
    financialInstitution: null,
    currency: 'ARS',
    ledgerAccountId: '1.1.3',
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

function createService(options?: { authorize?: Authorizer }) {
  let nextId = 0;
  const createId = () => `id-${++nextId}`;

  const savedIncomes: IncomeRecord[] = [];
  const savedDistributions: IncomeDistribution[] = [];
  const savedMovements: AccountMovement[] = [];
  const savedEntries: JournalEntry[] = [];
  const auditEvents: AuditEventInput[] = [];

  const incomes: IncomeRecordRepository = {
    async findByIdempotencyKey(key) {
      return savedIncomes.find(i => i.idempotencyKey === key) ?? null;
    },
    async save(record) {
      savedIncomes.push(record);
      return record;
    },
  };

  const distributions: IncomeDistributionRepository = {
    async save(distribution) {
      savedDistributions.push(distribution);
      return distribution;
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
    service: new IncomesService({
      incomes,
      distributions,
      movements,
      masters: masterRepository,
      periods,
      journal,
      authorize,
      audit,
      createId,
      incomeLedgerAccounts: { servicios: '4.1', productos: '4.2' },
    }),
    savedIncomes,
    savedDistributions,
    savedMovements,
    savedEntries,
    auditEvents,
  };
}

describe('IncomesService.registerDailyIncome', () => {
  it('registra un ingreso valido', async () => {
    const { service, savedIncomes, savedMovements, savedEntries, auditEvents } = createService();

    const result = await service.registerDailyIncome(ctx, {
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      serviceAmount: { amount: '80.00', currency: 'ARS' },
      productAmount: { amount: '20.00', currency: 'ARS' },
      distributions: [
        { accountId: 'acc-1', amount: { amount: '60.00', currency: 'ARS' } },
        { accountId: 'acc-2', amount: { amount: '40.00', currency: 'ARS' } },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('CONFIRMADO');
    expect(savedIncomes).toHaveLength(1);
    expect(savedMovements).toHaveLength(2);
    expect(savedMovements.every(m => m.direction === 'IN')).toBe(true);

    expect(savedEntries).toHaveLength(1);
    const entry = savedEntries[0];
    expect(entry.lines).toHaveLength(4);
    expect(entry.lines[0].ledgerAccountId).toBe('1.1.1');
    expect(entry.lines[1].ledgerAccountId).toBe('1.1.3');
    expect(entry.lines[2].ledgerAccountId).toBe('4.1');
    expect(entry.lines[2].credit.amount).toBe('80.00');
    expect(entry.lines[3].ledgerAccountId).toBe('4.2');
    expect(entry.lines[3].credit.amount).toBe('20.00');

    expect(auditEvents.some(e => e.action === 'INCOME_CREATED')).toBe(true);
  });

  it('rechaza distribuciones que no suman el ingreso', async () => {
    const { service } = createService();

    const result = await service.registerDailyIncome(ctx, {
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      serviceAmount: { amount: '80.00', currency: 'ARS' },
      productAmount: { amount: '20.00', currency: 'ARS' },
      distributions: [{ accountId: 'acc-1', amount: { amount: '90.00', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INCOME_DISTRIBUTION_MISMATCH');
  });

  it('rechaza cuenta receptora no disponible', async () => {
    const { service } = createService();

    const result = await service.registerDailyIncome(ctx, {
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      serviceAmount: { amount: '100.00', currency: 'ARS' },
      productAmount: { amount: '0.00', currency: 'ARS' },
      distributions: [{ accountId: 'acc-ext', amount: { amount: '100.00', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ACCOUNT_NOT_AVAILABLE');
  });

  it('rechaza reintento con misma clave', async () => {
    const { service } = createService();

    const command = {
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      serviceAmount: { amount: '80.00', currency: 'ARS' as const },
      productAmount: { amount: '20.00', currency: 'ARS' as const },
      distributions: [{ accountId: 'acc-1', amount: { amount: '100.00', currency: 'ARS' as const } }],
    };

    const first = await service.registerDailyIncome(ctx, command);
    const second = await service.registerDailyIncome(ctx, command);

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

    const result = await service.registerDailyIncome(ctx, {
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      serviceAmount: { amount: '80.00', currency: 'ARS' },
      productAmount: { amount: '20.00', currency: 'ARS' },
      distributions: [{ accountId: 'acc-1', amount: { amount: '100.00', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});
