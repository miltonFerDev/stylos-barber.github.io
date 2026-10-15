import { domainError } from './errors';
import type { AccountKind, AccountOwnership, MasterBase } from './masters';
import type { Currency, Result } from './types';

export type Account = MasterBase & {
  entityType: 'ACCOUNT';
  name: string;
  kind: AccountKind;
  ownership: AccountOwnership;
  financialInstitution: string | null;
  currency: Currency;
  ledgerAccountId: string;
  isAvailable: boolean;
  isReconcilable: boolean;
};

const ACCOUNT_KINDS: AccountKind[] = ['EFECTIVO', 'BANCO', 'BILLETERA', 'TRANSITORIA'];
const ACCOUNT_OWNERSHIPS: AccountOwnership[] = ['PROPIA', 'EXTERNA', 'RESTRINGIDA'];
const CURRENCIES: Currency[] = ['ARS', 'USD'];

export type AccountInput = {
  name: string;
  kind: AccountKind;
  ownership: AccountOwnership;
  currency: Currency;
  ledgerAccountId: string;
  isAvailable: boolean;
};

export function validateAccount(input: AccountInput): Result<AccountInput> {
  if (input.name.trim().length === 0) {
    return {
      ok: false,
      error: domainError('MISSING_REQUIRED_FIELD', 'El nombre de la cuenta financiera es obligatorio.', true, {
        field: 'name',
      }),
    };
  }

  if (input.ledgerAccountId.trim().length === 0) {
    return {
      ok: false,
      error: domainError('MISSING_REQUIRED_FIELD', 'La cuenta contable de la cuenta financiera es obligatoria.', true, {
        field: 'ledgerAccountId',
      }),
    };
  }

  if (!CURRENCIES.includes(input.currency)) {
    return {
      ok: false,
      error: domainError('VALIDATION_FAILED', 'La moneda debe ser ARS o USD.', true, {
        currency: input.currency,
      }),
    };
  }

  if (!ACCOUNT_KINDS.includes(input.kind)) {
    return {
      ok: false,
      error: domainError('VALIDATION_FAILED', 'El tipo de cuenta financiera no es valido.', true, {
        kind: input.kind,
      }),
    };
  }

  if (!ACCOUNT_OWNERSHIPS.includes(input.ownership)) {
    return {
      ok: false,
      error: domainError('VALIDATION_FAILED', 'La propiedad de la cuenta financiera no es valida.', true, {
        ownership: input.ownership,
      }),
    };
  }

  if (input.ownership === 'EXTERNA' && input.isAvailable) {
    return {
      ok: false,
      error: domainError('VALIDATION_FAILED', 'Una cuenta externa no puede estar disponible como caja propia.', true, {
        ownership: input.ownership,
      }),
    };
  }

  return {
    ok: true,
    value: {
      name: input.name.trim(),
      kind: input.kind,
      ownership: input.ownership,
      currency: input.currency,
      ledgerAccountId: input.ledgerAccountId,
      isAvailable: input.isAvailable,
    },
  };
}
