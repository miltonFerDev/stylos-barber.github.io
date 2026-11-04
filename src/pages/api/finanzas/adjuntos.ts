import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleListarAdjuntos, handleUploadAdjunto } from '../../../finanzas/presentation/adjuntos';

export const prerender = false;

// POST /api/finanzas/adjuntos -> 201 { attachment }
export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleUploadAdjunto(buildContainer(), token, body);
};

// GET /api/finanzas/adjuntos?entityType=&entityId= -> { attachments }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const url = new URL(request.url);
  return handleListarAdjuntos(
    buildContainer(),
    token,
    url.searchParams.get('entityType') ?? '',
    url.searchParams.get('entityId') ?? ''
  );
};
