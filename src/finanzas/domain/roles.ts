import type { RoleCode } from './types';

export const FINANCE_ROLE_CODES = ['DIRECCION', 'TESORERIA', 'CONTADOR', 'ADMIN_TECNICO', 'DEV'] as const satisfies readonly RoleCode[];
export const INITIAL_OPERATIVE_ROLE_CODES = ['DIRECCION', 'TESORERIA'] as const satisfies readonly RoleCode[];

export function isFinanceRoleCode(value: string): value is RoleCode {
  return FINANCE_ROLE_CODES.includes(value as RoleCode);
}
