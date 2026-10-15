import type { UserId } from './types';

export type PersonKind = 'PERSONA' | 'EMPRESA';
export type CategoryNature = 'OPERATIVA' | 'EXTRAORDINARIA' | 'FINANCIERA';
export type ResultLineNature = 'INGRESO' | 'COSTO' | 'GASTO' | 'NO_RESULTADO';
export type LedgerAccountNature = 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO' | 'PUENTE';
export type AccountKind = 'EFECTIVO' | 'BANCO' | 'BILLETERA' | 'TRANSITORIA';
export type AccountOwnership = 'PROPIA' | 'EXTERNA' | 'RESTRINGIDA';

export type MasterEntityType =
  | 'PERSON'
  | 'CATEGORY'
  | 'SUBCATEGORY'
  | 'RESULT_LINE'
  | 'LEDGER_ACCOUNT'
  | 'ACCOUNT';

export type Validity = {
  validFrom: string;
  validTo: string | null;
};

export type MasterBase = Validity & {
  id: string;
  createdAt: string;
  createdBy: UserId;
};

export type DuplicateReason = 'SAME_NAME' | 'SAME_TAX_ID';

export type MasterDuplicate = {
  entityType: MasterEntityType;
  existingId: string;
  existingCode: string | null;
  existingName: string;
  reason: DuplicateReason;
};

export function isCurrentAt(master: Validity, at: string): boolean {
  return master.validFrom <= at && (master.validTo === null || at <= master.validTo);
}

export function normalizeMasterName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

type DuplicateExisting = {
  id: string;
  code: string | null;
  name: string;
  taxId: string | null;
};

export function findDuplicateCandidates(
  candidateName: string,
  candidateTaxId: string | null,
  existing: DuplicateExisting[]
): Omit<MasterDuplicate, 'entityType'>[] {
  const normalized = normalizeMasterName(candidateName);
  const matches: Omit<MasterDuplicate, 'entityType'>[] = [];

  for (const item of existing) {
    if (normalizeMasterName(item.name) === normalized) {
      matches.push({
        existingId: item.id,
        existingCode: item.code,
        existingName: item.name,
        reason: 'SAME_NAME',
      });
    } else if (candidateTaxId !== null && item.taxId !== null && candidateTaxId === item.taxId) {
      matches.push({
        existingId: item.id,
        existingCode: item.code,
        existingName: item.name,
        reason: 'SAME_TAX_ID',
      });
    }
  }

  return matches;
}
