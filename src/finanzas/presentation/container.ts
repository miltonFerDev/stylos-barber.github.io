import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountingPeriodRepository } from '../application/journal-service';
import { JournalService } from '../application/journal-service';
import type { MasterRepository } from '../application/master-data-service';
import { ObligationsService } from '../application/obligations-service';
import { PaymentsService, type PaymentRepository } from '../application/payments-service';
import { PermissionService, type Authorizer, type RoleRepository } from '../application/permission-service';
import { ReportsService } from '../application/reports-service';
import { createServerSupabaseClient } from '../repositories/supabase-server';
import {
  SupabaseAccountMovementRepository,
  SupabaseAccountingPeriodRepository,
  SupabaseAuditQueryRepository,
  SupabaseAuditRecorder,
  SupabaseJournalEntryQueryRepository,
  SupabaseJournalEntryRepository,
  SupabaseMasterRepository,
  SupabaseObligationRepository,
  SupabasePaymentApplicationRepository,
  SupabasePaymentRepository,
  SupabaseRoleRepository,
} from '../repositories/supabase-repositories';

export type FinanzasContainer = {
  supabase: SupabaseClient;
  roles: RoleRepository;
  authorize: Authorizer;
  reports: ReportsService;
  obligations: ObligationsService;
  payments: PaymentsService;
  paymentsRepo: PaymentRepository;
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
  const movements = new SupabaseAccountMovementRepository(supabase);
  const applicationsRepo = new SupabasePaymentApplicationRepository(supabase);

  const reports = new ReportsService({
    masters,
    movements,
    obligations: obligationsRepo,
    applications: applicationsRepo,
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

  const journalEntriesRepo = new SupabaseJournalEntryRepository(supabase);

  const journal = new JournalService({
    periods,
    entries: journalEntriesRepo,
    createId: () => crypto.randomUUID(),
    audit,
  });

  const paymentsRepo = new SupabasePaymentRepository(supabase);

  const payments = new PaymentsService({
    payments: paymentsRepo,
    applications: applicationsRepo,
    movements,
    obligations: obligationsRepo,
    masters,
    periods,
    journal,
    journalEntries: journalEntriesRepo,
    authorize,
    audit,
    createId: () => crypto.randomUUID(),
  });

  return { supabase, roles, authorize, reports, obligations, payments, paymentsRepo, masters, periods };
}
