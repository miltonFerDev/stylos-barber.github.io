import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleFondos } from '../../../finanzas/presentation/fondos';

export const prerender = false;

// GET /api/finanzas/fondos -> { persons, resultLines, accounts, periods }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleFondos(buildContainer(), token);
};
