import type { AuditRecorder } from '../domain/audit';
import { domainError } from '../domain/errors';
import { isCurrentAt, type MasterEntityType } from '../domain/masters';
import { isPeriodClosed } from '../domain/periods';
import {
  isAnnullable,
  isConfirmable,
  isDuplicateObligation,
  validatePositiveAmount,
  type Obligation,
  type ObligationPriority,
} from '../domain/obligations';
import type { AccountingPeriodRepository } from './journal-service';
import type { MasterRepository } from './master-data-service';
import type { Authorizer } from './permission-service';
import type { CommandContext, Money, Result } from '../domain/types';

export type CreateObligationCommand = {
  concept: string;
  personId: string;
  categoryId: string;
  resultLineId: string;
  plannedAccountId: string;
  amount: Money;
  isEstimated: boolean;
  dueDate: string;
  expectedPaymentDate?: string;
  priority?: ObligationPriority;
  periodId: string;
  confirmPossibleDuplicate?: boolean;
};

export type ConfirmDefinitiveAmountCommand = {
  obligationId: string;
  finalAmount: Money;
};

export type AnnulObligationCommand = {
  obligationId: string;
  reason: string;
};

export type ObligationRepository = {
  findById(id: string): Promise<Obligation | null>;
  findAll(): Promise<Obligation[]>;
  save(obligation: Obligation): Promise<Obligation>;
  update(obligation: Obligation): Promise<Obligation>;
};

export type ObligationsServiceDependencies = {
  obligations: ObligationRepository;
  masters: MasterRepository;
  periods: AccountingPeriodRepository;
  authorize: Authorizer;
  audit: AuditRecorder;
  createId: () => string;
};

function missingField(field: string): Result<never> {
  return {
    ok: false,
    error: domainError('MISSING_REQUIRED_FIELD', `El campo ${field} es obligatorio.`, true, { field }),
  };
}

export class ObligationsService {
  constructor(private readonly dependencies: ObligationsServiceDependencies) {}

  async createObligation(ctx: CommandContext, command: CreateObligationCommand): Promise<Result<Obligation>> {
    const authorized = await this.dependencies.authorize(ctx, 'CREATE_OBLIGATION');
    if (!authorized.ok) return authorized;

    if (command.concept.trim().length === 0) return missingField('concept');
    if (command.dueDate.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_DUE_DATE', 'La fecha de vencimiento es obligatoria.', true, { field: 'dueDate' }),
      };
    }
    if (
      command.personId.trim().length === 0 ||
      command.categoryId.trim().length === 0 ||
      command.resultLineId.trim().length === 0 ||
      command.plannedAccountId.trim().length === 0 ||
      command.periodId.trim().length === 0
    ) {
      return missingField('personId/categoryId/resultLineId/plannedAccountId/periodId');
    }

    const amount = validatePositiveAmount(command.amount);
    if (!amount.ok) return amount;

