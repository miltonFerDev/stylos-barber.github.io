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
    async findById(id) {
      return savedIncomes.find(i => i.id === id) ?? null;
    },
    async findAll() {
      return savedIncomes;
    },
    async save(record) {
      savedIncomes.push(record);
      return record;
    },
    async update(record) {
      const index = savedIncomes.findIndex(i => i.id === record.id);
      if (index >= 0) savedIncomes[index] = record;
      return record;
    },
  };

  const distributions: IncomeDistributionRepository = {
    async save(distribution) {
      savedDistributions.push(distribution);
      return distribution;
    },
    async findByIncomeRecord(incomeRecordId) {
      return savedDistributions.filter(d => d.incomeRecordId === incomeRecordId);
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
    service: new IncomesService({
      incomes,
      distributions,
      movements,
      masters: masterRepository,
      periods,
      journal,
      journalEntries: entriesRepo,
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

describe('IncomesService.reverseIncome', () => {
  const reversalCtx: CommandContext = {
    actorUserId: userId,
    idempotencyKey: 'inc-rev-1',
    now: '2026-10-14T12:00:00.000Z',
  };

  it('revierte un ingreso con movimientos OUT y asiento reverso', async () => {
    const { service, savedIncomes, savedMovements, savedEntries, auditEvents } = createService();

    const reg = await service.registerDailyIncome(ctx, {
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      serviceAmount: { amount: '80.00', currency: 'ARS' },
      productAmount: { amount: '20.00', currency: 'ARS' },
      distributions: [
        { accountId: 'acc-1', amount: { amount: '60.00', currency: 'ARS' } },
        { accountId: 'acc-2', amount: { amount: '40.00', currency: 'ARS' } },
      ],
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;

    const result = await service.reverseIncome(reversalCtx, {
      incomeId: reg.value.id,
      reason: 'Error de carga',
      reversalDate: '2026-10-14',
      periodId: 'period-1',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('REVERTIDO');
    expect(savedIncomes[0].status).toBe('REVERTIDO');
    expect(savedMovements).toHaveLength(4);
    expect(savedMovements[2].direction).toBe('OUT');
    expect(savedMovements[3].direction).toBe('OUT');
    expect(savedEntries).toHaveLength(2);
    expect(savedEntries[1].reversesEntryId).toBe(savedEntries[0].id);
    expect(auditEvents.some(e => e.action === 'INCOME_REVERSED')).toBe(true);
  });

  it('rechaza una segunda reversión con REVERSAL_ALREADY_EXISTS', async () => {
    const { service } = createService();

    const reg = await service.registerDailyIncome(ctx, {
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      serviceAmount: { amount: '100.00', currency: 'ARS' },
      productAmount: { amount: '0.00', currency: 'ARS' },
      distributions: [{ accountId: 'acc-1', amount: { amount: '100.00', currency: 'ARS' } }],
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;

    const command = { incomeId: reg.value.id, reason: 'x', reversalDate: '2026-10-14', periodId: 'period-1' };
    const first = await service.reverseIncome(reversalCtx, command);
    expect(first.ok).toBe(true);
    const second = await service.reverseIncome(reversalCtx, command);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe('REVERSAL_ALREADY_EXISTS');
  });

  it('devuelve INCOME_NOT_FOUND si no existe', async () => {
    const { service } = createService();
    const result = await service.reverseIncome(reversalCtx, {
      incomeId: 'missing',
      reason: 'x',
      reversalDate: '2026-10-14',
      periodId: 'period-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INCOME_NOT_FOUND');
  });
});
