import type { AccountingPeriod } from '../domain/periods';
import { domainError } from '../domain/errors';
import type { Authorizer } from './permission-service';
import type { CommandContext, Result } from '../domain/types';

export type OpenPeriodCommand = {
  code: string;
  startsOn: string;
  endsOn: string;
};

export type PeriodIdCommand = {
  periodId: string;
};

export type ReopenPeriodCommand = {
  periodId: string;
  reason: string;
};

export type PeriodRepository = {
  findByCode(code: string): Promise<AccountingPeriod | null>;
  findById(id: string): Promise<AccountingPeriod | null>;
  save(period: AccountingPeriod): Promise<AccountingPeriod>;
  update(period: AccountingPeriod): Promise<AccountingPeriod>;
};

export type PeriodsServiceDependencies = {
  periods: PeriodRepository;
  authorize: Authorizer;
  createId: () => string;
};

export class PeriodsService {
  constructor(private readonly dependencies: PeriodsServiceDependencies) {}

  async openPeriod(ctx: CommandContext, command: OpenPeriodCommand): Promise<Result<AccountingPeriod>> {
    const authorized = await this.dependencies.authorize(ctx, 'CLOSE_PERIOD');
    if (!authorized.ok) return authorized;

    if (command.code.trim().length === 0 || command.startsOn.trim().length === 0 || command.endsOn.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'El codigo y las fechas del periodo son obligatorios.', true, {
          fields: ['code', 'startsOn', 'endsOn'],
        }),
      };
    }

    const existing = await this.dependencies.periods.findByCode(command.code.trim());
    if (existing) {
      return {
        ok: false,
        error: domainError('PERIOD_ALREADY_EXISTS', 'El periodo ya existe.', true, { code: command.code.trim() }),
      };
    }

    const period: AccountingPeriod = {
      id: this.dependencies.createId(),
      code: command.code.trim(),
      startsOn: command.startsOn,
      endsOn: command.endsOn,
      status: 'ABIERTO',
    };

    await this.dependencies.periods.save(period);
    return { ok: true, value: period };
  }

  async submitForReview(ctx: CommandContext, command: PeriodIdCommand): Promise<Result<AccountingPeriod>> {
    const authorized = await this.dependencies.authorize(ctx, 'CLOSE_PERIOD');
    if (!authorized.ok) return authorized;

    const period = await this.dependencies.periods.findById(command.periodId);
    if (!period) {
      return {
        ok: false,
        error: domainError('PERIOD_NOT_FOUND', 'El periodo contable no existe.', true, { periodId: command.periodId }),
      };
    }
    if (period.status !== 'ABIERTO') {
      return {
        ok: false,
        error: domainError('INVALID_STATE', 'Solo un periodo abierto puede pasar a revision.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const updated: AccountingPeriod = { ...period, status: 'EN_REVISION' };
    await this.dependencies.periods.update(updated);
    return { ok: true, value: updated };
  }

  async closePeriod(ctx: CommandContext, command: PeriodIdCommand): Promise<Result<AccountingPeriod>> {
    const authorized = await this.dependencies.authorize(ctx, 'CLOSE_PERIOD');
    if (!authorized.ok) return authorized;

    const period = await this.dependencies.periods.findById(command.periodId);
    if (!period) {
      return {
        ok: false,
        error: domainError('PERIOD_NOT_FOUND', 'El periodo contable no existe.', true, { periodId: command.periodId }),
      };
    }
    if (period.status !== 'EN_REVISION') {
      return {
        ok: false,
        error: domainError('INVALID_STATE', 'Solo un periodo en revision puede cerrarse.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    // shortcut: no se verifican reconciliaciones pendientes; se agrega al exponerlas por periodo.
    const updated: AccountingPeriod = { ...period, status: 'CERRADO' };
    await this.dependencies.periods.update(updated);
    return { ok: true, value: updated };
  }

  async reopenPeriod(ctx: CommandContext, command: ReopenPeriodCommand): Promise<Result<AccountingPeriod>> {
    const authorized = await this.dependencies.authorize(ctx, 'REOPEN_PERIOD');
    if (!authorized.ok) return authorized;

    if (command.reason.trim().length === 0) {
      return {
        ok: false,
        error: domainError('MISSING_REASON', 'La reapertura requiere un motivo.', true),
      };
    }

    const period = await this.dependencies.periods.findById(command.periodId);
    if (!period) {
      return {
        ok: false,
        error: domainError('PERIOD_NOT_FOUND', 'El periodo contable no existe.', true, { periodId: command.periodId }),
      };
    }
    if (period.status !== 'CERRADO') {
      return {
        ok: false,
        error: domainError('INVALID_STATE', 'Solo un periodo cerrado puede reabrirse.', true, {
          periodId: period.id,
          status: period.status,
        }),
      };
    }

    const updated: AccountingPeriod = { ...period, status: 'ABIERTO' };
    await this.dependencies.periods.update(updated);
    return { ok: true, value: updated };
  }
}
