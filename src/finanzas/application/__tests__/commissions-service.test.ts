import { describe, expect, it } from 'vitest';
import { CommissionsService, type CommissionRepository } from '../commissions-service';
import { JournalService, type AccountingPeriodRepository, type JournalEntryRepository } from '../journal-service';
import type { Master, MasterRepository } from '../master-data-service';
import type { AccountMovementRepository } from '../../domain/account-movements';
import type { AccountMovement } from '../../domain/account-movements';
import type { CommissionPayment, CommissionPaymentDistribution, CommissionRecord } from '../../domain/commissions';
import type { JournalEntry } from '../../domain/journal';
import type { AccountingPeriod } from '../../domain/periods';
import type { Authorizer } from '../permission-service';
import type { AuditEventInput, AuditRecorder } from '../../domain/audit';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;
const ctxFor = (key: string): CommandContext => ({
  actorUserId: userId,
  idempotencyKey: key,
  now: '2026-10-13T12:00:00.000Z',
});

const openPeriod: AccountingPeriod = {
  id: 'period-1',
  code: '2026-10',
  startsOn: '2026-10-01',
  endsOn: '2026-10-31',
  status: 'ABIERTO',
};

const masters: Master[] = [
  {
    id: 'b1',
    entityType: 'PERSON',
    displayName: 'Ezequiel',
    kind: 'PERSONA',
    taxId: null,
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: '2026-10-13T12:00:00.000Z',
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
    createdAt: '2026-10-13T12:00:00.000Z',
    createdBy: userId,
  },
  {
    id: 'acc-2',
    entityType: 'ACCOUNT',
    name: 'Mercado Pago',
    kind: 'BILLETERA',
    ownership: 'PROPIA',
    financialInstitution: null,
    currency: 'ARS',
    ledgerAccountId: '1.1.3',
    isAvailable: true,
    isReconcilable: true,
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: '2026-10-13T12:00:00.000Z',
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
    createdAt: '2026-10-13T12:00:00.000Z',
    createdBy: userId,
  },
];

function createService(options?: { authorize?: Authorizer }) {
  let nextId = 0;
  const createId = () => `id-${++nextId}`;

  const savedRecords: CommissionRecord[] = [];
  const savedPayments: CommissionPayment[] = [];
  const savedDistributions: CommissionPaymentDistribution[] = [];
  const savedMovements: AccountMovement[] = [];
  const savedEntries: JournalEntry[] = [];
  const auditEvents: AuditEventInput[] = [];

  const commissions: CommissionRepository = {
    async findRecordsByBarber(barberId) {
      return savedRecords.filter((r) => r.barberId === barberId);
    },
    async findPaymentsByBarber(barberId) {
      return savedPayments.filter((p) => p.barberId === barberId);
    },
    async findRecordByIdempotencyKey(key) {
      return savedRecords.find((r) => r.idempotencyKey === key) ?? null;
    },
    async findPaymentByIdempotencyKey(key) {
      return savedPayments.find((p) => p.idempotencyKey === key) ?? null;
    },
    async findRecordById(id) {
      return savedRecords.find((r) => r.id === id) ?? null;
    },
    async findPaymentById(id) {
      return savedPayments.find((p) => p.id === id) ?? null;
    },
    async findAllRecords() {
      return savedRecords;
    },
    async findAllPayments() {
      return savedPayments;
    },
    async findPaymentDistributions(paymentId) {
      return savedDistributions.filter((d) => d.commissionPaymentId === paymentId);
    },
    async saveRecord(record) {
      savedRecords.push(record);
      return record;
    },
    async savePayment(payment) {
      savedPayments.push(payment);
      return payment;
    },
    async saveDistribution(distribution) {
      savedDistributions.push(distribution);
      return distribution;
    },
    async updateRecord(record) {
      const index = savedRecords.findIndex((r) => r.id === record.id);
      if (index >= 0) savedRecords[index] = record;
      return record;
    },
    async updatePayment(payment) {
      const index = savedPayments.findIndex((p) => p.id === payment.id);
      if (index >= 0) savedPayments[index] = payment;
      return payment;
    },
  };

  const movements: AccountMovementRepository = {
    async findByAccount(accountId) {
      return savedMovements.filter((m) => m.accountId === accountId);
    },
    async findByAccountIds(accountIds) {
      return savedMovements.filter((m) => accountIds.includes(m.accountId));
    },
    async findBySourceDocument(sourceDocumentType, sourceDocumentId) {
      return savedMovements.filter((m) => m.sourceDocumentType === sourceDocumentType && m.sourceDocumentId === sourceDocumentId);
    },
    async save(movement) {
      savedMovements.push(movement);
      return movement;
    },
  };

  const masterRepository: MasterRepository = {
    async findById(entityType, id) {
      return masters.find((m) => m.entityType === entityType && m.id === id) ?? null;
    },
    async findByCode(entityType, code) {
      return masters.find((m) => m.entityType === entityType && 'code' in m && m.code === code) ?? null;
    },
    async findAll(entityType) {
      return masters.filter((m) => m.entityType === entityType);
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
      return savedEntries.find((e) => e.idempotencyKey === key) ?? null;
    },
    async findById(id) {
      return savedEntries.find((e) => e.id === id) ?? null;
    },
    async findReversalForEntry(id) {
      return savedEntries.find((e) => e.reversesEntryId === id) ?? null;
    },
    async findBySourceDocument(sourceDocumentType, sourceDocumentId) {
      return savedEntries.find((e) => e.sourceDocumentType === sourceDocumentType && e.sourceDocumentId === sourceDocumentId && !e.reversesEntryId) ?? null;
    },
    async save(entry) {
      savedEntries.push(entry);
      return entry;
    },
    async markReversed() {},
  };

  const journal = new JournalService({ periods, entries: entriesRepo, audit: { record: async () => {} }, createId });

  const authorize: Authorizer = options?.authorize ?? (async () => ({ ok: true, value: undefined }));
  const audit: AuditRecorder = { async record(event) { auditEvents.push(event); } };

  const service = new CommissionsService({
    commissions,
    movements,
    masters: masterRepository,
    periods,
    journal,
    journalEntries: entriesRepo,
    authorize,
    audit,
    createId,
    commissionLedgerAccounts: { expense: '5.1', payable: '2.1.1' },
  });

  return { service, savedRecords, savedPayments, savedDistributions, savedMovements, savedEntries, auditEvents };
}

