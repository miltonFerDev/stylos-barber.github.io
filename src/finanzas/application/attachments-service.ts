import type { AuditRecorder } from '../domain/audit';
import { isAllowedMime, isWithinSizeLimit, type Attachment } from '../domain/attachments';
import { domainError } from '../domain/errors';
import type { Authorizer } from './permission-service';
import type { CommandContext, Result } from '../domain/types';

export type LinkAttachmentCommand = {
  entityType: string;
  entityId: string;
  storageKey: string;
  checksum: string;
  mime: string;
  sizeBytes: number;
};

export type AttachmentRepository = {
  save(attachment: Attachment): Promise<Attachment>;
};

export type AttachmentsServiceDependencies = {
  attachments: AttachmentRepository;
  authorize: Authorizer;
  audit: AuditRecorder;
  createId: () => string;
};

export class AttachmentsService {
  constructor(private readonly dependencies: AttachmentsServiceDependencies) {}

  async link(ctx: CommandContext, command: LinkAttachmentCommand): Promise<Result<Attachment>> {
    const authorized = await this.dependencies.authorize(ctx, 'LINK_ATTACHMENT');
    if (!authorized.ok) return authorized;

    if (!isAllowedMime(command.mime)) {
      return {
        ok: false,
        error: domainError('UNSUPPORTED_MIME', 'El tipo de archivo no esta permitido.', true, { mime: command.mime }),
      };
    }

    if (!isWithinSizeLimit(command.sizeBytes)) {
      return {
        ok: false,
        error: domainError('ATTACHMENT_TOO_LARGE', 'El archivo supera el tamaño permitido.', true, {
          sizeBytes: command.sizeBytes,
        }),
      };
    }

    if (
      command.entityType.trim().length === 0 ||
      command.entityId.trim().length === 0 ||
      command.storageKey.trim().length === 0 ||
      command.checksum.trim().length === 0
    ) {
      return {
        ok: false,
        error: domainError('MISSING_REQUIRED_FIELD', 'Faltan campos obligatorios del adjunto.', true),
      };
    }

    const attachment: Attachment = {
      id: this.dependencies.createId(),
      entityType: command.entityType,
      entityId: command.entityId,
      storageKey: command.storageKey,
      checksum: command.checksum,
      mime: command.mime,
      sizeBytes: command.sizeBytes,
      isPrivate: true,
      uploadedBy: ctx.actorUserId,
      createdAt: ctx.now,
    };

    const saved = await this.dependencies.attachments.save(attachment);
    await this.dependencies.audit.record({
      entityType: 'attachment',
      entityId: saved.id,
      action: 'ATTACHMENT_LINKED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: saved };
  }
}
