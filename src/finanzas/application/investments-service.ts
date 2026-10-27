import type { AuditRecorder } from '../domain/audit';
import type { AccountMovementRepository } from '../domain/account-movements';
import type { CapexConfig } from '../domain/depreciation';
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
import type { JournalLineDraft } from '../domain/journal';
import { isCurrentAt } from '../domain/masters';
import { toMinor } from '../domain/money';
import { validatePositiveAmount } from '../domain/obligations';
import { isPeriodOpen } from '../domain/periods';
import type { ForecastService } from './forecast-service';
import type { AccountingPeriodRepository, JournalService } from './journal-service';
import type { MasterRepository } from './master-data-service';
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

export type RegisterInvestmentPaymentCommand = {
  investmentId: string;
  accountId: string;
  effectiveDate: string;
  periodId: string;
};

export type InvestmentRepository = {
  findById(id: string): Promise<Investment | null>;
  findAllCapitalized(): Promise<Investment[]>;
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
  movements: AccountMovementRepository;
  masters: MasterRepository;
  periods: AccountingPeriodRepository;
  journal: Pick<JournalService, 'postEntry'>;
  capex: CapexConfig;
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
      paidAt: null,
      capitalized: null,
      usefulLifeMonths: null,
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

  async registerInvestmentPayment(
    ctx: CommandContext,
    command: RegisterInvestmentPaymentCommand
  ): Promise<Result<Investment>> {
    const authorized = await this.dependencies.authorize(ctx, 'APPROVE_INVESTMENT');
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
    if (investment.status !== 'APROBADA') {
      return {
        ok: false,
        error: domainError('INVALID_INVESTMENT_STATE', 'La inversion debe estar aprobada para pagarse.', true, {
          investmentId: investment.id,
          status: investment.status,
        }),
      };
    }

    if (
      command.accountId.trim().length === 0 ||
      command.effectiveDate.trim().length === 0 ||
      command.periodId.trim().length === 0
    ) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'Faltan campos obligatorios.', true),
      };
    }

    const account = await this.dependencies.masters.findById('ACCOUNT', command.accountId);
    if (!account || account.entityType !== 'ACCOUNT') {
      return {
        ok: false,
        error: domainError('MASTER_NOT_FOUND', 'La cuenta no existe.', true, { id: command.accountId }),
      };
    }
    if (account.ownership !== 'PROPIA' || !account.isAvailable || !isCurrentAt(account, ctx.now)) {
      return {
        ok: false,
        error: domainError('ACCOUNT_NOT_AVAILABLE', 'La cuenta no esta disponible.', true, { accountId: account.id }),
      };
    }

    const period = await this.dependencies.periods.findById(command.periodId);
    if (!period) {
      return {
        ok: false,
        error: domainError('PERIOD_NOT_FOUND', 'El periodo contable no existe.', true, { periodId: command.periodId }),
      };
    }
    if (!isPeriodOpen(period)) {
      return {
        ok: false,
        error: domainError('PERIOD_CLOSED', 'No se puede pagar en un periodo cerrado o en revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const capitalized = toMinor(investment.amount) >= toMinor(this.dependencies.capex.threshold);
    const assetLedger = capitalized
      ? this.dependencies.capex.capitalizeLedgerAccountId
      : this.dependencies.capex.expenseLedgerAccountId;
    const zero: Money = { amount: '0.00', currency: investment.amount.currency };

    const entryResult = await this.dependencies.journal.postEntry(ctx, {
      periodId: period.id,
      entryDate: command.effectiveDate,
      sourceDocumentType: 'investment_payment',
      sourceDocumentId: investment.id,
      description: investment.concept,
      lines: [
        { ledgerAccountId: assetLedger, debit: investment.amount, credit: zero },
        { ledgerAccountId: account.ledgerAccountId, debit: zero, credit: investment.amount },
      ] as JournalLineDraft[],
    });

    if (!entryResult.ok) return entryResult;

    await this.dependencies.movements.save({
      id: this.dependencies.createId(),
      accountId: account.id,
      effectiveDate: command.effectiveDate,
      amount: investment.amount,
      direction: 'OUT',
      sourceDocumentType: 'investment_payment',
      sourceDocumentId: investment.id,
      journalEntryId: entryResult.value.id,
      idempotencyKey: ctx.idempotencyKey,
      createdAt: ctx.now,
    });

    const paid: Investment = {
      ...investment,
      status: 'PAGADA',
      paidAt: command.effectiveDate,
      capitalized,
      usefulLifeMonths: capitalized ? this.dependencies.capex.usefulLifeMonths : null,
    };

    await this.dependencies.investments.update(paid);

    await this.dependencies.audit.record({
      entityType: 'investment',
      entityId: paid.id,
      action: 'INVESTMENT_PAID',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: paid };
  }
}
