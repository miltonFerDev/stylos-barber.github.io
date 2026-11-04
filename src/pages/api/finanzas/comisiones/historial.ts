import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../finanzas/presentation/container';
import { handleHistorialComisiones } from '../../../../finanzas/presentation/comisiones';

export const prerender = false;

// GET /api/finanzas/comisiones/historial -> { records, payments, periods }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleHistorialComisiones(buildContainer(), token);
};
