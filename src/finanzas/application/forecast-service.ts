import type { Account } from '../domain/accounts';
import { minorToMoney } from '../domain/closings';
import { domainError } from '../domain/errors';
import {
  computeCapacity,
  CONFIDENCES,
  FORECAST_SCENARIOS,
  FORECAST_SOURCES,
  horizonDates,
  minProjectedBalance,
  projectedBalanceAt,
  type DatedFlow,
  type ForecastScenario,
  type IncomeForecast,
} from '../domain/forecast';
import { addDays } from '../domain/forecast';
import { isValidMoneyAmount, toMinor } from '../domain/money';
import type { Obligation } from '../domain/obligations';
import type { Authorizer } from './permission-service';
import type { CommandContext, Currency, Money, Result } from '../domain/types';

export type ComputeForecastCommand = {
  scenario: ForecastScenario;
  horizonWeeks?: number;
  baseDate?: string;
};

export type CapacityToInvestCommand = {
  scenario: ForecastScenario;
  candidateInvestment?: { date: string; amount: Money };
  protectedFunds?: Money;
};

export type Forecast = {
  scenario: ForecastScenario;
  baseDate: string;
  currency: Currency;
  baseBalance: Money;
  daily: Array<{ date: string; projectedBalance: Money }>;
  minProjectedBalance: Money;
};

export type InvestmentCapacity = {
  scenario: ForecastScenario;
  currency: Currency;
  reserve: Money;
  protectedFunds: Money;
  minProjectedBalance: Money;
  capacity: Money;
};

export type ForecastAccountRepository = {
  listAccounts(): Promise<Account[]>;
};

export type ForecastReconciliationRepository = {
  findLatestByAccount(accountId: string): Promise<{ realBalance: Money; asOf: string } | null>;
};

export type ForecastIncomeRepository = {
  listForScenario(scenario: ForecastScenario): Promise<IncomeForecast[]>;
};

export type ForecastObligationRepository = {
  listActive(): Promise<Obligation[]>;
};

export type ForecastSettingsRepository = {
  getReserve(currency: Currency): Promise<Money | null>;
};

export type ForecastServiceDependencies = {
  accounts: ForecastAccountRepository;
  reconciliations: ForecastReconciliationRepository;
  incomes: ForecastIncomeRepository;
  obligations: ForecastObligationRepository;
  settings: ForecastSettingsRepository;
  authorize: Authorizer;
  maxReconciliationAgeDays: number;
};

type Projection = {
  currency: Currency;
  baseBalance: Money;
  daily: Array<{ date: string; projectedBalance: Money }>;
  minProjectedBalance: Money;
};

function toIsoDate(timestamp: string): string {
  return timestamp.slice(0, 10);
}

export class ForecastService {
  constructor(private readonly dependencies: ForecastServiceDependencies) {}

  private async project(
    scenario: ForecastScenario,
    horizonWeeks: number,
    baseDate: string,
    extraOutflows: DatedFlow[]
  ): Promise<Result<Projection>> {
    if (!FORECAST_SCENARIOS.includes(scenario)) {
      return {
        ok: false,
        error: domainError('FORECAST_SCENARIO_INVALID', 'El escenario de prevision no es valido.', true, {
          scenario,
        }),
      };
    }

    const horizonEnd = addDays(baseDate, horizonWeeks * 7 - 1);

    const accounts = (await this.dependencies.accounts.listAccounts()).filter(
      (account) => account.ownership === 'PROPIA' && account.isAvailable
    );
    const currency: Currency = accounts[0]?.currency ?? 'ARS';

    let baseMinor = 0n;
    for (const account of accounts) {
      if (account.currency !== currency) {
        return {
          ok: false,
          error: domainError('CURRENCY_MISMATCH', 'Las cuentas de la base deben compartir moneda.', false, {
            accountId: account.id,
          }),
        };
      }
      const latest = await this.dependencies.reconciliations.findLatestByAccount(account.id);
      if (!latest || addDays(latest.asOf, this.dependencies.maxReconciliationAgeDays) < baseDate) {
        return {
          ok: false,
          error: domainError('STALE_RECONCILIATION', 'No hay saldo conciliado reciente para la cuenta.', true, {
            accountId: account.id,
          }),
        };
      }
      baseMinor += toMinor(latest.realBalance);
    }

    const forecasts = await this.dependencies.incomes.listForScenario(scenario);
    const inflows: DatedFlow[] = [];
    for (const forecast of forecasts) {
      if (!FORECAST_SOURCES.includes(forecast.source) || !CONFIDENCES.includes(forecast.confidence)) {
        return {
          ok: false,
          error: domainError('INCOME_SOURCE_MISSING', 'El ingreso proyectado no tiene fuente o confianza valida.', true, {
            forecastId: forecast.id,
          }),
        };
      }
      if (forecast.amount.currency !== currency) {
        return {
          ok: false,
          error: domainError('CURRENCY_MISMATCH', 'El ingreso proyectado usa otra moneda.', false, {
            forecastId: forecast.id,
          }),
        };
      }
      inflows.push({ date: forecast.forecastDate, amountMinor: toMinor(forecast.amount) });
    }

    const obligations = await this.dependencies.obligations.listActive();
    const outflows: DatedFlow[] = [];
    for (const obligation of obligations) {
      if (obligation.dueDate < baseDate || obligation.dueDate > horizonEnd) continue;
      const amount = obligation.finalAmount ?? obligation.estimatedAmount;
      if (amount.currency !== currency) {
        return {
          ok: false,
          error: domainError('CURRENCY_MISMATCH', 'La obligacion usa otra moneda.', false, {
            obligationId: obligation.id,
          }),
        };
      }
      outflows.push({ date: obligation.dueDate, amountMinor: toMinor(amount) });
    }

    for (const extra of extraOutflows) outflows.push(extra);

    const dates = horizonDates(baseDate, horizonWeeks);
    const minMinor = minProjectedBalance(baseMinor, inflows, outflows, dates);
    const daily = dates.map((date) => ({
      date,
      projectedBalance: minorToMoney(projectedBalanceAt(baseMinor, inflows, outflows, date), currency),
    }));

    return {
      ok: true,
      value: {
        currency,
        baseBalance: minorToMoney(baseMinor, currency),
        daily,
        minProjectedBalance: minorToMoney(minMinor, currency),
      },
    };
  }

