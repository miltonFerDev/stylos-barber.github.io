import type { SupabaseClient } from '@supabase/supabase-js';
import { PermissionService, type Authorizer, type RoleRepository } from '../application/permission-service';
import { ReportsService } from '../application/reports-service';
import { createServerSupabaseClient } from '../repositories/supabase-server';
import {
  SupabaseAccountMovementRepository,
  SupabaseAuditQueryRepository,
  SupabaseJournalEntryQueryRepository,
  SupabaseMasterRepository,
  SupabaseObligationRepository,
  SupabaseRoleRepository,
} from '../repositories/supabase-repositories';

export type FinanzasContainer = {
  supabase: SupabaseClient;
  roles: RoleRepository;
  authorize: Authorizer;
  reports: ReportsService;
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
  const authorize: Authorizer = (ctx, action) => permission.authorize(ctx, action);

  const reports = new ReportsService({
    masters: new SupabaseMasterRepository(supabase),
    movements: new SupabaseAccountMovementRepository(supabase),
    obligations: new SupabaseObligationRepository(supabase),
    auditHistory: new SupabaseAuditQueryRepository(supabase),
    journalEntries: new SupabaseJournalEntryQueryRepository(supabase),
    authorize,
  });

  return { supabase, roles, authorize, reports };
}
