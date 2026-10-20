import type { AccountMovementRepository } from '../domain/account-movements';
import type { AuditRecorder } from '../domain/audit';
import { domainError } from '../domain/errors';
import type { JournalLineDraft } from '../domain/journal';
import { isCurrentAt } from '../domain/masters';
import { isPeriodOpen } from '../domain/periods';
import { validatePositiveAmount, type Obligation } from '../domain/obligations';
import {
  exigibleOf,
  moneyToMinor,
  nextObligationStatus,
  sumAppliedMinor,
  type Payment,
  type PaymentApplication,
} from '../domain/payments';
import type { AccountingPeriodRepository, JournalService } from './journal-service';
import type { MasterRepository } from './master-data-service';
import type { ObligationRepository } from './obligations-service';
import type { Authorizer } from './permission-service';
import type { CommandContext, Money, Result } from '../domain/types';

export type PaymentApplicationCommand = {
  obligationId: string;
  appliedAmount: Money;
};

export type RegisterPaymentCommand = {
  accountId: string;
  effectiveDate: string;
  periodId: string;
  amount: Money;
  applications: PaymentApplicationCommand[];
  concept?: string;
  resultLineId?: string;
};

export type PaymentRepository = {
  findByIdempotencyKey(key: string): Promise<Payment | null>;
  save(payment: Payment): Promise<Payment>;
};

export type PaymentApplicationRepository = {
  findAll(): Promise<PaymentApplication[]>;
  findByObligation(obligationId: string): Promise<PaymentApplication[]>;
  save(application: PaymentApplication): Promise<PaymentApplication>;
};

export type { AccountMovementRepository };

export type PaymentsServiceDependencies = {
  payments: PaymentRepository;
  applications: PaymentApplicationRepository;
  movements: AccountMovementRepository;
  obligations: ObligationRepository;
  masters: MasterRepository;
  periods: AccountingPeriodRepository;
  journal: Pick<JournalService, 'postEntry'>;
  authorize: Authorizer;
  audit: AuditRecorder;
  createId: () => string;
};

export class PaymentsService {
  constructor(private readonly dependencies: PaymentsServiceDependencies) {}