  async computeForecast(ctx: CommandContext, command: ComputeForecastCommand): Promise<Result<Forecast>> {
    const authorized = await this.dependencies.authorize(ctx, 'VIEW_BALANCES');
    if (!authorized.ok) return authorized;

    const horizonWeeks = command.horizonWeeks ?? 13;
    const baseDate = command.baseDate ?? toIsoDate(ctx.now);

    const projected = await this.project(command.scenario, horizonWeeks, baseDate, []);
    if (!projected.ok) return projected;

    return {
      ok: true,
      value: {
        scenario: command.scenario,
        baseDate,
        ...projected.value,
      },
    };
  }

  async capacityToInvest(
    ctx: CommandContext,
    command: CapacityToInvestCommand
  ): Promise<Result<InvestmentCapacity>> {
    const authorized = await this.dependencies.authorize(ctx, 'VIEW_BALANCES');
    if (!authorized.ok) return authorized;

    if (!FORECAST_SCENARIOS.includes(command.scenario)) {
      return {
        ok: false,
        error: domainError('FORECAST_SCENARIO_INVALID', 'El escenario de prevision no es valido.', true, {
          scenario: command.scenario,
        }),
      };
    }

    const accounts = (await this.dependencies.accounts.listAccounts()).filter(
      (account) => account.ownership === 'PROPIA' && account.isAvailable
    );
    const currency: Currency = accounts[0]?.currency ?? 'ARS';

    const reserve = await this.dependencies.settings.getReserve(currency);
    if (!reserve) {
      return {
        ok: false,
        error: domainError('RESERVE_UNDEFINED', 'La reserva operativa no esta definida.', false, { currency }),
      };
    }

    const extraOutflows: DatedFlow[] = [];
    if (command.candidateInvestment) {
      const investment = command.candidateInvestment;
      if (!isValidMoneyAmount(investment.amount.amount)) {
        return {
          ok: false,
          error: domainError('VALIDATION_FAILED', 'El importe de la inversion candidata es invalido.', true),
        };
      }
      if (investment.amount.currency !== currency) {
        return {
          ok: false,
          error: domainError('CURRENCY_MISMATCH', 'La inversion candidata usa otra moneda.', false),
        };
      }
      extraOutflows.push({ date: investment.date, amountMinor: toMinor(investment.amount) });
    }

    const protectedFunds = command.protectedFunds ?? { amount: '0.00', currency };
    if (!isValidMoneyAmount(protectedFunds.amount)) {
      return {
        ok: false,
        error: domainError('VALIDATION_FAILED', 'El importe de fondos protegidos es invalido.', true),
      };
    }
    if (protectedFunds.currency !== currency) {
      return {
        ok: false,
        error: domainError('CURRENCY_MISMATCH', 'Los fondos protegidos usan otra moneda.', false),
      };
    }

    const projected = await this.project(command.scenario, 13, toIsoDate(ctx.now), extraOutflows);
    if (!projected.ok) return projected;

    const capacityMinor = computeCapacity(
      toMinor(projected.value.minProjectedBalance),
      toMinor(reserve),
      toMinor(protectedFunds)
    );

    return {
      ok: true,
      value: {
        scenario: command.scenario,
        currency,
        reserve,
        protectedFunds,
        minProjectedBalance: projected.value.minProjectedBalance,
        capacity: minorToMoney(capacityMinor, currency),
      },
    };
  }
}
