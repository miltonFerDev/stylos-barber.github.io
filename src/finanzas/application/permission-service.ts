import { domainError } from '../domain/errors';
import { hasPermission, type PermissionAction } from '../domain/permissions';
import type { CommandContext, Result, RoleCode, UserId } from '../domain/types';

export type RoleRepository = {
  findUserRoles(userId: UserId): Promise<RoleCode[]>;
  findActiveDelegations(userId: UserId, at: string): Promise<RoleCode[]>;
};

export type PermissionServiceDependencies = {
  roles: RoleRepository;
};

export type Authorizer = (ctx: CommandContext, action: PermissionAction) => Promise<Result<void>>;

export class PermissionService {
  constructor(private readonly dependencies: PermissionServiceDependencies) {}

  async authorize(ctx: CommandContext, action: PermissionAction): Promise<Result<void>> {
    const directRoles = await this.dependencies.roles.findUserRoles(ctx.actorUserId);
    const delegatedRoles = await this.dependencies.roles.findActiveDelegations(ctx.actorUserId, ctx.now);

    const effectiveRoles = Array.from(new Set([...directRoles, ...delegatedRoles]));

    if (!hasPermission(effectiveRoles, action)) {
      return {
        ok: false,
        error: domainError('PERMISSION_DENIED', 'No tenes permiso para realizar esta accion.', false, {
          action,
          roles: effectiveRoles,
        }),
      };
    }

    return { ok: true, value: undefined };
  }
}
