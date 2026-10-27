import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../../finanzas/presentation/container';
import { handleDecidir } from '../../../../../finanzas/presentation/inversiones';

export const prerender = false;

// POST /api/finanzas/inversiones/:id/decidir -> { investment }
export const POST: APIRoute = async ({ request, params }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleDecidir(buildContainer(), token, String(params.id ?? ''), body);
};
