import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleComisiones } from '../../../finanzas/presentation/comisiones';

export const prerender = false;

// GET /api/finanzas/comisiones -> { barbers, accounts, periods, balances }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleComisiones(buildContainer(), token);
};
