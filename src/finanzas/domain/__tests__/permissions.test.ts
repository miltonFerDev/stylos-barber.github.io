import { describe, expect, it } from 'vitest';
import { hasPermission } from '../permissions';
import { isDelegationActive, type RoleDelegation } from '../identity';
import type { UserId } from '../types';

const userId = 'user-1' as UserId;

const delegation: RoleDelegation = {
  id: 'del-1',
  roleCode: 'TESORERIA',
  delegateUserId: userId,
  startsAt: '2026-01-01',
  endsAt: '2026-01-31',
  reason: 'Suplencia',
  createdBy: 'dir-1' as UserId,
};

describe('hasPermission', () => {
  it('Direccion aprueba inversion', () => {
    expect(hasPermission(['DIRECCION'], 'APPROVE_INVESTMENT')).toBe(true);
  });

  it('Tesorería no aprueba inversion', () => {
    expect(hasPermission(['TESORERIA'], 'APPROVE_INVESTMENT')).toBe(false);
  });

  it('Tesorería concilia cuentas', () => {
    expect(hasPermission(['TESORERIA'], 'RECONCILE_ACCOUNT')).toBe(true);
  });

  it('sin roles no crea obligacion', () => {
    expect(hasPermission([], 'CREATE_OBLIGATION')).toBe(false);
  });

  it('Admin tecnico gestiona despliegues', () => {
    expect(hasPermission(['ADMIN_TECNICO'], 'MANAGE_DEPLOYMENTS')).toBe(true);
  });

  it('Admin tecnico no ve saldos', () => {
    expect(hasPermission(['ADMIN_TECNICO'], 'VIEW_BALANCES')).toBe(false);
  });

  it('DEV ve y puede todo', () => {
    expect(hasPermission(['DEV'], 'RECONCILE_ACCOUNT')).toBe(true);
    expect(hasPermission(['DEV'], 'APPROVE_INVESTMENT')).toBe(true);
    expect(hasPermission(['DEV'], 'VIEW_BALANCES')).toBe(true);
  });
});

describe('isDelegationActive', () => {
  it('activa dentro de la vigencia', () => {
    expect(isDelegationActive(delegation, '2026-01-15')).toBe(true);
  });

  it('inactiva antes de startsAt', () => {
    expect(isDelegationActive(delegation, '2025-12-31')).toBe(false);
  });

  it('inactiva despues de endsAt', () => {
    expect(isDelegationActive(delegation, '2026-02-01')).toBe(false);
  });
});