    const period = await this.dependencies.periods.findById(command.periodId);
    if (!period) {
      return {
        ok: false,
        error: domainError('PERIOD_NOT_FOUND', 'El periodo contable no existe.', true, { periodId: command.periodId }),
      };
    }
    if (isPeriodClosed(period)) {
      return {
        ok: false,
        error: domainError('PERIOD_CLOSED', 'No se pueden registrar obligaciones en un periodo cerrado.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const references: Array<{ entityType: MasterEntityType; id: string; label: string }> = [
      { entityType: 'PERSON', id: command.personId, label: 'persona' },
      { entityType: 'CATEGORY', id: command.categoryId, label: 'categoria' },
      { entityType: 'RESULT_LINE', id: command.resultLineId, label: 'linea de resultado' },
      { entityType: 'ACCOUNT', id: command.plannedAccountId, label: 'cuenta prevista' },
    ];

    for (const ref of references) {
      const master = await this.dependencies.masters.findById(ref.entityType, ref.id);
      if (!master) {
        return {
          ok: false,
          error: domainError('MASTER_NOT_FOUND', `El maestro ${ref.label} referenciado no existe.`, true, {
            entityType: ref.entityType,
            id: ref.id,
          }),
        };
      }
      if (!isCurrentAt(master, ctx.now)) {
        return {
          ok: false,
          error: domainError('MASTER_NOT_CURRENT', `El maestro ${ref.label} no esta vigente a la fecha.`, true, {
            entityType: ref.entityType,
            id: ref.id,
          }),
        };
      }
    }

    const existing = await this.dependencies.obligations.findAll();
    const duplicates = existing.filter(item =>
      isDuplicateObligation(item, {
        personId: command.personId,
        concept: command.concept,
        amount: command.amount,
        dueDate: command.dueDate,
      })
    );

    if (duplicates.length > 0 && command.confirmPossibleDuplicate !== true) {
      return {
        ok: false,
        error: domainError('POSSIBLE_DUPLICATE_OBLIGATION', 'Se encontro una posible obligacion duplicada.', true, {
          candidates: duplicates.map(d => ({ id: d.id, concept: d.concept, dueDate: d.dueDate })),
        }),
      };
    }

    const obligation: Obligation = {
      id: this.dependencies.createId(),
      concept: command.concept.trim(),
      personId: command.personId,
      categoryId: command.categoryId,
      resultLineId: command.resultLineId,
      plannedAccountId: command.plannedAccountId,
      estimatedAmount: command.amount,
      estimatedAmountVersion: 1,
      finalAmount: command.isEstimated ? null : command.amount,
      isEstimated: command.isEstimated,
      dueDate: command.dueDate,
      expectedPaymentDate: command.expectedPaymentDate ?? null,
      priority: command.priority ?? 'P3',
      status: 'PENDIENTE',
      periodId: command.periodId,
      recurrenceRuleId: null,
      source: 'REAL',
      createdBy: ctx.actorUserId,
      createdAt: ctx.now,
      idempotencyKey: ctx.idempotencyKey,
    };

    const saved = await this.dependencies.obligations.save(obligation);
    await this.dependencies.audit.record({
      entityType: 'obligation',
      entityId: saved.id,
      action: 'OBLIGATION_CREATED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: saved };
  }

  async confirmDefinitiveAmount(
    ctx: CommandContext,
    command: ConfirmDefinitiveAmountCommand
  ): Promise<Result<Obligation>> {
    const authorized = await this.dependencies.authorize(ctx, 'MODIFY_OBLIGATION');
    if (!authorized.ok) return authorized;

    const amount = validatePositiveAmount(command.finalAmount);
    if (!amount.ok) return amount;

    const obligation = await this.dependencies.obligations.findById(command.obligationId);
    if (!obligation) {
      return {
        ok: false,
        error: domainError('OBLIGATION_NOT_FOUND', 'La obligacion no existe.', true, {
          obligationId: command.obligationId,
        }),
      };
    }

    if (!isConfirmable(obligation.status)) {
      return {
        ok: false,
        error: domainError('INVALID_OBLIGATION_STATE', 'La obligacion no se puede confirmar en su estado actual.', true, {
          obligationId: obligation.id,
          status: obligation.status,
        }),
      };
    }

    const updated: Obligation = {
      ...obligation,
      finalAmount: command.finalAmount,
      isEstimated: false,
      estimatedAmountVersion: obligation.estimatedAmountVersion + 1,
    };

    const saved = await this.dependencies.obligations.update(updated);
    await this.dependencies.audit.record({
      entityType: 'obligation',
      entityId: saved.id,
      action: 'OBLIGATION_CONFIRMED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: `Importe definitivo confirmado (estimado anterior: ${obligation.estimatedAmount.amount} ${obligation.estimatedAmount.currency})`,
    });

    return { ok: true, value: saved };
  }

  async annulObligation(ctx: CommandContext, command: AnnulObligationCommand): Promise<Result<Obligation>> {
    const authorized = await this.dependencies.authorize(ctx, 'MODIFY_OBLIGATION');
    if (!authorized.ok) return authorized;

    if (command.reason.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REASON', 'La anulacion requiere un motivo.', true),
      };
    }

    const obligation = await this.dependencies.obligations.findById(command.obligationId);
    if (!obligation) {
      return {
        ok: false,
        error: domainError('OBLIGATION_NOT_FOUND', 'La obligacion no existe.', true, {
          obligationId: command.obligationId,
        }),
      };
    }

    if (!isAnnullable(obligation.status)) {
      return {
        ok: false,
        error: domainError('INVALID_OBLIGATION_STATE', 'La obligacion no se puede anular en su estado actual.', true, {
          obligationId: obligation.id,
          status: obligation.status,
        }),
      };
    }

    const updated: Obligation = { ...obligation, status: 'ANULADA' };
    const saved = await this.dependencies.obligations.update(updated);
    await this.dependencies.audit.record({
      entityType: 'obligation',
      entityId: saved.id,
      action: 'OBLIGATION_ANNULLED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: command.reason.trim(),
    });

    return { ok: true, value: saved };
  }
}
