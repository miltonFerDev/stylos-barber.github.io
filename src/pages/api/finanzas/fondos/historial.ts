import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../finanzas/presentation/container';
import { handleHistorialFondos } from '../../../../finanzas/presentation/fondos';

export const prerender = false;

// GET /api/finanzas/fondos/historial -> { settlements, periods }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleHistorialFondos(buildContainer(), token);
};
