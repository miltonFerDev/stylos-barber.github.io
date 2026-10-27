import { describe, expect, it } from 'vitest';
import {
  InvestmentsService,
  type InvestmentEvaluationRepository,
  type InvestmentRepository,
} from '../investments-service';
import type { AuditEventInput, AuditRecorder } from '../../domain/audit';
import type { AccountMovement, AccountMovementRepository } from '../../domain/account-movements';
import type { Investment, InvestmentEvaluation } from '../../domain/investments';
import type { JournalEntry } from '../../domain/journal';
import { JournalService, type AccountingPeriodRepository, type JournalEntryRepository } from '../journal-service';
import type { Master, MasterRepository } from '../master-data-service';
import type { Authorizer } from '../permission-service';
import type { AccountingPeriod } from '../../domain/periods';
import type { CapacityToInvestCommand, InvestmentCapacity } from '../forecast-service';
import type { CommandContext, Result, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;
const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'inv-1',
  now: '2026-10-13T12:00:00.000Z',
};

function capacityResult(min: string): Result<InvestmentCapacity> {
  return {
    ok: true,
    value: {
      scenario: 'CONSERVADOR',
      currency: 'ARS',
      reserve: { amount: '200.00', currency: 'ARS' },
      protectedFunds: { amount: '0.00', currency: 'ARS' },
      minProjectedBalance: { amount: min, currency: 'ARS' },
      capacity: { amount: '0.00', currency: 'ARS' },
    },
  };
}

const openPeriod: AccountingPeriod = {
  id: 'period-1',
  code: '2026-10',
  startsOn: '2026-10-01',
  endsOn: '2026-10-31',
  status: 'ABIERTO',
};

const accountMaster: Master = {
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
};

const capexConfig = {
  threshold: { amount: '1000.00', currency: 'ARS' as const },
  usefulLifeMonths: 60,
  residual: { amount: '0.00', currency: 'ARS' as const },
  capitalizeLedgerAccountId: '1.3',
  expenseLedgerAccountId: '5.11',
  accumulatedDepreciationLedgerAccountId: '1.3.9',
  depreciationExpenseLedgerAccountId: '5.9',
};

function createService(options: {
  capacityResult?: Result<InvestmentCapacity>;
  authorize?: Authorizer;
} = {}) {
  const savedInvestments: Investment[] = [];
  const savedEvaluations: InvestmentEvaluation[] = [];
  const savedMovements: AccountMovement[] = [];
  const savedEntries: JournalEntry[] = [];
  const auditEvents: AuditEventInput[] = [];
  let nextId = 0;
  const createId = () => `id-${++nextId}`;

  const investments: InvestmentRepository = {
    async findById(id) {
      return savedInvestments.find((i) => i.id === id) ?? null;
    },
    async save(investment) {
      savedInvestments.push(investment);
      return investment;
    },
    async update(investment) {
      const index = savedInvestments.findIndex((i) => i.id === investment.id);
      if (index >= 0) savedInvestments[index] = investment;
      return investment;
    },
  };

  const evaluations: InvestmentEvaluationRepository = {
    async save(evaluation) {
      savedEvaluations.push(evaluation);
      return evaluation;
    },
  };

  const forecast = {
    async capacityToInvest(_ctx: CommandContext, _cmd: CapacityToInvestCommand) {
      return options.capacityResult ?? capacityResult('500.00');
    },
  };

  const movements: AccountMovementRepository = {
    async findByAccount(accountId) {
      return savedMovements.filter((m) => m.accountId === accountId);
    },
    async findByAccountIds(accountIds) {
      return savedMovements.filter((m) => accountIds.includes(m.accountId));
    },
    async save(movement) {
      savedMovements.push(movement);
      return movement;
    },
  };

  const masterRepository: MasterRepository = {
    async findById(entityType, id) {
      return entityType === 'ACCOUNT' && id === 'acc-1' ? accountMaster : null;
    },
    async findByCode() {
      return null;
    },
    async findAll() {
      return [accountMaster];
    },
    async save(master) {
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
      return savedEntries.find((e) => e.sourceDocumentType === sourceDocumentType && e.sourceDocumentId === sourceDocumentId) ?? null;
    },
    async save(entry) {
      savedEntries.push(entry);
      return entry;
    },
    async markReversed() {},
  };

  const journal = new JournalService({ periods, entries: entriesRepo, audit: { record: async () => {} }, createId });

  const authorize: Authorizer = options.authorize ?? (async () => ({ ok: true, value: undefined }));
  const audit: AuditRecorder = {
    async record(event) {
      auditEvents.push(event);
    },
  };

  const service = new InvestmentsService({
    investments,
    evaluations,
    forecast,
    movements,
    masters: masterRepository,
    periods,
    journal,
    capex: capexConfig,
    authorize,
    audit,
    createId,
  });

  return { service, savedInvestments, savedEvaluations, savedMovements, savedEntries, auditEvents };
}

const candidate = {
  concept: 'Equipamiento nuevo',
  amount: { amount: '300.00', currency: 'ARS' as const },
  tentativeDate: '2026-11-01',
};

async function createAndEvaluate(service: InvestmentsService) {
  const created = await service.createCandidate(ctx, candidate);
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error('no creado');
  const evaluated = await service.evaluate(ctx, { investmentId: created.value.id, scenario: 'BASE' });
  expect(evaluated.ok).toBe(true);
  return created.value.id;
}

