import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../../finanzas/presentation/container';
import { handleReversarIngreso } from '../../../../../finanzas/presentation/ingresos';

export const prerender = false;

// POST /api/finanzas/ingresos/:id/revertir -> { income }
export const POST: APIRoute = async ({ request, params }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleReversarIngreso(buildContainer(), token, String(params.id ?? ''), body);
};
