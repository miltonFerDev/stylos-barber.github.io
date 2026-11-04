import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../../../finanzas/presentation/container';
import { handleReversarDevengo } from '../../../../../../finanzas/presentation/comisiones';

export const prerender = false;

// POST /api/finanzas/comisiones/devengos/:id/revertir -> { record }
export const POST: APIRoute = async ({ request, params }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleReversarDevengo(buildContainer(), token, String(params.id ?? ''), body);
};
