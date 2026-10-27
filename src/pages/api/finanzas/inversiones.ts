import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleCrearInversion, handleInversiones } from '../../../finanzas/presentation/inversiones';

export const prerender = false;

// GET /api/finanzas/inversiones -> { investments, accounts, periods }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleInversiones(buildContainer(), token);
};

// POST /api/finanzas/inversiones -> 201 { investment } | 400/401/403
export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleCrearInversion(buildContainer(), token, body);
};
