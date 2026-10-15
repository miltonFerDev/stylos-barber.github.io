import { describe, expect, it } from 'vitest';
import { PermissionService, type RoleRepository } from '../permission-service';
import { isDelegationActive } from '../../domain/identity';
import type { CommandContext, RoleCode, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;

const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'idem-1',
  now: '2026-10-13T12:00:00.000Z',
};

type DelegationRow = {
  roleCode: RoleCode;
  delegateUserId: UserId;
  startsAt: string;
  endsAt: string;
};

function createService(options: { directRoles: RoleCode[]; delegations?: DelegationRow[] }) {
  const directRoles = options.directRoles;
  const delegations = options.delegations ?? [];

  const roles: RoleRepository = {
    async findUserRoles() {
      return directRoles;
    },
    async findActiveDelegations(actorId, at) {
      return delegations
        .filter(d => d.delegateUserId === actorId && isDelegationActive({ ...d, id: '', reason: '', createdBy: actorId }, at))
        .map(d => d.roleCode);
    },
  };

  return { service: new PermissionService({ roles }) };
}

describe('PermissionService.authorize', () => {
  it('autoriza con rol permitido', async () => {
    const { service } = createService({ directRoles: ['DIRECCION'] });
    const result = await service.authorize(ctx, 'APPROVE_INVESTMENT');
    expect(result.ok).toBe(true);
  });

  it('rechaza usuario sin roles', async () => {
    const { service } = createService({ directRoles: [] });
    const result = await service.authorize(ctx, 'CREATE_OBLIGATION');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });

  it('rechaza rol insuficiente', async () => {
    const { service } = createService({ directRoles: ['TESORERIA'] });
    const result = await service.authorize(ctx, 'APPROVE_INVESTMENT');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });

  it('delegacion activa otorga el rol', async () => {
    const { service } = createService({
      directRoles: [],
      delegations: [{ roleCode: 'TESORERIA', delegateUserId: userId, startsAt: '2026-10-01', endsAt: '2026-10-31' }],
    });
    const result = await service.authorize(ctx, 'RECONCILE_ACCOUNT');
    expect(result.ok).toBe(true);
  });

  it('delegacion vencida no otorga el rol', async () => {
    const { service } = createService({
      directRoles: [],
      delegations: [{ roleCode: 'TESORERIA', delegateUserId: userId, startsAt: '2026-09-01', endsAt: '2026-09-30' }],
    });
    const result = await service.authorize(ctx, 'RECONCILE_ACCOUNT');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});
