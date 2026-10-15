import { describe, expect, it } from 'vitest';
import {
  ForecastService,
  type ForecastIncomeRepository,
  type ForecastObligationRepository,
  type ForecastReconciliationRepository,
  type ForecastSettingsRepository,
} from '../forecast-service';
import type { Account } from '../../domain/accounts';
import type { IncomeForecast } from '../../domain/forecast';
import type { Obligation } from '../../domain/obligations';
import type { Authorizer } from '../permission-service';
import type { CommandContext, Currency, Money, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;
const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'forecast-1',
  now: '2026-10-13T12:00:00.000Z',
};

function makeAccount(id: string, ownership: Account['ownership'], isAvailable: boolean): Account {
  return {
    id,
    entityType: 'ACCOUNT',
    name: `Cuenta ${id}`,
    kind: 'EFECTIVO',
    ownership,
    financialInstitution: null,
    currency: 'ARS',
    ledgerAccountId: '1.1.1',
    isAvailable,
    isReconcilable: true,
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: ctx.now,
    createdBy: userId,
  };
}

function makeObligation(dueDate: string, amount: string): Obligation {
  return {
    id: `ob-${dueDate}-${amount}`,
    concept: 'Proveedor',
    personId: 'person-1',
    categoryId: 'cat-1',
    resultLineId: 'rl-1',
    plannedAccountId: 'acc-1',
    estimatedAmount: { amount, currency: 'ARS' },
    estimatedAmountVersion: 1,
    finalAmount: null,
    isEstimated: true,
    dueDate,
    expectedPaymentDate: null,
    priority: 'P2',
    status: 'PENDIENTE',
    periodId: 'period-1',
    recurrenceRuleId: null,
    source: 'REAL',
    createdBy: userId,
    createdAt: ctx.now,
    idempotencyKey: `ob-idem-${dueDate}-${amount}`,
  };
}

type Options = {
  reconciliations?: Record<string, { realBalance: Money; asOf: string } | null>;
  forecasts?: IncomeForecast[];
  obligations?: Obligation[];
  reserve?: Money | null;
  authorize?: Authorizer;
};

function createService(options: Options = {}) {
  const accounts: Account[] = [
    makeAccount('acc-1', 'PROPIA', true),
    makeAccount('acc-ext', 'EXTERNA', true),
    makeAccount('acc-res', 'RESTRINGIDA', true),
  ];

  const reconciliations: ForecastReconciliationRepository = {
    async findLatestByAccount(accountId) {
      const map = options.reconciliations ?? {
        'acc-1': { realBalance: { amount: '1000.00', currency: 'ARS' as Currency }, asOf: '2026-10-13' },
        'acc-ext': { realBalance: { amount: '9999.00', currency: 'ARS' as Currency }, asOf: '2026-10-13' },
      };
      return map[accountId] ?? null;
    },
  };

  const incomes: ForecastIncomeRepository = {
    async listForScenario(scenario) {
      return (options.forecasts ?? []).filter((f) => f.scenario === scenario);
    },
  };

  const obligations: ForecastObligationRepository = {
    async listActive() {
      return options.obligations ?? [];
    },
  };

  const settings: ForecastSettingsRepository = {
    async getReserve() {
      return options.reserve === undefined
        ? { amount: '200.00', currency: 'ARS' as Currency }
        : options.reserve;
    },
  };

  const authorize: Authorizer = options.authorize ?? (async () => ({ ok: true, value: undefined }));

  const service = new ForecastService({
    accounts: { async listAccounts() { return accounts; } },
    reconciliations,
    incomes,
    obligations,
    settings,
    authorize,
    maxReconciliationAgeDays: 7,
  });

  return { service };
}

function makeForecast(
  id: string,
  scenario: IncomeForecast['scenario'],
  forecastDate: string,
  amount: string,
  source: IncomeForecast['source'] = 'MANUAL',
  confidence: IncomeForecast['confidence'] = 'MEDIA'
): IncomeForecast {
  return {
    id,
    scenario,
    forecastDate,
    amount: { amount, currency: 'ARS' },
    source,
    confidence,
    accountId: null,
  };
}

