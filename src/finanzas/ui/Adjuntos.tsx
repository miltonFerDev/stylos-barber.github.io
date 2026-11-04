import { useCallback, useEffect, useState } from 'react';
import { getFinanzasAccessToken } from '../presentation/client';

type Adjunto = {
  id: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
};

const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX = 10_000_000;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Adjuntos (comprobantes privados) de un documento operativo. */
export function Adjuntos({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [attachments, setAttachments] = useState<Adjunto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getFinanzasAccessToken();
    if (!token) return;
    const res = await fetch(
      `/api/finanzas/adjuntos?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const data = await res.json();
      setAttachments(data.attachments ?? []);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function onFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      setError('Solo se permiten PDF, PNG o JPG.');
      return;
    }
    if (file.size > MAX) {
      setError('El archivo supera 10 MB.');
      return;
    }
    setError(null);
    setUploading(true);

    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    const token = await getFinanzasAccessToken();
    const res = await fetch('/api/finanzas/adjuntos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ entityType, entityId, mime: file.type, sizeBytes: file.size, dataBase64 }),
    });
    setUploading(false);

    if (res.ok) {
      load().catch(() => {});
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.message || 'No se pudo subir el adjunto.');
    }
  }

  async function onDescargar(id: string) {
    const token = await getFinanzasAccessToken();
    const res = await fetch(`/api/finanzas/adjuntos/${id}/descargar`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-finBorder pt-3">
      {attachments.length === 0 ? (
        <p className="text-sm text-finMuted">Sin comprobantes.</p>
      ) : (
        <ul className="space-y-1">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2">
              <span className="truncate text-sm text-finText">
                {a.mime.split('/')[1]?.toUpperCase()} · {formatSize(a.sizeBytes)}
              </span>
              <button
                type="button"
                onClick={() => onDescargar(a.id)}
                className="text-sm font-semibold text-finAccent underline"
              >
                Descargar
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="block cursor-pointer text-sm font-semibold text-finAccent underline">
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        {uploading ? 'Subiendo…' : 'Adjuntar comprobante'}
      </label>

      {error && (
        <p role="alert" className="text-sm text-finDanger">{error}</p>
      )}
    </div>
  );
}
