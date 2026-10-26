import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleCierres, handleRegistrarCierre } from '../../../finanzas/presentation/cierres';

export const prerender = false;

// GET /api/finanzas/cierres -> { accounts, periods, reconciliations }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleCierres(buildContainer(), token);
};

// POST /api/finanzas/cierres -> 201 { closing } | 400/401/403
export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleRegistrarCierre(buildContainer(), token, body);
};
