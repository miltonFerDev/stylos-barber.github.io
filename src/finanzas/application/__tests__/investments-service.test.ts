import { describe, expect, it } from 'vitest';
import {
  InvestmentsService,
  type InvestmentEvaluationRepository,
  type InvestmentRepository,
} from '../investments-service';
import type { AuditEventInput, AuditRecorder } from '../../domain/audit';
import type { Investment, InvestmentEvaluation } from '../../domain/investments';
import type { Authorizer } from '../permission-service';
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

function createService(options: {
  capacityResult?: Result<InvestmentCapacity>;
  authorize?: Authorizer;
} = {}) {
  const savedInvestments: Investment[] = [];
  const savedEvaluations: InvestmentEvaluation[] = [];
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
    authorize,
    audit,
    createId,
  });

  return { service, savedInvestments, savedEvaluations, auditEvents };
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
