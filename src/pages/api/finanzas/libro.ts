import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleLibro } from '../../../finanzas/presentation/libro';

export const prerender = false;

// GET /api/finanzas/libro -> { lines: [...] } (libro diario, solo lectura)
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleLibro(buildContainer(), token);
};
