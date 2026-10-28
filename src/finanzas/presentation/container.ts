import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountingPeriodRepository } from '../application/journal-service';
import { JournalService } from '../application/journal-service';
import { ClosingsService, type ReconciliationRepository } from '../application/closings-service';
import { CommissionsService } from '../application/commissions-service';
import { DepreciationService } from '../application/depreciation-service';
import { ExternalSettlementsService, type ExternalSettlementRepository } from '../application/external-settlements-service';
import { ForecastService } from '../application/forecast-service';
import { IncomesService } from '../application/incomes-service';
import { InvestmentsService, type InvestmentRepository } from '../application/investments-service';
import type { CapexConfig } from '../domain/depreciation';
import type { MasterRepository } from '../application/master-data-service';
import { ObligationsService } from '../application/obligations-service';
import { PaymentsService, type PaymentRepository } from '../application/payments-service';
import { PermissionService, type Authorizer, type RoleRepository } from '../application/permission-service';
import { ReportsService } from '../application/reports-service';
import { TransfersService } from '../application/transfers-service';
import { createServerSupabaseClient } from '../repositories/supabase-server';
import {
  SupabaseAccountMovementRepository,
  SupabaseAccountingPeriodRepository,
  SupabaseAuditQueryRepository,
  SupabaseAuditRecorder,
  SupabaseDailyClosingRepository,
  SupabaseJournalEntryQueryRepository,
  SupabaseJournalEntryRepository,
  SupabaseMasterRepository,
  SupabaseObligationRepository,
  SupabasePaymentApplicationRepository,
  SupabasePaymentRepository,
  SupabaseReconciliationRepository,
  SupabaseInvestmentRepository,
  SupabaseExternalSettlementRepository,
  SupabaseForecastAccountRepository,
  SupabaseForecastIncomeRepository,
  SupabaseForecastObligationRepository,
  SupabaseForecastReconciliationRepository,
  SupabaseForecastSettingsRepository,
  SupabaseInvestmentEvaluationRepository,
  SupabaseRoleRepository,
  SupabaseTransferRepository,
  SupabaseIncomeRecordRepository,
  SupabaseIncomeDistributionRepository,
  SupabaseCommissionRepository,
} from '../repositories/supabase-repositories';

export type FinanzasContainer = {
  supabase: SupabaseClient;
  roles: RoleRepository;
  authorize: Authorizer;
  reports: ReportsService;
  obligations: ObligationsService;
  payments: PaymentsService;
  paymentsRepo: PaymentRepository;
  closings: ClosingsService;
  reconciliationsRepo: ReconciliationRepository;
  depreciation: DepreciationService;
  settlements: ExternalSettlementsService;
  forecast: ForecastService;
  investments: InvestmentsService;
  investmentsRepo: InvestmentRepository;
  transfers: TransfersService;
  incomes: IncomesService;
  commissions: CommissionsService;
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

  const closingsRepo = new SupabaseDailyClosingRepository(supabase);
  const reconciliationsRepo = new SupabaseReconciliationRepository(supabase);

  const closings = new ClosingsService({
    closings: closingsRepo,
    reconciliations: reconciliationsRepo,
    movements,
    masters,
    periods,
    journal,
    authorize,
    audit,
    createId: () => crypto.randomUUID(),
    adjustmentLedgerAccounts: { shortfall: '5.10', surplus: '4.3' },
  });

  const capex: CapexConfig = {
    threshold: { amount: '1000.00', currency: 'ARS' }, // placeholder: configurar el umbral real
    usefulLifeMonths: 60,
    residual: { amount: '0.00', currency: 'ARS' },
    capitalizeLedgerAccountId: '1.3',
    expenseLedgerAccountId: '5.11',
    accumulatedDepreciationLedgerAccountId: '1.3.9',
    depreciationExpenseLedgerAccountId: '5.9',
  };

  const investmentsRepo = new SupabaseInvestmentRepository(supabase);

  const depreciation = new DepreciationService({
    investments: investmentsRepo,
    periods,
    journal,
    entries: journalEntriesRepo,
    capex,
    audit,
    createId: () => crypto.randomUUID(),
  });

  const forecast = new ForecastService({
    accounts: new SupabaseForecastAccountRepository(supabase),
    reconciliations: new SupabaseForecastReconciliationRepository(supabase),
    incomes: new SupabaseForecastIncomeRepository(supabase),
    obligations: new SupabaseForecastObligationRepository(supabase),
    settings: new SupabaseForecastSettingsRepository(supabase),
    authorize,
    maxReconciliationAgeDays: 30,
  });

  const investments = new InvestmentsService({
    investments: investmentsRepo,
    evaluations: new SupabaseInvestmentEvaluationRepository(supabase),
    forecast,
    movements,
    masters,
    periods,
    journal,
    capex,
    authorize,
    audit,
    createId: () => crypto.randomUUID(),
  });

  const settlements = new ExternalSettlementsService({
    settlements: new SupabaseExternalSettlementRepository(supabase),
    movements,
    masters,
    periods,
    journal,
    authorize,
    audit,
    createId: () => crypto.randomUUID(),
    settlementLedgerAccounts: { PRESTAMO: '2.3', CUENTA_CORRIENTE: '2.3', APORTE: '3.1' },
  });

  const transfers = new TransfersService({
    transfers: new SupabaseTransferRepository(supabase),
    movements,
    masters,
    periods,
    journal,
    authorize,
    audit,
    createId: () => crypto.randomUUID(),
  });

  const incomes = new IncomesService({
    incomes: new SupabaseIncomeRecordRepository(supabase),
    distributions: new SupabaseIncomeDistributionRepository(supabase),
    movements,
    masters,
    periods,
    journal,
    authorize,
    audit,
    createId: () => crypto.randomUUID(),
    incomeLedgerAccounts: { servicios: '4.1', productos: '4.2' },
  });

  const commissions = new CommissionsService({
    commissions: new SupabaseCommissionRepository(supabase),
    movements,
    masters,
    periods,
    journal,
    authorize,
    audit,
    createId: () => crypto.randomUUID(),
    commissionLedgerAccounts: { expense: '5.1', payable: '2.1.1' },
  });

  return {
    supabase,
    roles,
    authorize,
    reports,
    obligations,
    payments,
    paymentsRepo,
    closings,
    reconciliationsRepo,
    depreciation,
    settlements,
    forecast,
    investments,
    investmentsRepo,
    transfers,
    incomes,
    commissions,
    masters,
    periods,
  };
}
