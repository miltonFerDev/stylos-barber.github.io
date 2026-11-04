import { createHash } from 'node:crypto';
import { extensionForMime, isAllowedMime, isWithinSizeLimit } from '../domain/attachments';
import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

const BUCKET = 'attachments';

/**
 * Sube un comprobante privado a storage y vincula sus metadatos.
 * Body JSON: { entityType, entityId, mime, sizeBytes, dataBase64 }.
 */
export async function handleUploadAdjunto(
  container: FinanzasContainer,
  token: string | null,
  body: unknown
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const b = (body ?? {}) as Record<string, unknown>;
  const entityType = String(b.entityType ?? '');
  const entityId = String(b.entityId ?? '');
  const mime = String(b.mime ?? '');
  const sizeBytes = Number(b.sizeBytes ?? 0);
  const dataBase64 = String(b.dataBase64 ?? '');

  if (!isAllowedMime(mime)) return json(400, { error: 'UNSUPPORTED_MIME' });
  if (!isWithinSizeLimit(sizeBytes)) return json(400, { error: 'ATTACHMENT_TOO_LARGE' });
  if (!entityType || !entityId || !dataBase64) {
    return json(400, { error: 'MISSING_REQUIRED_FIELD', message: 'Faltan campos del adjunto.' });
  }

  const bytes = Buffer.from(dataBase64, 'base64');
  if (bytes.length !== sizeBytes) {
    return json(400, { error: 'VALIDATION_FAILED', message: 'El tamaño del archivo no coincide.' });
  }

  const checksum = createHash('sha256').update(bytes).digest('hex');
  const storageKey = `${entityType}/${entityId}/${crypto.randomUUID()}.${extensionForMime(mime)}`;

  const { error: uploadError } = await container.supabase.storage
    .from(BUCKET)
    .upload(storageKey, bytes, { contentType: mime });
  if (uploadError) {
    return json(500, { error: 'UPLOAD_FAILED', message: uploadError.message });
  }

  const ctx = commandContext(userId, crypto.randomUUID());
  const result = await container.attachments.link(ctx, {
    entityType,
    entityId,
    storageKey,
    checksum,
    mime,
    sizeBytes,
  });
  if (!result.ok) {
    await container.supabase.storage.from(BUCKET).remove([storageKey]);
    return json(400, { error: result.error.code, message: result.error.message });
  }

  return json(201, { attachment: result.value });
}

/**
 * Lista los adjuntos (privados) de un documento.
 */
export async function handleListarAdjuntos(
  container: FinanzasContainer,
  token: string | null,
  entityType: string,
  entityId: string
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const ctx = commandContext(userId, crypto.randomUUID());
  const authorized = await container.authorize(ctx, 'LINK_ATTACHMENT');
  if (!authorized.ok) return json(403, { error: authorized.error.code });

  const attachments = await container.attachmentsRepo.findByEntity(entityType, entityId);
  return json(200, { attachments });
}

/**
 * Devuelve una URL firmada (temporal) para descargar un adjunto privado.
 */
export async function handleDescargarAdjunto(
  container: FinanzasContainer,
  token: string | null,
  attachmentId: string
): Promise<Response> {
  const userId = await resolveActor(container.supabase, token);
  if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

  const attachment = await container.attachmentsRepo.findById(attachmentId);
  if (!attachment) return json(404, { error: 'ATTACHMENT_NOT_FOUND' });

  const { data, error } = await container.supabase.storage.from(BUCKET).createSignedUrl(attachment.storageKey, 60);
  if (error || !data?.signedUrl) {
    return json(500, { error: 'DOWNLOAD_FAILED', message: error?.message });
  }

  return json(200, { url: data.signedUrl });
}
