import type { AuditAction, AuditEvent } from '../domain/audit';
import type { CommandContext } from '../domain/types';

export type AuditEventRepository = {
  append(event: AuditEvent): Promise<AuditEvent>;
  findByEntity(entityType: string, entityId: string): Promise<AuditEvent[]>;
};

export type AuditServiceDependencies = {
  auditEvents: AuditEventRepository;
  createId: () => string;
};

export class AuditService {
  constructor(private readonly dependencies: AuditServiceDependencies) {}

  async recordEvent(
    ctx: CommandContext,
    input: { entityType: string; entityId: string; action: AuditAction; reason?: string }
  ): Promise<AuditEvent> {
    const event: AuditEvent = {
      id: this.dependencies.createId(),
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: input.reason ?? null,
    };

    return this.dependencies.auditEvents.append(event);
  }

  async queryHistory(filters: { entityType: string; entityId: string }): Promise<AuditEvent[]> {
    return this.dependencies.auditEvents.findByEntity(filters.entityType, filters.entityId);
  }
}
