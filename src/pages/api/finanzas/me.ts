import type { APIRoute } from 'astro';
import { resolveActor } from '../../../finanzas/presentation/auth';
import { buildContainer } from '../../../finanzas/presentation/container';

export const prerender = false;

// Walking skeleton de E5: prueba auth + RBAC server-side.
// GET /api/finanzas/me -> { userId, roles } | 401
export const GET: APIRoute = async ({ request }) => {
  const container = buildContainer();
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const userId = await resolveActor(container.supabase, token);

  if (!userId) {
    return new Response(JSON.stringify({ error: 'UNAUTHENTICATED' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const roles = await container.roles.findUserRoles(userId);
  return new Response(JSON.stringify({ userId, roles }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
