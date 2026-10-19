import type { APIRoute } from 'astro';
import { buildContainer } from '../../../finanzas/presentation/container';
import { handleDashboard } from '../../../finanzas/presentation/dashboard';

export const prerender = false;

// GET /api/finanzas/dashboard -> { availability, obligations }
export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  return handleDashboard(buildContainer(), token);
};
