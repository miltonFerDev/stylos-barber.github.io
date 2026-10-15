import { describe, expect, it } from 'vitest';
import { isCurrentAt, normalizeMasterName } from '../masters';
import { validatePerson } from '../persons';
import { validateCategory, validateResultLine, validateSubcategory } from '../categories';

describe('isCurrentAt', () => {
  const vigente = { validFrom: '2026-01-01', validTo: null };

  it('esta vigente cuando validTo es null', () => {
    expect(isCurrentAt(vigente, '2026-10-13')).toBe(true);
  });

  it('no esta vigente antes de validFrom', () => {
    expect(isCurrentAt(vigente, '2025-12-31')).toBe(false);
  });

  it('no esta vigente despues de validTo', () => {
    expect(isCurrentAt({ validFrom: '2026-01-01', validTo: '2026-06-30' }, '2026-07-01')).toBe(false);
  });
});

describe('normalizeMasterName', () => {
  it('normaliza mayusculas, espacios y trim', () => {
    expect(normalizeMasterName('  Santander   DENNYS  ')).toBe('santander dennys');
  });
});

describe('validatePerson', () => {
  it('acepta una persona valida', () => {
    const result = validatePerson({ displayName: 'Juan Perez', kind: 'PERSONA' });
    expect(result.ok).toBe(true);
  });

  it('rechaza displayName vacio', () => {
    const result = validatePerson({ displayName: '   ', kind: 'PERSONA' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MISSING_REQUIRED_FIELD');
  });
});

describe('validateCategory', () => {
  it('acepta una categoria valida', () => {
    expect(validateCategory({ code: 'OP', name: 'Operativa', nature: 'OPERATIVA' }).ok).toBe(true);
  });

  it('rechaza code vacio', () => {
    const result = validateCategory({ code: '', name: 'Operativa', nature: 'OPERATIVA' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MISSING_REQUIRED_FIELD');
  });
});

describe('validateSubcategory', () => {
  it('acepta una subcategoria valida', () => {
    expect(validateSubcategory({ code: 'OP-1', name: 'Insumos', categoryId: 'cat-1' }).ok).toBe(true);
  });

  it('rechaza categoryId vacio', () => {
    const result = validateSubcategory({ code: 'OP-1', name: 'Insumos', categoryId: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MISSING_REQUIRED_FIELD');
  });
});

describe('validateResultLine', () => {
  it('acepta una linea de resultado valida', () => {
    expect(validateResultLine({ code: 'RL-1', name: 'Servicios', nature: 'INGRESO', order: 1, ledgerAccountId: '4.1' }).ok).toBe(true);
  });

  it('rechaza order negativo', () => {
    const result = validateResultLine({ code: 'RL-1', name: 'Servicios', nature: 'INGRESO', order: -1, ledgerAccountId: '4.1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_FAILED');
  });
});
