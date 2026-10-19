import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleAgenda } from '../../../finanzas/presentation/agenda';

export const prerender = false;

// GET /api/finanzas/agenda -> { obligations }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleAgenda(buildContainer(), token);
};
