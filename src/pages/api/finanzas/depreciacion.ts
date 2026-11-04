import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleDepreciacion } from '../../../finanzas/presentation/depreciacion';

export const prerender = false;

// GET /api/finanzas/depreciacion -> { posted } (Vercel Cron manda GET con CRON_SECRET)
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleDepreciacion(buildContainer(), token);
};

// POST /api/finanzas/depreciacion -> { posted } (catch-up manual idempotente)
export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleDepreciacion(buildContainer(), token);
};
