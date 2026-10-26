import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../finanzas/presentation/container';
import { handleHistorialPagos } from '../../../../finanzas/presentation/pagos';

export const prerender = false;

// GET /api/finanzas/pagos/historial -> { payments, periods }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleHistorialPagos(buildContainer(), token);
};
