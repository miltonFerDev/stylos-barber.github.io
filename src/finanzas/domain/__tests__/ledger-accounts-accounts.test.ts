import { describe, expect, it } from 'vitest';
import { validateLedgerAccount } from '../ledger-accounts';
import { validateAccount } from '../accounts';

describe('validateLedgerAccount', () => {
  it('acepta una cuenta contable postable hoja', () => {
    expect(validateLedgerAccount({ code: '1.1.1', name: 'Efectivo', nature: 'ACTIVO', isPostable: true }).ok).toBe(true);
  });

  it('acepta una cuenta contable de agrupacion no postable', () => {
    expect(validateLedgerAccount({ code: '1.1', name: 'Disponibilidades', nature: 'ACTIVO', isPostable: false }).ok).toBe(true);
  });

  it('acepta una cuenta contable de naturaleza PUENTE', () => {
    expect(validateLedgerAccount({ code: '6.1', name: 'Puente de traslados', nature: 'PUENTE', isPostable: true }).ok).toBe(true);
  });

  it('rechaza code vacio', () => {
    const result = validateLedgerAccount({ code: '', name: 'Efectivo', nature: 'ACTIVO', isPostable: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MISSING_REQUIRED_FIELD');
  });
});

describe('validateAccount', () => {
  it('acepta una cuenta propia disponible', () => {
    expect(
      validateAccount({
        name: 'Efectivo',
        kind: 'EFECTIVO',
        ownership: 'PROPIA',
        currency: 'ARS',
        ledgerAccountId: '1.1.1',
        isAvailable: true,
      }).ok
    ).toBe(true);
  });

  it('rechaza una cuenta EXTERNA disponible', () => {
    const result = validateAccount({
      name: 'Mercado Pago MARI',
      kind: 'BILLETERA',
      ownership: 'EXTERNA',
      currency: 'ARS',
      ledgerAccountId: '6.3',
      isAvailable: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_FAILED');
  });

  it('rechaza una moneda invalida', () => {
    const result = validateAccount({
      name: 'Efectivo',
      kind: 'EFECTIVO',
      ownership: 'PROPIA',
      currency: 'EUR' as never,
      ledgerAccountId: '1.1.1',
      isAvailable: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_FAILED');
  });
});