describe('CommissionsService.registerCommissionDevengo', () => {
  it('devenga con asiento Db 5.1 / Hr 2.1.1', async () => {
    const { service, savedRecords, savedEntries, auditEvents } = createService();

    const result = await service.registerCommissionDevengo(ctxFor('dev-1'), {
      barberId: 'b1',
      amount: { amount: '500.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(true);
    expect(savedRecords).toHaveLength(1);
    expect(savedEntries).toHaveLength(1);
    expect(savedEntries[0].lines[0].ledgerAccountId).toBe('5.1');
    expect(savedEntries[0].lines[1].ledgerAccountId).toBe('2.1.1');
    expect(auditEvents.some((e) => e.action === 'COMMISSION_ACCRUED')).toBe(true);
  });

  it('es idempotente por barbero y día (el batch no duplica)', async () => {
    const { service, savedRecords } = createService();

    const command = {
      barberId: 'b1',
      amount: { amount: '500.00', currency: 'ARS' as const },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    };

    const first = await service.registerCommissionDevengo(ctxFor('dev-1'), command);
    const second = await service.registerCommissionDevengo(ctxFor('dev-2'), command);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) expect(second.value.id).toBe(first.value.id);
    expect(savedRecords).toHaveLength(1);
  });

  it('rechaza sin permiso', async () => {
    const denied: Authorizer = async () => ({
      ok: false,
      error: { code: 'PERMISSION_DENIED', message: 'No tenes permiso.', recoverable: false },
    });
    const { service } = createService({ authorize: denied });

    const result = await service.registerCommissionDevengo(ctxFor('dev-2'), {
      barberId: 'b1',
      amount: { amount: '500.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});

describe('CommissionsService.registerCommissionPayment', () => {
  it('paga con reparto por cuenta (Db 2.1.1 / Hr 1.1.1 + 1.1.3)', async () => {
    const { service, savedMovements, savedEntries, savedPayments } = createService();

    await service.registerCommissionDevengo(ctxFor('dev-1'), {
      barberId: 'b1',
      amount: { amount: '100.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    const result = await service.registerCommissionPayment(ctxFor('pay-1'), {
      barberId: 'b1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      distributions: [
        { accountId: 'acc-1', amount: { amount: '60.00', currency: 'ARS' } },
        { accountId: 'acc-2', amount: { amount: '40.00', currency: 'ARS' } },
      ],
    });

    expect(result.ok).toBe(true);
    expect(savedPayments).toHaveLength(1);
    expect(savedMovements).toHaveLength(2);
    expect(savedMovements.every((m) => m.direction === 'OUT')).toBe(true);
    expect(savedMovements[0].idempotencyKey).not.toBe(savedMovements[1].idempotencyKey);

    const entry = savedEntries.find((e) => e.sourceDocumentType === 'commission_payment')!;
    expect(entry.lines[0].ledgerAccountId).toBe('2.1.1');
    expect(entry.lines[0].debit.amount).toBe('100.00');
    expect(entry.lines[1].ledgerAccountId).toBe('1.1.1');
    expect(entry.lines[2].ledgerAccountId).toBe('1.1.3');
  });

  it('rechaza pago que excede el pendiente', async () => {
    const { service } = createService();

    await service.registerCommissionDevengo(ctxFor('dev-1'), {
      barberId: 'b1',
      amount: { amount: '50.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    const result = await service.registerCommissionPayment(ctxFor('pay-1'), {
      barberId: 'b1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      distributions: [{ accountId: 'acc-1', amount: { amount: '80.00', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMISSION_EXCEEDS_PENDING');
  });

  it('rechaza cuenta no disponible', async () => {
    const { service } = createService();

    await service.registerCommissionDevengo(ctxFor('dev-1'), {
      barberId: 'b1',
      amount: { amount: '100.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    const result = await service.registerCommissionPayment(ctxFor('pay-1'), {
      barberId: 'b1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      distributions: [{ accountId: 'acc-ext', amount: { amount: '100.00', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ACCOUNT_NOT_AVAILABLE');
  });
});

describe('CommissionsService.reverseCommissionRecord', () => {
  const reversalCtx: CommandContext = ctxFor('rev-1');

  it('revierte un devengo con asiento reverso y sin movimientos de cuenta', async () => {
    const { service, savedRecords, savedEntries, auditEvents } = createService();

    const reg = await service.registerCommissionDevengo(ctxFor('dev-1'), {
      barberId: 'b1',
      amount: { amount: '500.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;

    const result = await service.reverseCommissionRecord(reversalCtx, {
      recordId: reg.value.id,
      reason: 'Error de importe',
      reversalDate: '2026-10-14',
      periodId: 'period-1',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('REVERTIDO');
    expect(savedRecords[0].status).toBe('REVERTIDO');
    expect(savedEntries).toHaveLength(2);
    expect(savedEntries[1].reversesEntryId).toBe(savedEntries[0].id);
    expect(auditEvents.some((e) => e.action === 'COMMISSION_ACCRUAL_REVERSED')).toBe(true);
  });

  it('rechaza una segunda reversión con REVERSAL_ALREADY_EXISTS', async () => {
    const { service } = createService();

    const reg = await service.registerCommissionDevengo(ctxFor('dev-1'), {
      barberId: 'b1',
      amount: { amount: '500.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;

    const command = { recordId: reg.value.id, reason: 'x', reversalDate: '2026-10-14', periodId: 'period-1' };
    const first = await service.reverseCommissionRecord(reversalCtx, command);
    expect(first.ok).toBe(true);
    const second = await service.reverseCommissionRecord(reversalCtx, command);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe('REVERSAL_ALREADY_EXISTS');
  });

  it('devuelve COMMISSION_RECORD_NOT_FOUND si no existe', async () => {
    const { service } = createService();
    const result = await service.reverseCommissionRecord(reversalCtx, {
      recordId: 'missing',
      reason: 'x',
      reversalDate: '2026-10-14',
      periodId: 'period-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMISSION_RECORD_NOT_FOUND');
  });
});

describe('CommissionsService.reverseCommissionPayment', () => {
  const reversalCtx: CommandContext = ctxFor('rev-2');

  it('revierte un pago con movimientos IN y asiento reverso', async () => {
    const { service, savedPayments, savedMovements, savedEntries, auditEvents } = createService();

    await service.registerCommissionDevengo(ctxFor('dev-1'), {
      barberId: 'b1',
      amount: { amount: '100.00', currency: 'ARS' },
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    const pay = await service.registerCommissionPayment(ctxFor('pay-1'), {
      barberId: 'b1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      distributions: [{ accountId: 'acc-1', amount: { amount: '100.00', currency: 'ARS' } }],
    });
    expect(pay.ok).toBe(true);
    if (!pay.ok) return;

    const result = await service.reverseCommissionPayment(reversalCtx, {
      paymentId: pay.value.id,
      reason: 'Pago duplicado',
      reversalDate: '2026-10-14',
      periodId: 'period-1',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('REVERTIDO');
    expect(savedPayments[0].status).toBe('REVERTIDO');
    expect(savedMovements).toHaveLength(2);
    expect(savedMovements[1].direction).toBe('IN');
    expect(savedEntries).toHaveLength(3); // devengo + pago + reversión
    expect(auditEvents.some((e) => e.action === 'COMMISSION_PAYMENT_REVERSED')).toBe(true);
  });

  it('devuelve COMMISSION_PAYMENT_NOT_FOUND si no existe', async () => {
    const { service } = createService();
    const result = await service.reverseCommissionPayment(reversalCtx, {
      paymentId: 'missing',
      reason: 'x',
      reversalDate: '2026-10-14',
      periodId: 'period-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMISSION_PAYMENT_NOT_FOUND');
  });
});
