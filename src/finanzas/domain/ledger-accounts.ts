import { domainError } from './errors';
import type { LedgerAccountNature, MasterBase } from './masters';
import type { Result } from './types';

export type LedgerAccount = MasterBase & {
  entityType: 'LEDGER_ACCOUNT';
  code: string;
  name: string;
  nature: LedgerAccountNature;
  parentId: string | null;
  isPostable: boolean;
};

const LEDGER_ACCOUNT_NATURES: LedgerAccountNature[] = [
  'ACTIVO',
  'PASIVO',
  'PATRIMONIO',
  'INGRESO',
  'GASTO',
  'PUENTE',
];

export function validateLedgerAccount(input: {
  code: string;
  name: string;
  nature: LedgerAccountNature;
  isPostable: boolean;
}): Result<{ code: string; name: string; nature: LedgerAccountNature; isPostable: boolean }> {
  if (input.code.trim().length === 0 || input.name.trim().length === 0) {
    return {
      ok: false,
      error: domainError('MISSING_REQUIRED_FIELD', 'El codigo y el nombre de la cuenta contable son obligatorios.', true, {
        fields: ['code', 'name'],
      }),
    };
  }

  if (!LEDGER_ACCOUNT_NATURES.includes(input.nature)) {
    return {
      ok: false,
      error: domainError('VALIDATION_FAILED', 'La naturaleza de la cuenta contable no es valida.', true, {
        nature: input.nature,
      }),
    };
  }

  return {
    ok: true,
    value: { code: input.code.trim(), name: input.name.trim(), nature: input.nature, isPostable: input.isPostable },
  };
}
