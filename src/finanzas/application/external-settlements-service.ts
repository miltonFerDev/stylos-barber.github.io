import type { AccountMovementRepository } from '../domain/account-movements';
import type { AuditRecorder } from '../domain/audit';
import { domainError } from '../domain/errors';
import {
  isExternalSettlementNature,
  type ExternalSettlement,
  type ExternalSettlementNature,
} from '../domain/external-settlements';
import type { JournalLineDraft } from '../domain/journal';
import { isCurrentAt } from '../domain/masters';
import { isPeriodOpen } from '../domain/periods';
import { validatePositiveAmount } from '../domain/obligations';
import type { AccountingPeriodRepository, JournalService } from './journal-service';
import type { MasterRepository } from './master-data-service';
import type { Authorizer } from './permission-service';
import type { CommandContext, Money, Result } from '../domain/types';

export type RegisterExternalPaymentCommand = {
  sourcePersonId: string;
  externalAccountId?: string;
  resultLineId: string;
  concept: string;
  amount: Money;
  nature: ExternalSettlementNature;
  effectiveDate: string;
  periodId: string;
  note?: string;
};

export type RegisterReimbursementCommand = {
  settlementId: string;
  accountId: string;
  effectiveDate: string;
  periodId: string;
  amount: Money;
};

export type ExternalSettlementRepository = {
  findByIdempotencyKey(key: string): Promise<ExternalSettlement | null>;
  findById(id: string): Promise<ExternalSettlement | null>;
  save(settlement: ExternalSettlement): Promise<ExternalSettlement>;
  update(settlement: ExternalSettlement): Promise<ExternalSettlement>;
};

export type ExternalSettlementsServiceDependencies = {
  settlements: ExternalSettlementRepository;
  movements: AccountMovementRepository;
  masters: MasterRepository;
  periods: AccountingPeriodRepository;
  journal: Pick<JournalService, 'postEntry'>;
  authorize: Authorizer;
  audit: AuditRecorder;
  createId: () => string;
  settlementLedgerAccounts: Record<ExternalSettlementNature, string>;
};

export class ExternalSettlementsService {
  constructor(private readonly dependencies: ExternalSettlementsServiceDependencies) {}

