import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../../../finanzas/presentation/container';
import { handleReversarPagoComision } from '../../../../../../finanzas/presentation/comisiones';

export const prerender = false;

// POST /api/finanzas/comisiones/pagos/:id/revertir -> { payment }
export const POST: APIRoute = async ({ request, params }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleReversarPagoComision(buildContainer(), token, String(params.id ?? ''), body);
};
