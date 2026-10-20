import { describe, expect, it } from 'vitest';
import {
  PaymentsService,
  type AccountMovementRepository,
  type PaymentApplicationRepository,
  type PaymentRepository,
} from '../payments-service';
import { JournalService, type AccountingPeriodRepository, type JournalEntryRepository } from '../journal-service';
import type { Master, MasterRepository } from '../master-data-service';
import type { ObligationRepository } from '../obligations-service';
import type { Obligation } from '../../domain/obligations';
import type { AccountMovement } from '../../domain/account-movements';
import type { Payment, PaymentApplication } from '../../domain/payments';
import type { JournalEntry } from '../../domain/journal';
import type { AccountingPeriod } from '../../domain/periods';
import type { Authorizer } from '../permission-service';
import type { AuditEventInput, AuditRecorder } from '../../domain/audit';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;

const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'pay-1',
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
];

function makeObligation(id: string, finalAmount: string): Obligation {
  return {
    id,
    concept: 'Insumos',
    personId: 'person-1',
    categoryId: 'cat-1',
    resultLineId: 'rl-1',
    plannedAccountId: 'acc-1',
    estimatedAmount: { amount: finalAmount, currency: 'ARS' },
    estimatedAmountVersion: 1,
    finalAmount: { amount: finalAmount, currency: 'ARS' },
    isEstimated: false,
    dueDate: '2026-10-20',
    expectedPaymentDate: null,
    priority: 'P3',
    status: 'PENDIENTE',
    periodId: 'period-1',
    recurrenceRuleId: null,
    source: 'REAL',
    createdBy: userId,
    createdAt: ctx.now,
    idempotencyKey: `obl-${id}`,
  };
}