  async registerExternalPayment(
    ctx: CommandContext,
    command: RegisterExternalPaymentCommand
  ): Promise<Result<ExternalSettlement>> {
    const authorized = await this.dependencies.authorize(ctx, 'REGISTER_EXTERNAL_SETTLEMENT');
    if (!authorized.ok) return authorized;

    const previous = await this.dependencies.settlements.findByIdempotencyKey(ctx.idempotencyKey);
    if (previous) {
      return { ok: true, value: previous };
    }

    if (!isExternalSettlementNature(command.nature)) {
      return {
        ok: false,
        error: domainError('EXTERNAL_NATURE_UNDEFINED', 'La naturaleza del fondo externo no es valida.', true, {
          nature: command.nature,
        }),
      };
    }

    const amount = validatePositiveAmount(command.amount);
    if (!amount.ok) return amount;

    if (
      command.sourcePersonId.trim().length === 0 ||
      command.resultLineId.trim().length === 0 ||
      command.concept.trim().length === 0 ||
      command.effectiveDate.trim().length === 0 ||
      command.periodId.trim().length === 0
    ) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'Faltan campos obligatorios.', true),
      };
    }

    const resultLine = await this.dependencies.masters.findById('RESULT_LINE', command.resultLineId);
    if (!resultLine || resultLine.entityType !== 'RESULT_LINE') {
      return {
        ok: false,
        error: domainError('MASTER_NOT_FOUND', 'La linea de resultado no existe.', true, { id: command.resultLineId }),
      };
    }
    if (!isCurrentAt(resultLine, ctx.now)) {
      return {
        ok: false,
        error: domainError('MASTER_NOT_CURRENT', 'La linea de resultado no esta vigente.', true, {
          id: resultLine.id,
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
        error: domainError('PERIOD_CLOSED', 'No se puede registrar en un periodo cerrado o en revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const zero: Money = { amount: '0.00', currency: command.amount.currency };
    const settlementId = this.dependencies.createId();

    const entryResult = await this.dependencies.journal.postEntry(ctx, {
      periodId: period.id,
      entryDate: command.effectiveDate,
      sourceDocumentType: 'external_settlement',
      sourceDocumentId: settlementId,
      description: command.concept.trim(),
      lines: [
        { ledgerAccountId: resultLine.ledgerAccountId, debit: command.amount, credit: zero },
        { ledgerAccountId: this.dependencies.settlementLedgerAccounts[command.nature], debit: zero, credit: command.amount },
      ] as JournalLineDraft[],
    });

    if (!entryResult.ok) return entryResult;

    const settlement: ExternalSettlement = {
      id: settlementId,
      sourcePersonId: command.sourcePersonId,
      externalAccountId: command.externalAccountId ?? null,
      resultLineId: command.resultLineId,
      concept: command.concept.trim(),
      amount: command.amount,
      nature: command.nature,
      effectiveDate: command.effectiveDate,
      status: 'CONFIRMADO',
      note: command.note ?? null,
      idempotencyKey: ctx.idempotencyKey,
      source: 'REAL',
      createdBy: ctx.actorUserId,
      createdAt: ctx.now,
    };

    await this.dependencies.settlements.save(settlement);
    await this.dependencies.audit.record({
      entityType: 'external_settlement',
      entityId: settlement.id,
      action: 'EXTERNAL_SETTLEMENT_CREATED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: settlement };
  }

  async registerReimbursement(
    ctx: CommandContext,
    command: RegisterReimbursementCommand
  ): Promise<Result<ExternalSettlement>> {
    const authorized = await this.dependencies.authorize(ctx, 'REGISTER_EXTERNAL_SETTLEMENT');
    if (!authorized.ok) return authorized;

    const previous = await this.dependencies.settlements.findByIdempotencyKey(ctx.idempotencyKey);
    if (previous) {
      return { ok: true, value: previous };
    }

    const settlement = await this.dependencies.settlements.findById(command.settlementId);
    if (!settlement) {
      return {
        ok: false,
        error: domainError('SETTLEMENT_NOT_FOUND', 'El pago externo no existe.', true, {
          settlementId: command.settlementId,
        }),
      };
    }

    if (settlement.status !== 'CONFIRMADO') {
      return {
        ok: false,
        error: domainError('SETTLEMENT_ALREADY_REINTEGRADO', 'El pago externo ya fue reintegrado.', false, {
          settlementId: settlement.id,
          status: settlement.status,
        }),
      };
    }

    const amount = validatePositiveAmount(command.amount);
    if (!amount.ok) return amount;

    if (command.effectiveDate.trim().length === 0 || command.periodId.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'La fecha efectiva y el periodo son obligatorios.', true),
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
        error: domainError('PERIOD_CLOSED', 'No se puede reintegrar en un periodo cerrado o en revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const zero: Money = { amount: '0.00', currency: command.amount.currency };
    const contrapartidaLedger = this.dependencies.settlementLedgerAccounts[settlement.nature];

    const entryResult = await this.dependencies.journal.postEntry(ctx, {
      periodId: period.id,
      entryDate: command.effectiveDate,
      sourceDocumentType: 'external_settlement_reimbursement',
      sourceDocumentId: settlement.id,
      description: `Reintegro de fondo externo (${settlement.nature})`,
      lines: [
        { ledgerAccountId: contrapartidaLedger, debit: command.amount, credit: zero },
        { ledgerAccountId: account.ledgerAccountId, debit: zero, credit: command.amount },
      ] as JournalLineDraft[],
    });

    if (!entryResult.ok) return entryResult;

    await this.dependencies.movements.save({
      id: this.dependencies.createId(),
      accountId: account.id,
      effectiveDate: command.effectiveDate,
      amount: command.amount,
      direction: 'OUT',
      sourceDocumentType: 'external_settlement_reimbursement',
      sourceDocumentId: settlement.id,
      journalEntryId: entryResult.value.id,
      idempotencyKey: ctx.idempotencyKey,
      createdAt: ctx.now,
    });

    const updated: ExternalSettlement = { ...settlement, status: 'REINTEGRADO' };
    const saved = await this.dependencies.settlements.update(updated);

    await this.dependencies.audit.record({
      entityType: 'external_settlement',
      entityId: saved.id,
      action: 'EXTERNAL_SETTLEMENT_REIMBURSED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: saved };
  }
}
