import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleCreateObligacion } from '../../../finanzas/presentation/obligaciones';

export const prerender = false;

// POST /api/finanzas/obligaciones -> 201 { obligation } | 400/401/403/409
export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleCreateObligacion(buildContainer(), token, body);
};