function createService(options?: {
  obligationsSeed?: Obligation[];
  authorize?: Authorizer;
  period?: AccountingPeriod | null;
}) {
  let nextId = 0;
  const createId = () => `id-${++nextId}`;

  const savedObligations: Obligation[] = options?.obligationsSeed ?? [makeObligation('obl-1', '1000.00')];
  const savedPayments: Payment[] = [];
  const savedApplications: PaymentApplication[] = [];
  const savedMovements: AccountMovement[] = [];
  const savedEntries: JournalEntry[] = [];
  const auditEvents: AuditEventInput[] = [];

  const obligations: ObligationRepository = {
    async findById(id) {
      return savedObligations.find(o => o.id === id) ?? null;
    },
    async findAll() {
      return savedObligations;
    },
    async save(obligation) {
      savedObligations.push(obligation);
      return obligation;
    },
    async update(obligation) {
      const index = savedObligations.findIndex(o => o.id === obligation.id);
      if (index >= 0) savedObligations[index] = obligation;
      return obligation;
    },
  };

  const payments: PaymentRepository = {
    async findByIdempotencyKey(key) {
      return savedPayments.find(p => p.idempotencyKey === key) ?? null;
    },
    async save(payment) {
      savedPayments.push(payment);
      return payment;
    },
  };

  const applications: PaymentApplicationRepository = {
    async findAll() {
      return savedApplications;
    },
    async findByObligation(obligationId) {
      return savedApplications.filter(a => a.obligationId === obligationId);
    },
    async save(application) {
      savedApplications.push(application);
      return application;
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

  const journalEntries: JournalEntryRepository = {
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

  const journal = new JournalService({
    periods,
    entries: journalEntries,
    audit: { record: async () => {} },
    createId,
  });

  const authorize: Authorizer = options?.authorize ?? (async () => ({ ok: true, value: undefined }));
  const audit: AuditRecorder = {
    async record(event) {
      auditEvents.push(event);
    },
  };

  return {
    service: new PaymentsService({
      payments,
      applications,
      movements,
      obligations,
      masters: masterRepository,
      periods,
      journal,
      authorize,
      audit,
      createId,
    }),
    savedObligations,
    savedPayments,
    savedApplications,
    savedMovements,
    savedEntries,
    auditEvents,
  };
}

describe('PaymentsService.registerPayment', () => {
  it('paga totalmente una obligacion', async () => {
    const { service, savedObligations, savedPayments, savedMovements, savedEntries, auditEvents } = createService();

    const result = await service.registerPayment(ctx, {
      accountId: 'acc-1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      amount: { amount: '1000.00', currency: 'ARS' },
      applications: [{ obligationId: 'obl-1', appliedAmount: { amount: '1000.00', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('CONFIRMADO');
    expect(savedObligations[0].status).toBe('PAGADA');
    expect(savedPayments).toHaveLength(1);
    expect(savedMovements).toHaveLength(1);
    expect(savedMovements[0].direction).toBe('OUT');
    expect(savedMovements[0].journalEntryId).toBeTruthy();

    expect(savedEntries).toHaveLength(1);
    const entry = savedEntries[0];
    expect(entry.lines).toHaveLength(2);
    expect(entry.lines[0].ledgerAccountId).toBe('5.6');
    expect(entry.lines[0].debit.amount).toBe('1000.00');
    expect(entry.lines[1].ledgerAccountId).toBe('1.1.1');
    expect(entry.lines[1].credit.amount).toBe('1000.00');

    expect(auditEvents.some(e => e.action === 'PAYMENT_CREATED')).toBe(true);
  });

  it('pago parcial deja la obligacion PARCIAL', async () => {
    const { service, savedObligations } = createService();

    const result = await service.registerPayment(ctx, {
      accountId: 'acc-1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      amount: { amount: '600.00', currency: 'ARS' },
      applications: [{ obligationId: 'obl-1', appliedAmount: { amount: '600.00', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(true);
    expect(savedObligations[0].status).toBe('PARCIAL');
  });

  it('rechaza pago que supera el saldo pendiente', async () => {
    const { service } = createService();

    const result = await service.registerPayment(ctx, {
      accountId: 'acc-1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      amount: { amount: '1500.00', currency: 'ARS' },
      applications: [{ obligationId: 'obl-1', appliedAmount: { amount: '1500.00', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PAYMENT_EXCEEDS_PENDIENTE');
  });

  it('rechaza suma de aplicaciones distinta al importe', async () => {
    const { service } = createService();

    const result = await service.registerPayment(ctx, {
      accountId: 'acc-1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      amount: { amount: '1000.00', currency: 'ARS' },
      applications: [{ obligationId: 'obl-1', appliedAmount: { amount: '400.00', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PAYMENT_APPLICATION_MISMATCH');
  });

  it('rechaza cuenta no disponible', async () => {
    const { service } = createService();

    const result = await service.registerPayment(ctx, {
      accountId: 'acc-ext',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      amount: { amount: '1000.00', currency: 'ARS' },
      applications: [{ obligationId: 'obl-1', appliedAmount: { amount: '1000.00', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ACCOUNT_NOT_AVAILABLE');
  });

  it('reintento con misma idempotencyKey devuelve el resultado previo', async () => {
    const { service } = createService();

    const command = {
      accountId: 'acc-1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      amount: { amount: '1000.00', currency: 'ARS' as const },
      applications: [{ obligationId: 'obl-1', appliedAmount: { amount: '1000.00', currency: 'ARS' as const } }],
    };

    const first = await service.registerPayment(ctx, command);
    const second = await service.registerPayment(ctx, command);

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

    const result = await service.registerPayment(ctx, {
      accountId: 'acc-1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      amount: { amount: '1000.00', currency: 'ARS' },
      applications: [{ obligationId: 'obl-1', appliedAmount: { amount: '1000.00', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });

  it('rechaza obligacion inexistente', async () => {
    const { service } = createService();

    const result = await service.registerPayment(ctx, {
      accountId: 'acc-1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      amount: { amount: '1000.00', currency: 'ARS' },
      applications: [{ obligationId: 'missing', appliedAmount: { amount: '1000.00', currency: 'ARS' } }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('OBLIGATION_NOT_FOUND');
  });

  it('registra egreso directo sin obligacion previa', async () => {
    const { service, savedEntries } = createService();

    const result = await service.registerPayment(ctx, {
      accountId: 'acc-1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
      amount: { amount: '500.00', currency: 'ARS' },
      applications: [],
      concept: 'Compra de insumos',
      resultLineId: 'rl-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(savedEntries).toHaveLength(1);
    expect(savedEntries[0].lines).toHaveLength(2);
    expect(savedEntries[0].lines[0].ledgerAccountId).toBe('5.6');
    expect(savedEntries[0].lines[1].ledgerAccountId).toBe('1.1.1');
  });
});