describe('ForecastService.computeForecast', () => {
  it('proyecta saldo base + ingresos - obligaciones', async () => {
    const { service } = createService({
      forecasts: [makeForecast('f-1', 'BASE', '2026-10-14', '500.00')],
      obligations: [makeObligation('2026-10-15', '800.00')],
    });

    const result = await service.computeForecast(ctx, { scenario: 'BASE' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.baseBalance.amount).toBe('1000.00');
    expect(result.value.minProjectedBalance.amount).toBe('700.00');
    expect(result.value.daily).toHaveLength(91);
    expect(result.value.daily[0].projectedBalance.amount).toBe('1000.00');
  });

  it('filtra income_forecasts por escenario', async () => {
    const { service } = createService({
      forecasts: [
        makeForecast('f-base', 'BASE', '2026-10-14', '500.00'),
        makeForecast('f-opt', 'OPTIMISTA', '2026-10-14', '999.00'),
      ],
    });

    const base = await service.computeForecast(ctx, { scenario: 'BASE' });
    expect(base.ok).toBe(true);
    if (base.ok) expect(base.value.daily[1].projectedBalance.amount).toBe('1500.00');

    const optimista = await service.computeForecast(ctx, { scenario: 'OPTIMISTA' });
    expect(optimista.ok).toBe(true);
    if (optimista.ok) expect(optimista.value.daily[1].projectedBalance.amount).toBe('1999.00');
  });

  it('rechaza escenario invalido', async () => {
    const { service } = createService();
    const result = await service.computeForecast(ctx, { scenario: 'INVALIDO' as never });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORECAST_SCENARIO_INVALID');
  });

  it('excluye cuentas externas y restringidas del saldo base', async () => {
    const { service } = createService();
    const result = await service.computeForecast(ctx, { scenario: 'BASE' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.baseBalance.amount).toBe('1000.00');
  });

  it('rechaza sin conciliacion reciente (STALE_RECONCILIATION)', async () => {
    const { service } = createService({
      reconciliations: {
        'acc-1': { realBalance: { amount: '1000.00', currency: 'ARS' }, asOf: '2026-09-01' },
      },
    });

    const result = await service.computeForecast(ctx, { scenario: 'BASE' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('STALE_RECONCILIATION');
  });

  it('rechaza forecast sin fuente o confianza valida', async () => {
    const { service } = createService({
      forecasts: [makeForecast('f-1', 'BASE', '2026-10-14', '500.00', 'INVALIDO' as never, 'MEDIA')],
    });

    const result = await service.computeForecast(ctx, { scenario: 'BASE' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INCOME_SOURCE_MISSING');
  });

  it('rechaza sin permiso', async () => {
    const denied: Authorizer = async () => ({
      ok: false,
      error: { code: 'PERMISSION_DENIED', message: 'Sin permiso.', recoverable: false },
    });
    const { service } = createService({ authorize: denied });

    const result = await service.computeForecast(ctx, { scenario: 'BASE' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});

describe('ForecastService.capacityToInvest', () => {
  it('calcula capacidad = min - reserva - protegidos', async () => {
    const { service } = createService({
      obligations: [makeObligation('2026-10-15', '800.00')],
      forecasts: [makeForecast('f-1', 'BASE', '2026-10-14', '500.00')],
    });

    const result = await service.capacityToInvest(ctx, { scenario: 'BASE' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.reserve.amount).toBe('200.00');
    expect(result.value.minProjectedBalance.amount).toBe('700.00');
    expect(result.value.capacity.amount).toBe('500.00');
  });

  it('resta la inversion candidata del minimo', async () => {
    const { service } = createService({
      obligations: [makeObligation('2026-10-15', '800.00')],
      forecasts: [makeForecast('f-1', 'BASE', '2026-10-14', '500.00')],
    });

    const result = await service.capacityToInvest(ctx, {
      scenario: 'BASE',
      candidateInvestment: { date: '2026-10-16', amount: { amount: '600.00', currency: 'ARS' } },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.minProjectedBalance.amount).toBe('100.00');
    expect(result.value.capacity.amount).toBe('0.00');
  });

  it('rechaza sin reserva definida (RESERVE_UNDEFINED)', async () => {
    const { service } = createService({ reserve: null });
    const result = await service.capacityToInvest(ctx, { scenario: 'BASE' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('RESERVE_UNDEFINED');
  });
});
