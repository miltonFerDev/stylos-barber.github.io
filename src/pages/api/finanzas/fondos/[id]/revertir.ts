import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../../finanzas/presentation/container';
import { handleReversarFondo } from '../../../../../finanzas/presentation/fondos';

export const prerender = false;

// POST /api/finanzas/fondos/:id/revertir -> { settlement }
export const POST: APIRoute = async ({ request, params }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleReversarFondo(buildContainer(), token, String(params.id ?? ''), body);
};
