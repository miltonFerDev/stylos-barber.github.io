import { describe, expect, it } from 'vitest';
import { PeriodsService, type PeriodRepository } from '../periods-service';
import type { AccountingPeriod } from '../../domain/periods';
import type { Authorizer } from '../permission-service';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;
const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'p-1',
  now: '2026-10-13T12:00:00.000Z',
};

function createService(options: { authorize?: Authorizer } = {}) {
  const periods: AccountingPeriod[] = [];
  let nextId = 0;
  const createId = () => `id-${++nextId}`;

  const repo: PeriodRepository = {
    async findByCode(code) {
      return periods.find((p) => p.code === code) ?? null;
    },
    async findById(id) {
      return periods.find((p) => p.id === id) ?? null;
    },
    async save(period) {
      periods.push(period);
      return period;
    },
    async update(period) {
      const index = periods.findIndex((p) => p.id === period.id);
      if (index >= 0) periods[index] = period;
      return period;
    },
  };

  const authorize: Authorizer = options.authorize ?? (async () => ({ ok: true, value: undefined }));

  const service = new PeriodsService({ periods: repo, authorize, createId });
  return { service, periods };
}

describe('PeriodsService', () => {
  it('recorre el ciclo abrir -> revision -> cerrar -> reabrir', async () => {
    const { service } = createService();

    const opened = await service.openPeriod(ctx, { code: '2026-10', startsOn: '2026-10-01', endsOn: '2026-10-31' });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const id = opened.value.id;

    const reviewed = await service.submitForReview(ctx, { periodId: id });
    expect(reviewed.ok).toBe(true);

    const closed = await service.closePeriod(ctx, { periodId: id });
    expect(closed.ok).toBe(true);
    if (closed.ok) expect(closed.value.status).toBe('CERRADO');

    const reopened = await service.reopenPeriod(ctx, { periodId: id, reason: 'ajuste' });
    expect(reopened.ok).toBe(true);
    if (reopened.ok) expect(reopened.value.status).toBe('ABIERTO');
  });

  it('rechaza abrir un codigo duplicado', async () => {
    const { service } = createService();
    await service.openPeriod(ctx, { code: '2026-10', startsOn: '2026-10-01', endsOn: '2026-10-31' });

    const second = await service.openPeriod(ctx, { code: '2026-10', startsOn: '2026-11-01', endsOn: '2026-11-30' });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe('PERIOD_ALREADY_EXISTS');
  });

  it('rechaza cerrar un periodo que no esta en revision', async () => {
    const { service } = createService();
    const opened = await service.openPeriod(ctx, { code: '2026-10', startsOn: '2026-10-01', endsOn: '2026-10-31' });
    if (!opened.ok) return;

    const closed = await service.closePeriod(ctx, { periodId: opened.value.id });
    expect(closed.ok).toBe(false);
    if (!closed.ok) expect(closed.error.code).toBe('INVALID_STATE');
  });

  it('exige motivo para reabrir', async () => {
    const { service } = createService();
    const result = await service.reopenPeriod(ctx, { periodId: 'x', reason: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MISSING_REASON');
  });

  it('rechaza sin permiso', async () => {
    const denied: Authorizer = async () => ({
      ok: false,
      error: { code: 'PERMISSION_DENIED', message: 'Sin permiso.', recoverable: false },
    });
    const { service } = createService({ authorize: denied });

    const result = await service.openPeriod(ctx, { code: '2026-10', startsOn: '2026-10-01', endsOn: '2026-10-31' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});
