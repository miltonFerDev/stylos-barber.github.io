import type { UserId } from './types';

export type Attachment = {
  id: string;
  entityType: string;
  entityId: string;
  storageKey: string;
  checksum: string;
  mime: string;
  sizeBytes: number;
  isPrivate: boolean;
  uploadedBy: UserId;
  createdAt: string;
};

export const ALLOWED_MIME_TYPES: readonly string[] = ['application/pdf', 'image/png', 'image/jpeg'];
export const MAX_ATTACHMENT_BYTES = 10_000_000;

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mime);
}

export function isWithinSizeLimit(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_ATTACHMENT_BYTES;
}
