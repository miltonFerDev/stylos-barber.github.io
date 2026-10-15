import { describe, expect, it } from 'vitest';
import { ReportsService, type AuditQueryRepository } from '../reports-service';
import type { AccountMovement } from '../../domain/account-movements';
import type { Account } from '../../domain/accounts';
import type { AuditEvent } from '../../domain/audit';
import type { Obligation } from '../../domain/obligations';
import type { MasterRepository } from '../master-data-service';
import type { ObligationRepository } from '../obligations-service';
import type { Authorizer } from '../permission-service';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;
const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'report-1',
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

function makeMovement(accountId: string, amount: string, direction: AccountMovement['direction']): AccountMovement {
  return {
    id: `m-${accountId}-${amount}`,
    accountId,
    effectiveDate: '2026-10-10',
    amount: { amount, currency: 'ARS' },
    direction,
    sourceDocumentType: 'income_record',
    sourceDocumentId: 'inc-1',
    journalEntryId: 'entry-1',
    idempotencyKey: `m-${accountId}`,
    createdAt: ctx.now,
  };
}

function makeObligation(id: string, status: Obligation['status'], dueDate: string): Obligation {
  return {
    id,
    concept: `Obligacion ${id}`,
    personId: 'person-1',
    categoryId: 'cat-1',
    resultLineId: 'rl-1',
    plannedAccountId: 'acc-1',
    estimatedAmount: { amount: '100.00', currency: 'ARS' },
    estimatedAmountVersion: 1,
    finalAmount: null,
    isEstimated: true,
    dueDate,
    expectedPaymentDate: null,
    priority: 'P2',
    status,
    periodId: 'period-1',
    recurrenceRuleId: null,
    source: 'REAL',
    createdBy: userId,
    createdAt: ctx.now,
    idempotencyKey: `ob-${id}`,
  };
}

function createService(options: { authorize?: Authorizer } = {}) {
  const accounts: Account[] = [
    makeAccount('acc-1', 'PROPIA', true),
    makeAccount('acc-ext', 'EXTERNA', true),
    makeAccount('acc-res', 'RESTRINGIDA', true),
  ];

  const movementsByAccount: Record<string, AccountMovement[]> = {
    'acc-1': [makeMovement('acc-1', '1000.00', 'IN')],
    'acc-ext': [makeMovement('acc-ext', '9999.00', 'IN')],
    'acc-res': [makeMovement('acc-res', '500.00', 'IN')],
  };

  const masters: MasterRepository = {
    async findById() {
      return null;
    },
    async findByCode() {
      return null;
    },
    async findAll(entityType) {
      return entityType === 'ACCOUNT' ? accounts : [];
    },
    async save(master) {
      return master;
    },
  };

  const movements = {
    async findByAccount(accountId: string) {
      return movementsByAccount[accountId] ?? [];
    },
    async save(movement: AccountMovement) {
      return movement;
    },
  };

  const obligations: Obligation[] = [
    makeObligation('ob-1', 'PENDIENTE', '2026-10-10'),
    makeObligation('ob-2', 'PROGRAMADA', '2026-10-20'),
    makeObligation('ob-3', 'PAGADA', '2026-10-05'),
  ];

  const obligationsRepo: ObligationRepository = {
    async findById(id) {
      return obligations.find((o) => o.id === id) ?? null;
    },
    async findAll() {
      return obligations;
    },
    async save(obligation) {
      return obligation;
    },
    async update(obligation) {
      return obligation;
    },
  };

  const auditEvents: AuditEvent[] = [
    {
      id: 'ev-1',
      entityType: 'obligation',
      entityId: 'ob-1',
      action: 'OBLIGATION_CREATED',
      actorUserId: userId,
      occurredAt: '2026-10-01T00:00:00.000Z',
      reason: null,
    },
  ];

  const auditHistory: AuditQueryRepository = {
    async findByEntity(entityType, entityId) {
      return auditEvents.filter((e) => e.entityType === entityType && e.entityId === entityId);
    },
  };

  const authorize: Authorizer = options.authorize ?? (async () => ({ ok: true, value: undefined }));

  const service = new ReportsService({ masters, movements, obligations: obligationsRepo, auditHistory, authorize });

  return { service };
}

describe('ReportsService.availabilityReport', () => {
  it('suma solo cuentas PROPIAS disponibles y lista todas', async () => {
    const { service } = createService();

    const result = await service.availabilityReport(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.lines).toHaveLength(3);
    expect(result.value.totalAvailable.amount).toBe('1000.00');
  });

  it('rechaza sin permiso', async () => {
    const denied: Authorizer = async () => ({
      ok: false,
      error: { code: 'PERMISSION_DENIED', message: 'Sin permiso.', recoverable: false },
    });
    const { service } = createService({ authorize: denied });

    const result = await service.availabilityReport(ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});

describe('ReportsService.obligationsReport', () => {
  it('marca vencidas y agrupa por estado', async () => {
    const { service } = createService();

    const result = await service.obligationsReport(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.lines).toHaveLength(3);
    expect(result.value.byStatus.PENDIENTE?.count).toBe(1);
    expect(result.value.byStatus.PAGADA?.count).toBe(1);
    expect(result.value.overdue.count).toBe(1);
    expect(result.value.overdue.totalMinor).toBe(10000n);
  });
});

describe('ReportsService.auditHistory', () => {
  it('devuelve los eventos de la entidad', async () => {
    const { service } = createService();

    const result = await service.auditHistory(ctx, { entityType: 'obligation', entityId: 'ob-1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.events).toHaveLength(1);
    expect(result.value.events[0].action).toBe('OBLIGATION_CREATED');
  });

  it('rechaza sin permiso', async () => {
    const denied: Authorizer = async () => ({
      ok: false,
      error: { code: 'PERMISSION_DENIED', message: 'Sin permiso.', recoverable: false },
    });
    const { service } = createService({ authorize: denied });

    const result = await service.auditHistory(ctx, { entityType: 'obligation', entityId: 'ob-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});
