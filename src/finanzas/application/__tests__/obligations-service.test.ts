import { describe, expect, it } from 'vitest';
import { ObligationsService, type ObligationRepository } from '../obligations-service';
import type { Master, MasterRepository } from '../master-data-service';
import type { AccountingPeriodRepository } from '../journal-service';
import type { AccountingPeriod } from '../../domain/periods';
import type { Obligation } from '../../domain/obligations';
import type { Authorizer } from '../permission-service';
import type { AuditEventInput, AuditRecorder } from '../../domain/audit';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;

const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'idem-1',
  now: '2026-10-13T12:00:00.000Z',
};

const openPeriod: AccountingPeriod = {
  id: 'period-1',
  code: '2026-10',
  startsOn: '2026-10-01',
  endsOn: '2026-10-31',
  status: 'ABIERTO',
};

const masters: Master[] = [
  {
    id: 'person-1',
    entityType: 'PERSON',
    displayName: 'Proveedor SA',
    kind: 'EMPRESA',
    taxId: null,
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: ctx.now,
    createdBy: userId,
  },
  {
    id: 'cat-1',
    entityType: 'CATEGORY',
    code: 'PROV',
    name: 'Proveedores',
    nature: 'OPERATIVA',
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: ctx.now,
    createdBy: userId,
  },
  {
    id: 'rl-1',
    entityType: 'RESULT_LINE',
    code: 'RL-1',
    name: 'Insumos',
    nature: 'GASTO',
    order: 1,
    ledgerAccountId: '5.6',
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: ctx.now,
    createdBy: userId,
  },
  {
    id: 'acc-1',
    entityType: 'ACCOUNT',
    name: 'Efectivo',
    kind: 'EFECTIVO',
    ownership: 'PROPIA',
    financialInstitution: null,
    currency: 'ARS',
    ledgerAccountId: '1.1.1',
    isAvailable: true,
    isReconcilable: true,
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: ctx.now,
    createdBy: userId,
  },
];

const baseCommand = {
  concept: 'Insumos de barberia',
  personId: 'person-1',
  categoryId: 'cat-1',
  resultLineId: 'rl-1',
  plannedAccountId: 'acc-1',
  amount: { amount: '1000.00', currency: 'ARS' as const },
  isEstimated: true,
  dueDate: '2026-10-20',
  periodId: 'period-1',
};

function createService(options?: {
  period?: AccountingPeriod | null;
  authorize?: Authorizer;
  mastersOverride?: Master[];
}) {
  const period = options?.period ?? openPeriod;
  const saved: Obligation[] = [];
  const auditEvents: AuditEventInput[] = [];

  const obligations: ObligationRepository = {
    async findById(id) {
      return saved.find(o => o.id === id) ?? null;
    },
    async findAll() {
      return saved;
    },
    async save(obligation) {
      saved.push(obligation);
      return obligation;
    },
    async update(obligation) {
      const index = saved.findIndex(o => o.id === obligation.id);
      if (index >= 0) saved[index] = obligation;
      return obligation;
    },
  };

  const masterStore = options?.mastersOverride ?? masters;
  const masterRepository: MasterRepository = {
    async findById(entityType, id) {
      return masterStore.find(m => m.entityType === entityType && m.id === id) ?? null;
    },
    async findByCode(entityType, code) {
      return masterStore.find(m => m.entityType === entityType && 'code' in m && m.code === code) ?? null;
    },
    async findAll(entityType) {
      return masterStore.filter(m => m.entityType === entityType);
    },
    async save(master) {
      masterStore.push(master);
      return master;
    },
  };

  const periods: AccountingPeriodRepository = {
    async findById() {
      return period;
    },
    async findAll() {
      return [];
    },
  };

  const authorize: Authorizer = options?.authorize ?? (async () => ({ ok: true, value: undefined }));
  const audit: AuditRecorder = {
    async record(event) {
      auditEvents.push(event);
    },
  };

  return {
    service: new ObligationsService({
      obligations,
      masters: masterRepository,
      periods,
      authorize,
      audit,
      createId: () => `obl-${saved.length + 1}`,
    }),
    saved,
    auditEvents,
  };
}

