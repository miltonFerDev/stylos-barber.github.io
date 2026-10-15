import type { AccountMovementRepository } from '../domain/account-movements';
import type { AuditRecorder } from '../domain/audit';
import { domainError } from '../domain/errors';
import type { JournalLineDraft } from '../domain/journal';
import { isCurrentAt } from '../domain/masters';
import { isPeriodOpen } from '../domain/periods';
import { validatePositiveAmount } from '../domain/obligations';
import type { Transfer } from '../domain/transfers';
import type { AccountingPeriodRepository, JournalService } from './journal-service';
import type { MasterRepository } from './master-data-service';
import type { Authorizer } from './permission-service';
import type { CommandContext, Money, Result } from '../domain/types';

export type RegisterTransferCommand = {
  fromAccountId: string;
  toAccountId: string;
  amount: Money;
  effectiveDate: string;
  periodId: string;
};

export type TransferRepository = {
  findByIdempotencyKey(key: string): Promise<Transfer | null>;
  save(transfer: Transfer): Promise<Transfer>;
};

export type TransfersServiceDependencies = {
  transfers: TransferRepository;
  movements: AccountMovementRepository;
  masters: MasterRepository;
  periods: AccountingPeriodRepository;
  journal: Pick<JournalService, 'postEntry'>;
  authorize: Authorizer;
  audit: AuditRecorder;
  createId: () => string;
};

export class TransfersService {
  constructor(private readonly dependencies: TransfersServiceDependencies) {}

  async registerTransfer(ctx: CommandContext, command: RegisterTransferCommand): Promise<Result<Transfer>> {
    const authorized = await this.dependencies.authorize(ctx, 'REGISTER_TRANSFER');
    if (!authorized.ok) return authorized;

    const previous = await this.dependencies.transfers.findByIdempotencyKey(ctx.idempotencyKey);
    if (previous) {
      return {
        ok: false,
        error: domainError('DUPLICATE_IDEMPOTENCY', 'La transferencia ya fue registrada con esta clave.', true, {
          previousTransfer: previous,
        }),
      };
    }

    if (command.fromAccountId === command.toAccountId) {
      return {
        ok: false,
        error: domainError('TRANSFER_SAME_ACCOUNT', 'El origen y el destino deben ser cuentas distintas.', true, {
          accountId: command.fromAccountId,
        }),
      };
    }

    const amount = validatePositiveAmount(command.amount);
    if (!amount.ok) return amount;

    if (command.effectiveDate.trim().length === 0 || command.periodId.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'La fecha efectiva y el periodo son obligatorios.', true, {
          fields: ['effectiveDate', 'periodId'],
        }),
      };
    }

    const from = await this.dependencies.masters.findById('ACCOUNT', command.fromAccountId);
    const to = await this.dependencies.masters.findById('ACCOUNT', command.toAccountId);

    if (!from || from.entityType !== 'ACCOUNT' || !to || to.entityType !== 'ACCOUNT') {
      return {
        ok: false,
        error: domainError('MASTER_NOT_FOUND', 'La cuenta de origen o destino no existe.', true, {
          fromAccountId: command.fromAccountId,
          toAccountId: command.toAccountId,
        }),
      };
    }

    if (from.ownership !== 'PROPIA' || !from.isAvailable || !isCurrentAt(from, ctx.now)) {
      return {
        ok: false,
        error: domainError('ACCOUNT_NOT_AVAILABLE', 'La cuenta de origen no esta disponible.', true, {
          accountId: from.id,
        }),
      };
    }

    if (to.ownership !== 'PROPIA' || !to.isAvailable || !isCurrentAt(to, ctx.now)) {
      return {
        ok: false,
        error: domainError('ACCOUNT_NOT_AVAILABLE', 'La cuenta de destino no esta disponible.', true, {
          accountId: to.id,
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
        error: domainError('PERIOD_CLOSED', 'No se puede transferir en un periodo cerrado o en revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const zero: Money = { amount: '0.00', currency: command.amount.currency };
    const transferId = this.dependencies.createId();

    const entryResult = await this.dependencies.journal.postEntry(ctx, {
      periodId: period.id,
      entryDate: command.effectiveDate,
      sourceDocumentType: 'transfer',
      sourceDocumentId: transferId,
      description: 'Transferencia entre cuentas propias',
      lines: [
        { ledgerAccountId: to.ledgerAccountId, debit: command.amount, credit: zero },
        { ledgerAccountId: from.ledgerAccountId, debit: zero, credit: command.amount },
      ] as JournalLineDraft[],
    });

    if (!entryResult.ok) return entryResult;

    const movementBase = {
      effectiveDate: command.effectiveDate,
      amount: command.amount,
      sourceDocumentType: 'transfer',
      sourceDocumentId: transferId,
      journalEntryId: entryResult.value.id,
      idempotencyKey: ctx.idempotencyKey,
      createdAt: ctx.now,
    };

    await this.dependencies.movements.save({
      ...movementBase,
      id: this.dependencies.createId(),
      accountId: from.id,
      direction: 'OUT',
    });

    await this.dependencies.movements.save({
      ...movementBase,
      id: this.dependencies.createId(),
      accountId: to.id,
      direction: 'IN',
    });

    const transfer: Transfer = {
      id: transferId,
      effectiveDate: command.effectiveDate,
      fromAccountId: from.id,
      toAccountId: to.id,
      amount: command.amount,
      status: 'CONFIRMADO',
      idempotencyKey: ctx.idempotencyKey,
      source: 'REAL',
      createdBy: ctx.actorUserId,
      createdAt: ctx.now,
    };

    await this.dependencies.transfers.save(transfer);
    await this.dependencies.audit.record({
      entityType: 'transfer',
      entityId: transfer.id,
      action: 'TRANSFER_CREATED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: transfer };
  }
}
