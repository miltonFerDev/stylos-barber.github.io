import { describe, expect, it } from 'vitest';
import { AuditService, type AuditEventRepository } from '../audit-service';
import type { AuditEvent } from '../../domain/audit';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;

const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'idem-1',
  now: '2026-10-13T12:00:00.000Z',
};

function createService() {
  const saved: AuditEvent[] = [];
  const auditEvents: AuditEventRepository = {
    async append(event) {
      saved.push(event);
      return event;
    },
    async findByEntity(entityType, entityId) {
      return saved.filter(e => e.entityType === entityType && e.entityId === entityId);
    },
  };

  return {
    service: new AuditService({ auditEvents, createId: () => `audit-${saved.length + 1}` }),
    saved,
  };
}

describe('AuditService', () => {
  it('recordEvent agrega un evento con id, actor y fecha', async () => {
    const { service, saved } = createService();

    const event = await service.recordEvent(ctx, {
      entityType: 'journal_entry',
      entityId: 'entry-1',
      action: 'JOURNAL_ENTRY_POSTED',
    });

    expect(saved).toHaveLength(1);
    expect(event.id).toBe('audit-1');
    expect(event.actorUserId).toBe(userId);
    expect(event.occurredAt).toBe(ctx.now);
    expect(event.reason).toBeNull();
  });

  it('queryHistory devuelve los eventos de una entidad', async () => {
    const { service } = createService();

    await service.recordEvent(ctx, { entityType: 'journal_entry', entityId: 'entry-1', action: 'JOURNAL_ENTRY_POSTED' });
    await service.recordEvent(ctx, { entityType: 'journal_entry', entityId: 'entry-2', action: 'JOURNAL_ENTRY_POSTED' });

    const history = await service.queryHistory({ entityType: 'journal_entry', entityId: 'entry-1' });

    expect(history).toHaveLength(1);
    expect(history[0].entityId).toBe('entry-1');
  });

  it('es append-only: dos eventos no se sobrescriben', async () => {
    const { service, saved } = createService();

    await service.recordEvent(ctx, { entityType: 'journal_entry', entityId: 'entry-1', action: 'JOURNAL_ENTRY_POSTED' });
    await service.recordEvent(ctx, { entityType: 'journal_entry', entityId: 'entry-1', action: 'JOURNAL_ENTRY_REVERSED', reason: 'Error' });

    expect(saved).toHaveLength(2);
    expect(saved[0].action).toBe('JOURNAL_ENTRY_POSTED');
    expect(saved[1].action).toBe('JOURNAL_ENTRY_REVERSED');
    expect(saved[1].reason).toBe('Error');
  });
});