  async registerPayment(ctx: CommandContext, command: RegisterPaymentCommand): Promise<Result<Payment>> {
    const authorized = await this.dependencies.authorize(ctx, 'CONFIRM_PAYMENT');
    if (!authorized.ok) return authorized;

    const previous = await this.dependencies.payments.findByIdempotencyKey(ctx.idempotencyKey);
    if (previous) {
      return { ok: true, value: previous };
    }

    if (command.effectiveDate.trim().length === 0 || command.periodId.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'La fecha efectiva y el periodo son obligatorios.', true, {
          fields: ['effectiveDate', 'periodId'],
        }),
      };
    }

    const amount = validatePositiveAmount(command.amount);
    if (!amount.ok) return amount;

    const hasApplications = command.applications.length > 0;
    if (!hasApplications) {
      if (!command.concept?.trim() || !command.resultLineId?.trim()) {
        return {
          ok: false,
          error: domainError('MISSING_REQUIRED_FIELD', 'El egreso directo requiere concepto y linea de resultado.', true, {
            fields: ['concept', 'resultLineId'],
          }),
        };
      }
    }

    const account = await this.dependencies.masters.findById('ACCOUNT', command.accountId);
    if (!account || account.entityType !== 'ACCOUNT') {
      return {
        ok: false,
        error: domainError('MASTER_NOT_FOUND', 'La cuenta pagadora no existe.', true, { id: command.accountId }),
      };
    }
    if (account.ownership !== 'PROPIA' || !account.isAvailable || !account.isReconcilable || !isCurrentAt(account, ctx.now)) {
      return {
        ok: false,
        error: domainError('ACCOUNT_NOT_AVAILABLE', 'La cuenta no esta disponible para pagar.', true, {
          accountId: account.id,
          ownership: account.ownership,
        }),
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

    if (hasApplications) {
      const appliedTotal = sumAppliedMinor(command.applications.map(app => app.appliedAmount));
      const amountMinor = moneyToMinor(command.amount);
      if (appliedTotal !== amountMinor) {
        return {
          ok: false,
          error: domainError('PAYMENT_APPLICATION_MISMATCH', 'La suma de aplicaciones debe igualar el importe del pago.', true, {
            applied: appliedTotal.toString(),
            amount: amountMinor.toString(),
          }),
        };
      }
    }

    const zero: Money = { amount: '0.00', currency: command.amount.currency };
    const debitLines: JournalLineDraft[] = [];

    for (const app of command.applications) {
      const obligation = await this.dependencies.obligations.findById(app.obligationId);
      if (!obligation) {
        return {
          ok: false,
          error: domainError('OBLIGATION_NOT_FOUND', 'La obligacion no existe.', true, {
            obligationId: app.obligationId,
          }),
        };
      }

      if (obligation.status !== 'PENDIENTE' && obligation.status !== 'PROGRAMADA' && obligation.status !== 'PARCIAL') {
        return {
          ok: false,
          error: domainError('INVALID_OBLIGATION_STATE', 'La obligacion no se puede pagar en su estado actual.', true, {
            obligationId: obligation.id,
            status: obligation.status,
          }),
        };
      }

      const resultLine = await this.dependencies.masters.findById('RESULT_LINE', obligation.resultLineId);
      if (!resultLine || resultLine.entityType !== 'RESULT_LINE') {
        return {
          ok: false,
          error: domainError('MASTER_NOT_FOUND', 'La linea de resultado de la obligacion no existe.', true, {
            id: obligation.resultLineId,
          }),
        };
      }

      const existingApps = await this.dependencies.applications.findByObligation(obligation.id);
      const existingMinor = sumAppliedMinor(existingApps.map(e => e.appliedAmount));
      const newMinor = moneyToMinor(app.appliedAmount);
      const exigibleMinor = moneyToMinor(exigibleOf(obligation));

      if (existingMinor + newMinor > exigibleMinor) {
        return {
          ok: false,
          error: domainError('PAYMENT_EXCEEDS_PENDIENTE', 'El pago supera el saldo pendiente de la obligacion.', true, {
            obligationId: obligation.id,
            pendiente: (exigibleMinor - existingMinor).toString(),
            aplicado: newMinor.toString(),
          }),
        };
      }

      debitLines.push({
        ledgerAccountId: resultLine.ledgerAccountId,
        debit: app.appliedAmount,
        credit: zero,
      });
    }

    if (!hasApplications) {
      const resultLine = await this.dependencies.masters.findById('RESULT_LINE', command.resultLineId as string);
      if (!resultLine || resultLine.entityType !== 'RESULT_LINE') {
        return {
          ok: false,
          error: domainError('MASTER_NOT_FOUND', 'La linea de resultado no existe.', true, {
            id: command.resultLineId,
          }),
        };
      }
      debitLines.push({
        ledgerAccountId: resultLine.ledgerAccountId,
        debit: command.amount,
        credit: zero,
      });
    }

    const paymentId = this.dependencies.createId();

    const entryResult = await this.dependencies.journal.postEntry(ctx, {
      periodId: period.id,
      entryDate: command.effectiveDate,
      sourceDocumentType: 'payment',
      sourceDocumentId: paymentId,
      description: hasApplications ? command.concept?.trim() || 'Pago de obligaciones' : (command.concept as string).trim(),
      lines: [
        ...debitLines,
        {
          ledgerAccountId: account.ledgerAccountId,
          debit: zero,
          credit: command.amount,
        },
      ],
    });

    if (!entryResult.ok) return entryResult;

    await this.dependencies.movements.save({
      id: this.dependencies.createId(),
      accountId: account.id,
      effectiveDate: command.effectiveDate,
      amount: command.amount,
      direction: 'OUT',
      sourceDocumentType: 'payment',
      sourceDocumentId: paymentId,
      journalEntryId: entryResult.value.id,
      idempotencyKey: ctx.idempotencyKey,
      createdAt: ctx.now,
    });

    const payment: Payment = {
      id: paymentId,
      effectiveDate: command.effectiveDate,
      accountId: account.id,
      amount: command.amount,
      status: 'CONFIRMADO',
      attachmentRequired: false,
      idempotencyKey: ctx.idempotencyKey,
      source: 'REAL',
      createdBy: ctx.actorUserId,
      createdAt: ctx.now,
    };

    await this.dependencies.payments.save(payment);

    for (const app of command.applications) {
      await this.dependencies.applications.save({
        id: this.dependencies.createId(),
        paymentId,
        obligationId: app.obligationId,
        appliedAmount: app.appliedAmount,
      });

      const obligation = await this.dependencies.obligations.findById(app.obligationId);
      if (!obligation) continue;

      const existingApps = await this.dependencies.applications.findByObligation(obligation.id);
      const totalMinor = sumAppliedMinor(existingApps.map(e => e.appliedAmount));
      const exigibleMinor = moneyToMinor(exigibleOf(obligation));

      const updated: Obligation = { ...obligation, status: nextObligationStatus(totalMinor, exigibleMinor) };
      await this.dependencies.obligations.update(updated);
    }

    await this.dependencies.audit.record({
      entityType: 'payment',
      entityId: payment.id,
      action: 'PAYMENT_CREATED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: payment };
  }
}
