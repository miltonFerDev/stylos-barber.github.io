import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../../finanzas/presentation/container';
import { handleReversarTransferencia } from '../../../../../finanzas/presentation/transferencias';

export const prerender = false;

// POST /api/finanzas/transferencias/:id/revertir -> { transfer }
export const POST: APIRoute = async ({ request, params }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleReversarTransferencia(buildContainer(), token, String(params.id ?? ''), body);
};
