import type { SupabaseClient } from '@supabase/supabase-js';
import { PermissionService, type Authorizer, type RoleRepository } from '../application/permission-service';
import { createServerSupabaseClient } from '../repositories/supabase-server';
import { SupabaseRoleRepository } from '../repositories/supabase-repositories';

export type FinanzasContainer = {
  supabase: SupabaseClient;
  roles: RoleRepository;
  authorize: Authorizer;
};

/**
 * Composition root: cablea repos + servicios para un endpoint.
 * Crece por endpoint según lo que cada uno necesite (no especula).
 * `client` es inyectable para tests.
 */
export function buildContainer(client?: SupabaseClient): FinanzasContainer {
  const supabase = client ?? createServerSupabaseClient();
  const roles = new SupabaseRoleRepository(supabase);
  const permission = new PermissionService({ roles });

  return {
    supabase,
    roles,
    authorize: (ctx, action) => permission.authorize(ctx, action),
  };
}
