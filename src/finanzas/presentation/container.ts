import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountingPeriodRepository } from '../application/journal-service';
import type { MasterRepository } from '../application/master-data-service';
import { ObligationsService } from '../application/obligations-service';
import { PermissionService, type Authorizer, type RoleRepository } from '../application/permission-service';
import { ReportsService } from '../application/reports-service';
import { createServerSupabaseClient } from '../repositories/supabase-server';
import {
  SupabaseAccountMovementRepository,
  SupabaseAccountingPeriodRepository,
  SupabaseAuditQueryRepository,
  SupabaseAuditRecorder,
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
  obligations: ObligationsService;
  masters: MasterRepository;
  periods: AccountingPeriodRepository;
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

  const masters = new SupabaseMasterRepository(supabase);
  const periods = new SupabaseAccountingPeriodRepository(supabase);
  const obligationsRepo = new SupabaseObligationRepository(supabase);
  const audit = new SupabaseAuditRecorder(supabase);

  const reports = new ReportsService({
    masters,
    movements: new SupabaseAccountMovementRepository(supabase),
    obligations: obligationsRepo,
    auditHistory: new SupabaseAuditQueryRepository(supabase),
    journalEntries: new SupabaseJournalEntryQueryRepository(supabase),
    authorize,
  });

  const obligations = new ObligationsService({
    obligations: obligationsRepo,
    masters,
    periods,
    authorize,
    audit,
    createId: () => crypto.randomUUID(),
  });

  return { supabase, roles, authorize, reports, obligations, masters, periods };
}
