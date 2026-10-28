import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../finanzas/presentation/container';
import { handlePagarComision } from '../../../../finanzas/presentation/comisiones';

export const prerender = false;

// POST /api/finanzas/comisiones/pagar -> 201 { payment } | 400/401/403
export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handlePagarComision(buildContainer(), token, body);
};
