import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../../finanzas/presentation/container';
import { handleDescargarAdjunto } from '../../../../../finanzas/presentation/adjuntos';

export const prerender = false;

// GET /api/finanzas/adjuntos/:id/descargar -> { url }
export const GET: APIRoute = async ({ request, params }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleDescargarAdjunto(buildContainer(), token, String(params.id ?? ''));
};
