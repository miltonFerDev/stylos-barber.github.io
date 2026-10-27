import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleRegistrarTransferencia, handleTransferencias } from '../../../finanzas/presentation/transferencias';

export const prerender = false;

// GET /api/finanzas/transferencias -> { accounts, periods }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleTransferencias(buildContainer(), token);
};

// POST /api/finanzas/transferencias -> 201 { transfer } | 400/401/403
export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const body = await request.json().catch(() => null);
  return handleRegistrarTransferencia(buildContainer(), token, body);
};
