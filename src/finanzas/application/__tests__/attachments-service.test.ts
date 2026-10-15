import { describe, expect, it } from 'vitest';
import { AttachmentsService, type AttachmentRepository } from '../attachments-service';
import type { Attachment } from '../../domain/attachments';
import type { Authorizer } from '../permission-service';
import type { AuditEventInput, AuditRecorder } from '../../domain/audit';
import type { CommandContext, UserId } from '../../domain/types';

const userId = 'user-1' as UserId;
const ctx: CommandContext = {
  actorUserId: userId,
  idempotencyKey: 'att-1',
  now: '2026-10-13T12:00:00.000Z',
};

function createService(options?: { authorize?: Authorizer }) {
  let nextId = 0;
  const saved: Attachment[] = [];
  const auditEvents: AuditEventInput[] = [];

  const attachments: AttachmentRepository = {
    async save(attachment) {
      saved.push(attachment);
      return attachment;
    },
  };

  const authorize: Authorizer = options?.authorize ?? (async () => ({ ok: true, value: undefined }));
  const audit: AuditRecorder = {
    async record(event) {
      auditEvents.push(event);
    },
  };

  return {
    service: new AttachmentsService({ attachments, authorize, audit, createId: () => `att-${++nextId}` }),
    saved,
    auditEvents,
  };
}

describe('AttachmentsService.link', () => {
  it('vincula un adjunto privado', async () => {
    const { service, saved, auditEvents } = createService();

    const result = await service.link(ctx, {
      entityType: 'payment',
      entityId: 'pay-1',
      storageKey: 'bucket/pay-1.pdf',
      checksum: 'abc123',
      mime: 'application/pdf',
      sizeBytes: 1000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.isPrivate).toBe(true);
    expect(saved).toHaveLength(1);
    expect(auditEvents.some(e => e.action === 'ATTACHMENT_LINKED')).toBe(true);
  });

  it('rechaza mime no permitido', async () => {
    const { service } = createService();

    const result = await service.link(ctx, {
      entityType: 'payment',
      entityId: 'pay-1',
      storageKey: 'bucket/pay-1.exe',
      checksum: 'abc123',
      mime: 'application/octet-stream',
      sizeBytes: 1000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNSUPPORTED_MIME');
  });

  it('rechaza archivo demasiado grande', async () => {
    const { service } = createService();

    const result = await service.link(ctx, {
      entityType: 'payment',
      entityId: 'pay-1',
      storageKey: 'bucket/pay-1.pdf',
      checksum: 'abc123',
      mime: 'application/pdf',
      sizeBytes: 20_000_000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ATTACHMENT_TOO_LARGE');
  });

  it('rechaza sin permiso', async () => {
    const denied: Authorizer = async () => ({
      ok: false,
      error: { code: 'PERMISSION_DENIED', message: 'No tenes permiso.', recoverable: false },
    });
    const { service } = createService({ authorize: denied });

    const result = await service.link(ctx, {
      entityType: 'payment',
      entityId: 'pay-1',
      storageKey: 'bucket/pay-1.pdf',
      checksum: 'abc123',
      mime: 'application/pdf',
      sizeBytes: 1000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});
