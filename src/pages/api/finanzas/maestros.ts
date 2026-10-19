import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleMaestros } from '../../../finanzas/presentation/maestros';

export const prerender = false;

// GET /api/finanzas/maestros -> { persons, categories, resultLines, accounts, periods }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleMaestros(buildContainer(), token);
};
