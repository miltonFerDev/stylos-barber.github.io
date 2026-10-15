import { describe, expect, it } from 'vitest';
import { MasterDataService, type Master, type MasterRepository } from '../master-data-service';
import type { Authorizer } from '../permission-service';
import type { AuditEventInput, AuditRecorder } from '../../domain/audit';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;

const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'idem-1',
  now: '2026-10-13T12:00:00.000Z',
};

function createService(options?: { authorize?: Authorizer }) {
  const saved: Master[] = [];
  const auditEvents: AuditEventInput[] = [];
  const masters: MasterRepository = {
    async findByCode(entityType, code) {
      return saved.find(item => item.entityType === entityType && 'code' in item && item.code === code) ?? null;
    },
    async findById(entityType, id) {
      return saved.find(item => item.entityType === entityType && item.id === id) ?? null;
    },
    async findAll(entityType) {
      return saved.filter(item => item.entityType === entityType);
    },
    async save(master) {
      saved.push(master);
      return master;
    },
  };
  const authorize: Authorizer = options?.authorize ?? (async () => ({ ok: true, value: undefined }));
  const audit: AuditRecorder = {
    async record(event) {
      auditEvents.push(event);
    },
  };

  return {
    service: new MasterDataService({ masters, createId: () => `master-${saved.length + 1}`, authorize, audit }),
    saved,
    auditEvents,
  };
}

describe('MasterDataService.createMaster', () => {
  it('crea una persona valida', async () => {
    const { service, saved } = createService();

    const result = await service.createMaster(ctx, {
      entityType: 'PERSON',
      displayName: 'Juan Perez',
      kind: 'PERSONA',
      validFrom: '2026-01-01',
    });

    expect(result.ok).toBe(true);
    expect(saved).toHaveLength(1);
    if (result.ok) {
      expect(result.value.entityType).toBe('PERSON');
      expect(result.value.id).toBe('master-1');
      expect(result.value.validTo).toBeNull();
    }
  });

  it('rechaza una categoria con codigo duplicado', async () => {
    const { service } = createService();

    const command = {
      entityType: 'CATEGORY',
      code: 'OP',
      name: 'Operativa',
      nature: 'OPERATIVA',
      validFrom: '2026-01-01',
    } as const;

    const first = await service.createMaster(ctx, command);
    const second = await service.createMaster(ctx, command);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe('MASTER_CODE_EXISTS');
  });

  it('rechaza una subcategoria con categoria inexistente', async () => {
    const { service } = createService();

    const result = await service.createMaster(ctx, {
      entityType: 'SUBCATEGORY',
      code: 'OP-1',
      name: 'Insumos',
      categoryId: 'missing-category',
      validFrom: '2026-01-01',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MASTER_NOT_FOUND');
  });

  it('rechaza una cuenta financiera con cuenta contable inexistente', async () => {
    const { service } = createService();

    const result = await service.createMaster(ctx, {
      entityType: 'ACCOUNT',
      name: 'Efectivo',
      kind: 'EFECTIVO',
      ownership: 'PROPIA',
      currency: 'ARS',
      ledgerAccountId: 'missing-ledger',
      isAvailable: true,
      isReconcilable: true,
      validFrom: '2026-01-01',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MASTER_NOT_FOUND');
  });

  it('bloquea un posible duplicado por nombre normalizado', async () => {
    const { service } = createService();

    const first = await service.createMaster(ctx, {
      entityType: 'PERSON',
      displayName: 'Juan Perez',
      kind: 'PERSONA',
      validFrom: '2026-01-01',
    });

    expect(first.ok).toBe(true);

    const second = await service.createMaster(ctx, {
      entityType: 'PERSON',
      displayName: '  juan   perez ',
      kind: 'PERSONA',
      validFrom: '2026-01-01',
    });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe('POSSIBLE_DUPLICATE_MASTER');
      expect(second.error.details?.candidates).toHaveLength(1);
    }
  });

  it('crea un posible duplicado cuando se confirma explicitamente', async () => {
    const { service } = createService();

    await service.createMaster(ctx, {
      entityType: 'PERSON',
      displayName: 'Juan Perez',
      kind: 'PERSONA',
      validFrom: '2026-01-01',
    });

    const result = await service.createMaster(ctx, {
      entityType: 'PERSON',
      displayName: 'Juan Perez',
      kind: 'PERSONA',
      validFrom: '2026-01-01',
      confirmPossibleDuplicate: true,
    });

    expect(result.ok).toBe(true);
  });
});

describe('MasterDataService.searchDuplicates', () => {
  it('devuelve candidatos por nombre normalizado', async () => {
    const { service } = createService();

    await service.createMaster(ctx, {
      entityType: 'PERSON',
      displayName: 'Juan Perez',
      kind: 'PERSONA',
      validFrom: '2026-01-01',
    });

    const duplicates = await service.searchDuplicates({
      entityType: 'PERSON',
      displayName: 'JUAN PEREZ',
      kind: 'PERSONA',
      validFrom: '2026-01-01',
    });

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].reason).toBe('SAME_NAME');
  });

  it('devuelve candidatos por taxId para personas', async () => {
    const { service } = createService();

    await service.createMaster(ctx, {
      entityType: 'PERSON',
      displayName: 'Juan Perez',
      kind: 'PERSONA',
      taxId: '20-12345678-9',
      validFrom: '2026-01-01',
    });

    const duplicates = await service.searchDuplicates({
      entityType: 'PERSON',
      displayName: 'Otro Nombre',
      kind: 'PERSONA',
      taxId: '20-12345678-9',
      validFrom: '2026-01-01',
    });

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].reason).toBe('SAME_TAX_ID');
  });
});

describe('MasterDataService — permisos y auditoria', () => {
  it('rechaza la creacion sin permiso', async () => {
    const denied: Authorizer = async () => ({
      ok: false,
      error: { code: 'PERMISSION_DENIED', message: 'No tenes permiso.', recoverable: false },
    });

    const { service, saved } = createService({ authorize: denied });

    const result = await service.createMaster(ctx, {
      entityType: 'PERSON',
      displayName: 'Juan Perez',
      kind: 'PERSONA',
      validFrom: '2026-01-01',
    });

    expect(result.ok).toBe(false);
    expect(saved).toHaveLength(0);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });

  it('registra un evento de auditoria al crear con permiso', async () => {
    const { service, auditEvents } = createService();

    const result = await service.createMaster(ctx, {
      entityType: 'PERSON',
      displayName: 'Juan Perez',
      kind: 'PERSONA',
      validFrom: '2026-01-01',
    });

    expect(result.ok).toBe(true);
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0].action).toBe('MASTER_CREATED');
    expect(auditEvents[0].entityType).toBe('PERSON');
  });
});
