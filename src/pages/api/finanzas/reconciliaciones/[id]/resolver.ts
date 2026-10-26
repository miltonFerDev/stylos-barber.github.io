import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../../finanzas/presentation/container';
import { handleResolverReconciliacion } from '../../../../../finanzas/presentation/cierres';

export const prerender = false;

// POST /api/finanzas/reconciliaciones/:id/resolver -> { reconciliation }
export const POST: APIRoute = async ({ request, params }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleResolverReconciliacion(buildContainer(), token, String(params.id ?? ''), body);
};
