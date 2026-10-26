import type { AuditRecorder } from '../domain/audit';
import { domainError } from '../domain/errors';
import { scenarioConfidence, type ForecastScenario } from '../domain/forecast';
import {
  INVESTMENT_DECISIONS,
  isDecidable,
  isEvaluatable,
  type Investment,
  type InvestmentDecision,
  type InvestmentEvaluation,
} from '../domain/investments';
import { toMinor } from '../domain/money';
import { validatePositiveAmount } from '../domain/obligations';
import type { ForecastService } from './forecast-service';
import type { Authorizer } from './permission-service';
import type { CommandContext, Money, Result } from '../domain/types';

export type CreateCandidateCommand = {
  concept: string;
  amount: Money;
  tentativeDate: string;
};

export type EvaluateCommand = {
  investmentId: string;
  scenario: ForecastScenario;
};

export type DecideCommand = {
  investmentId: string;
  decision: InvestmentDecision;
  reason: string;
  confirmExceedsCapacity?: boolean;
};

export type InvestmentRepository = {
  findById(id: string): Promise<Investment | null>;
  save(investment: Investment): Promise<Investment>;
  update(investment: Investment): Promise<Investment>;
};

export type InvestmentEvaluationRepository = {
  save(evaluation: InvestmentEvaluation): Promise<InvestmentEvaluation>;
};

export type InvestmentsServiceDependencies = {
  investments: InvestmentRepository;
  evaluations: InvestmentEvaluationRepository;
  forecast: Pick<ForecastService, 'capacityToInvest'>;
  authorize: Authorizer;
  audit: AuditRecorder;
  createId: () => string;
};

export class InvestmentsService {
  constructor(private readonly dependencies: InvestmentsServiceDependencies) {}

  async createCandidate(
    ctx: CommandContext,
    command: CreateCandidateCommand
  ): Promise<Result<Investment>> {
    const authorized = await this.dependencies.authorize(ctx, 'SIMULATE_INVESTMENT');
    if (!authorized.ok) return authorized;

    if (command.concept.trim().length === 0 || command.tentativeDate.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'El concepto y la fecha tentativa son obligatorios.', true, {
          fields: ['concept', 'tentativeDate'],
        }),
      };
    }

    const amount = validatePositiveAmount(command.amount);
    if (!amount.ok) return amount;

    const investment: Investment = {
      id: this.dependencies.createId(),
      concept: command.concept.trim(),
      amount: command.amount,
      tentativeDate: command.tentativeDate,
      status: 'BORRADOR',
      decisionNote: null,
      createdBy: ctx.actorUserId,
      createdAt: ctx.now,
    };

    await this.dependencies.investments.save(investment);

    await this.dependencies.audit.record({
      entityType: 'investment',
      entityId: investment.id,
      action: 'INVESTMENT_CANDIDATE_CREATED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: investment };
  }

  async evaluate(ctx: CommandContext, command: EvaluateCommand): Promise<Result<InvestmentEvaluation>> {
    const authorized = await this.dependencies.authorize(ctx, 'SIMULATE_INVESTMENT');
    if (!authorized.ok) return authorized;

    const investment = await this.dependencies.investments.findById(command.investmentId);
    if (!investment) {
      return {
        ok: false,
        error: domainError('INVESTMENT_NOT_FOUND', 'La inversion candidata no existe.', true, {
          investmentId: command.investmentId,
        }),
      };
    }
    if (!isEvaluatable(investment.status)) {
      return {
        ok: false,
        error: domainError('INVALID_INVESTMENT_STATE', 'La inversion no puede evaluarse en su estado actual.', true, {
          investmentId: investment.id,
          status: investment.status,
        }),
      };
    }

    const capacity = await this.dependencies.forecast.capacityToInvest(ctx, {
      scenario: command.scenario,
      candidateInvestment: { date: investment.tentativeDate, amount: investment.amount },
    });
    if (!capacity.ok) return capacity;

    const evaluation: InvestmentEvaluation = {
      id: this.dependencies.createId(),
      investmentId: investment.id,
      scenario: command.scenario,
      minProjectedBalance: capacity.value.minProjectedBalance,
      capacityAmount: capacity.value.capacity,
      confidence: scenarioConfidence(command.scenario),
      evaluatedAt: ctx.now,
    };

    await this.dependencies.evaluations.save(evaluation);

    if (investment.status !== 'EVALUADA') {
      await this.dependencies.investments.update({ ...investment, status: 'EVALUADA' });
    }

    return { ok: true, value: evaluation };
  }

  async decide(ctx: CommandContext, command: DecideCommand): Promise<Result<Investment>> {
    const authorized = await this.dependencies.authorize(ctx, 'APPROVE_INVESTMENT');
    if (!authorized.ok) return authorized;

    if (!INVESTMENT_DECISIONS.includes(command.decision)) {
      return {
        ok: false,
        error: domainError('VALIDATION_FAILED', 'La decision de inversion no es valida.', true, {
          decision: command.decision,
        }),
      };
    }

    const investment = await this.dependencies.investments.findById(command.investmentId);
    if (!investment) {
      return {
        ok: false,
        error: domainError('INVESTMENT_NOT_FOUND', 'La inversion candidata no existe.', true, {
          investmentId: command.investmentId,
        }),
      };
    }
    if (!isDecidable(investment.status)) {
      return {
        ok: false,
        error: domainError('INVALID_INVESTMENT_STATE', 'La inversion debe estar evaluada antes de decidir.', true, {
          investmentId: investment.id,
          status: investment.status,
        }),
      };
    }

    if (command.decision !== 'APROBADA' && command.reason.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REASON', 'Postergar o rechazar requiere un motivo.', true),
      };
    }

    if (command.decision === 'APROBADA') {
      // Guarda F2 §16: aprobar solo si el escenario conservador respeta la reserva.
      const capacity = await this.dependencies.forecast.capacityToInvest(ctx, {
        scenario: 'CONSERVADOR',
        candidateInvestment: { date: investment.tentativeDate, amount: investment.amount },
      });
      if (!capacity.ok) return capacity;

      const raw =
        toMinor(capacity.value.minProjectedBalance) -
        toMinor(capacity.value.reserve) -
        toMinor(capacity.value.protectedFunds);
      // P6: avisa (recuperable), no bloquea. Solo se exige confirmación explícita.
      if (raw < 0n && command.confirmExceedsCapacity !== true) {
        return {
          ok: false,
          error: domainError('INVESTMENT_EXCEEDS_CAPACITY', 'La inversion supera la capacidad en el escenario conservador.', true, {
            investmentId: investment.id,
            minProjectedBalance: capacity.value.minProjectedBalance.amount,
            reserve: capacity.value.reserve.amount,
          }),
        };
      }
    }

    const decided: Investment = {
      ...investment,
      status: command.decision,
      decisionNote: command.reason.trim() || null,
    };

    await this.dependencies.investments.update(decided);

    await this.dependencies.audit.record({
      entityType: 'investment',
      entityId: decided.id,
      action: 'INVESTMENT_DECIDED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: command.reason.trim() || null,
    });

    return { ok: true, value: decided };
  }
}
