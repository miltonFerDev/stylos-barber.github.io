import { domainError } from './errors';
import type { MasterBase, PersonKind } from './masters';
import type { Result } from './types';

export type Person = MasterBase & {
  entityType: 'PERSON';
  displayName: string;
  kind: PersonKind;
  taxId: string | null;
};

export function validatePerson(input: {
  displayName: string;
  kind: PersonKind;
}): Result<{ displayName: string; kind: PersonKind }> {
  if (input.displayName.trim().length === 0) {
    return {
      ok: false,
      error: domainError('MISSING_REQUIRED_FIELD', 'El nombre de la persona es obligatorio.', true, {
        field: 'displayName',
      }),
    };
  }

  if (input.kind !== 'PERSONA' && input.kind !== 'EMPRESA') {
    return {
      ok: false,
      error: domainError('VALIDATION_FAILED', 'El tipo de persona debe ser PERSONA o EMPRESA.', true, {
        field: 'kind',
      }),
    };
  }

  return { ok: true, value: { displayName: input.displayName.trim(), kind: input.kind } };
}
