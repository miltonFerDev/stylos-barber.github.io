import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleIngresos, handleRegistrarIngreso } from '../../../finanzas/presentation/ingresos';

export const prerender = false;

// GET /api/finanzas/ingresos -> { accounts, periods }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleIngresos(buildContainer(), token);
};

// POST /api/finanzas/ingresos -> 201 { income } | 400/401/403
export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleRegistrarIngreso(buildContainer(), token, body);
};