describe('ObligationsService.createObligation', () => {
  it('crea una obligacion estimada en PENDIENTE', async () => {
    const { service, saved } = createService();

    const result = await service.createObligation(ctx, baseCommand);

    expect(result.ok).toBe(true);
    expect(saved).toHaveLength(1);
    if (result.ok) {
      expect(result.value.status).toBe('PENDIENTE');
      expect(result.value.estimatedAmountVersion).toBe(1);
      expect(result.value.finalAmount).toBeNull();
      expect(result.value.isEstimated).toBe(true);
      expect(result.value.priority).toBe('P3');
    }
  });

  it('crea una obligacion definitiva con finalAmount', async () => {
    const { service } = createService();

    const result = await service.createObligation(ctx, { ...baseCommand, isEstimated: false });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.finalAmount).toEqual(baseCommand.amount);
      expect(result.value.isEstimated).toBe(false);
    }
  });

  it('rechaza dueDate vacio', async () => {
    const { service } = createService();
    const result = await service.createObligation(ctx, { ...baseCommand, dueDate: '  ' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MISSING_DUE_DATE');
  });

  it('rechaza persona inexistente', async () => {
    const { service } = createService();
    const result = await service.createObligation(ctx, { ...baseCommand, personId: 'missing' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MASTER_NOT_FOUND');
  });

  it('rechaza periodo cerrado', async () => {
    const { service } = createService({ period: { ...openPeriod, status: 'CERRADO' } });
    const result = await service.createObligation(ctx, baseCommand);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERIOD_CLOSED');
  });

  it('rechaza maestro no vigente', async () => {
    const expired: Master[] = masters.map(m =>
      m.id === 'person-1' ? { ...m, validTo: '2026-09-30' } : m
    );
    const { service } = createService({ mastersOverride: expired });
    const result = await service.createObligation(ctx, baseCommand);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MASTER_NOT_CURRENT');
  });

  it('rechaza duplicado posible sin confirmacion', async () => {
    const { service } = createService();
    await service.createObligation(ctx, baseCommand);

    const second = await service.createObligation(ctx, baseCommand);

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe('POSSIBLE_DUPLICATE_OBLIGATION');
      expect(second.error.details?.candidates).toHaveLength(1);
    }
  });

  it('crea un duplicado posible cuando se confirma explicitamente', async () => {
    const { service } = createService();
    await service.createObligation(ctx, baseCommand);

    const result = await service.createObligation(ctx, { ...baseCommand, confirmPossibleDuplicate: true });

    expect(result.ok).toBe(true);
  });

  it('rechaza sin permiso', async () => {
    const denied: Authorizer = async () => ({
      ok: false,
      error: { code: 'PERMISSION_DENIED', message: 'No tenes permiso.', recoverable: false },
    });
    const { service, saved } = createService({ authorize: denied });

    const result = await service.createObligation(ctx, baseCommand);

    expect(result.ok).toBe(false);
    expect(saved).toHaveLength(0);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });

  it('registra auditoria OBLIGATION_CREATED', async () => {
    const { service, auditEvents } = createService();

    await service.createObligation(ctx, baseCommand);

    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0].action).toBe('OBLIGATION_CREATED');
  });
});

describe('ObligationsService.confirmDefinitiveAmount', () => {
  it('fija finalAmount y sube version conservando el estimado', async () => {
    const { service, saved } = createService();
    const created = await service.createObligation(ctx, baseCommand);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await service.confirmDefinitiveAmount(ctx, {
      obligationId: created.value.id,
      finalAmount: { amount: '1500.00', currency: 'ARS' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.finalAmount).toEqual({ amount: '1500.00', currency: 'ARS' });
      expect(result.value.isEstimated).toBe(false);
      expect(result.value.estimatedAmountVersion).toBe(2);
      expect(result.value.estimatedAmount).toEqual({ amount: '1000.00', currency: 'ARS' });
    }
    expect(saved[0].finalAmount).toEqual({ amount: '1500.00', currency: 'ARS' });
  });

  it('rechaza obligacion inexistente', async () => {
    const { service } = createService();
    const result = await service.confirmDefinitiveAmount(ctx, {
      obligationId: 'missing',
      finalAmount: { amount: '1500.00', currency: 'ARS' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('OBLIGATION_NOT_FOUND');
  });

  it('rechaza confirmar una obligacion PARCIAL', async () => {
    const { service } = createService();
    const created = await service.createObligation(ctx, baseCommand);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    created.value.status = 'PARCIAL';

    const result = await service.confirmDefinitiveAmount(ctx, {
      obligationId: created.value.id,
      finalAmount: { amount: '1500.00', currency: 'ARS' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_OBLIGATION_STATE');
  });
});

describe('ObligationsService.annulObligation', () => {
  it('anula una obligacion pendiente', async () => {
    const { service, auditEvents } = createService();
    const created = await service.createObligation(ctx, baseCommand);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await service.annulObligation(ctx, {
      obligationId: created.value.id,
      reason: 'Proveedor cancelo el pedido',
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('ANULADA');

    expect(auditEvents.some(e => e.action === 'OBLIGATION_ANNULLED')).toBe(true);
  });

  it('rechaza anular sin motivo', async () => {
    const { service } = createService();
    const result = await service.annulObligation(ctx, { obligationId: 'obl-1', reason: '   ' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MISSING_REASON');
  });

  it('rechaza anular una obligacion PARCIAL', async () => {
    const { service } = createService();
    const created = await service.createObligation(ctx, baseCommand);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    created.value.status = 'PARCIAL';

    const result = await service.annulObligation(ctx, {
      obligationId: created.value.id,
      reason: 'Test',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_OBLIGATION_STATE');
  });
});
