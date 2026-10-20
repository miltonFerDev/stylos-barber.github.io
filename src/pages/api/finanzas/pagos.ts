import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handlePendientes, handleRegisterPago } from '../../../finanzas/presentation/pagos';

export const prerender = false;

// GET /api/finanzas/pagos -> { obligations, accounts, periods }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handlePendientes(buildContainer(), token);
};

// POST /api/finanzas/pagos -> 201 { payment } | 400/401/403
export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleRegisterPago(buildContainer(), token, body);
};
