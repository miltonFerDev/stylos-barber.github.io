import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../finanzas/presentation/container';
import { handleHistorialTransferencias } from '../../../../finanzas/presentation/transferencias';

export const prerender = false;

// GET /api/finanzas/transferencias/historial -> { transfers, periods }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleHistorialTransferencias(buildContainer(), token);
};
