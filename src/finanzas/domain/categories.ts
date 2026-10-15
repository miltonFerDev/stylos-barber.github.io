import { domainError } from './errors';
import type { CategoryNature, MasterBase, ResultLineNature } from './masters';
import type { Result } from './types';

export type Category = MasterBase & {
  entityType: 'CATEGORY';
  code: string;
  name: string;
  nature: CategoryNature;
};

export type Subcategory = MasterBase & {
  entityType: 'SUBCATEGORY';
  code: string;
  name: string;
  categoryId: string;
};

export type ResultLine = MasterBase & {
  entityType: 'RESULT_LINE';
  code: string;
  name: string;
  nature: ResultLineNature;
  order: number;
  ledgerAccountId: string;
};

const CATEGORY_NATURES: CategoryNature[] = ['OPERATIVA', 'EXTRAORDINARIA', 'FINANCIERA'];
const RESULT_LINE_NATURES: ResultLineNature[] = ['INGRESO', 'COSTO', 'GASTO', 'NO_RESULTADO'];

export function validateCategory(input: {
  code: string;
  name: string;
  nature: CategoryNature;
}): Result<{ code: string; name: string; nature: CategoryNature }> {
  if (input.code.trim().length === 0 || input.name.trim().length === 0) {
    return {
      ok: false,
      error: domainError('MISSING_REQUIRED_FIELD', 'El codigo y el nombre de la categoria son obligatorios.', true, {
        fields: ['code', 'name'],
      }),
    };
  }

  if (!CATEGORY_NATURES.includes(input.nature)) {
    return {
      ok: false,
      error: domainError('VALIDATION_FAILED', 'La naturaleza de la categoria no es valida.', true, {
        nature: input.nature,
      }),
    };
  }

  return { ok: true, value: { code: input.code.trim(), name: input.name.trim(), nature: input.nature } };
}

export function validateSubcategory(input: {
  code: string;
  name: string;
  categoryId: string;
}): Result<{ code: string; name: string; categoryId: string }> {
  if (input.code.trim().length === 0 || input.name.trim().length === 0 || input.categoryId.trim().length === 0) {
    return {
      ok: false,
      error: domainError('MISSING_REQUIRED_FIELD', 'El codigo, el nombre y la categoria son obligatorios.', true, {
        fields: ['code', 'name', 'categoryId'],
      }),
    };
  }

  return { ok: true, value: { code: input.code.trim(), name: input.name.trim(), categoryId: input.categoryId.trim() } };
}

export function validateResultLine(input: {
  code: string;
  name: string;
  nature: ResultLineNature;
  order: number;
  ledgerAccountId: string;
}): Result<{ code: string; name: string; nature: ResultLineNature; order: number; ledgerAccountId: string }> {
  if (input.code.trim().length === 0 || input.name.trim().length === 0 || input.ledgerAccountId.trim().length === 0) {
    return {
      ok: false,
      error: domainError('MISSING_REQUIRED_FIELD', 'El codigo, el nombre y la cuenta contable de la linea de resultado son obligatorios.', true, {
        fields: ['code', 'name', 'ledgerAccountId'],
      }),
    };
  }

  if (!RESULT_LINE_NATURES.includes(input.nature)) {
    return {
      ok: false,
      error: domainError('VALIDATION_FAILED', 'La naturaleza de la linea de resultado no es valida.', true, {
        nature: input.nature,
      }),
    };
  }

  if (!Number.isInteger(input.order) || input.order < 0) {
    return {
      ok: false,
      error: domainError('VALIDATION_FAILED', 'El orden debe ser un entero mayor o igual a cero.', true, {
        order: input.order,
      }),
    };
  }

  return {
    ok: true,
    value: { code: input.code.trim(), name: input.name.trim(), nature: input.nature, order: input.order, ledgerAccountId: input.ledgerAccountId.trim() },
  };
}
