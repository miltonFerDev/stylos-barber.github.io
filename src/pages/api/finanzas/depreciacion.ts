import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleDepreciacion } from '../../../finanzas/presentation/depreciacion';

export const prerender = false;

// POST /api/finanzas/depreciacion -> { posted } (catch-up idempotente)
export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleDepreciacion(buildContainer(), token);
};
