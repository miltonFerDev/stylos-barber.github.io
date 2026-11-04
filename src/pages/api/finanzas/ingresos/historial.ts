import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../finanzas/presentation/container';
import { handleHistorialIngresos } from '../../../../finanzas/presentation/ingresos';

export const prerender = false;

// GET /api/finanzas/ingresos/historial -> { incomes, periods }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleHistorialIngresos(buildContainer(), token);
};