describe('InvestmentsService.createCandidate', () => {
  it('crea candidata en BORRADOR y audita', async () => {
    const { service, savedInvestments, auditEvents } = createService();

    const result = await service.createCandidate(ctx, candidate);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('BORRADOR');
    expect(savedInvestments).toHaveLength(1);
    expect(auditEvents[0].action).toBe('INVESTMENT_CANDIDATE_CREATED');
  });
});

describe('InvestmentsService.evaluate', () => {
  it('evalua y marca EVALUADA sin asiento', async () => {
    const { service, savedInvestments, savedEvaluations } = createService();

    const id = await createAndEvaluate(service);

    expect(savedInvestments[0].status).toBe('EVALUADA');
    expect(savedEvaluations).toHaveLength(1);
    expect(savedEvaluations[0].investmentId).toBe(id);
    expect(savedEvaluations[0].minProjectedBalance.amount).toBe('500.00');
    expect(savedEvaluations[0].confidence).toBe('MEDIA');
  });

  it('rechaza evaluar una inversion ya decidida', async () => {
    const { service } = createService();
    const id = await createAndEvaluate(service);
    await service.decide(ctx, { investmentId: id, decision: 'APROBADA', reason: '' });

    const result = await service.evaluate(ctx, { investmentId: id, scenario: 'BASE' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_INVESTMENT_STATE');
  });
});

describe('InvestmentsService.decide', () => {
  it('aprueba con capacidad conservadora suficiente', async () => {
    const { service, savedInvestments } = createService();
    const id = await createAndEvaluate(service);

    const result = await service.decide(ctx, { investmentId: id, decision: 'APROBADA', reason: 'ok' });

    expect(result.ok).toBe(true);
    expect(savedInvestments[0].status).toBe('APROBADA');
  });

  it('rechaza aprobar si excede la capacidad conservadora', async () => {
    const { service } = createService({ capacityResult: capacityResult('150.00') });
    const id = await createAndEvaluate(service);

    const result = await service.decide(ctx, { investmentId: id, decision: 'APROBADA', reason: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVESTMENT_EXCEEDS_CAPACITY');
  });

  it('aprueba si excede la capacidad con confirmExceedsCapacity', async () => {
    const { service, savedInvestments } = createService({ capacityResult: capacityResult('150.00') });
    const id = await createAndEvaluate(service);

    const result = await service.decide(ctx, {
      investmentId: id,
      decision: 'APROBADA',
      reason: 'ok',
      confirmExceedsCapacity: true,
    });

    expect(result.ok).toBe(true);
    expect(savedInvestments[0].status).toBe('APROBADA');
  });

  it('exige motivo para postergar o rechazar', async () => {
    const { service } = createService();
    const id = await createAndEvaluate(service);

    const result = await service.decide(ctx, { investmentId: id, decision: 'RECHAZADA', reason: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MISSING_REASON');
  });

  it('rechaza sin permiso de aprobacion', async () => {
    const denied: Authorizer = async () => ({
      ok: false,
      error: { code: 'PERMISSION_DENIED', message: 'Sin permiso.', recoverable: false },
    });
    const { service } = createService({ authorize: denied });

    const result = await service.decide(ctx, { investmentId: 'x', decision: 'APROBADA', reason: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});

async function createApprovedWithAmount(service: InvestmentsService, amount: string) {
  const created = await service.createCandidate(ctx, { ...candidate, amount: { amount, currency: 'ARS' } });
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error('no creado');
  const evaluated = await service.evaluate(ctx, { investmentId: created.value.id, scenario: 'BASE' });
  expect(evaluated.ok).toBe(true);
  const decided = await service.decide(ctx, { investmentId: created.value.id, decision: 'APROBADA', reason: 'ok' });
  expect(decided.ok).toBe(true);
  return created.value.id;
}

describe('InvestmentsService.registerInvestmentPayment', () => {
  it('capitaliza en 1.3 cuando el monto supera el umbral', async () => {
    const { service, savedInvestments, savedMovements, savedEntries } = createService();
    const id = await createApprovedWithAmount(service, '2000.00');

    const result = await service.registerInvestmentPayment({ ...ctx, idempotencyKey: 'pay-1' }, {
      investmentId: id,
      accountId: 'acc-1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('PAGADA');
    expect(result.value.capitalized).toBe(true);
    expect(result.value.usefulLifeMonths).toBe(60);
    expect(savedInvestments[0].status).toBe('PAGADA');

    const entry = savedEntries.find((e) => e.sourceDocumentType === 'investment_payment');
    expect(entry?.lines[0].ledgerAccountId).toBe('1.3');
    expect(entry?.lines[1].ledgerAccountId).toBe('1.1.1');
    expect(savedMovements).toHaveLength(1);
    expect(savedMovements[0].direction).toBe('OUT');
  });

  it('gasta en 5.11 cuando el monto no supera el umbral', async () => {
    const { service, savedEntries } = createService();
    const id = await createApprovedWithAmount(service, '500.00');

    const result = await service.registerInvestmentPayment({ ...ctx, idempotencyKey: 'pay-1' }, {
      investmentId: id,
      accountId: 'acc-1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.capitalized).toBe(false);
    expect(result.value.usefulLifeMonths).toBeNull();

    const entry = savedEntries.find((e) => e.sourceDocumentType === 'investment_payment');
    expect(entry?.lines[0].ledgerAccountId).toBe('5.11');
  });

  it('rechaza pagar si no esta aprobada', async () => {
    const { service } = createService();
    const id = await createAndEvaluate(service);

    const result = await service.registerInvestmentPayment({ ...ctx, idempotencyKey: 'pay-1' }, {
      investmentId: id,
      accountId: 'acc-1',
      effectiveDate: '2026-10-13',
      periodId: 'period-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_INVESTMENT_STATE');
  });
});
