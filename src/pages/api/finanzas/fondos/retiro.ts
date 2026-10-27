import type { APIRoute } from 'astro';
import { buildContainer } from '../../../../finanzas/presentation/container';
import { handleRetiro } from '../../../../finanzas/presentation/fondos';

export const prerender = false;

// POST /api/finanzas/fondos/retiro -> 201 { settlement } | 400/401/403
export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleRetiro(buildContainer(), token, body);
};
