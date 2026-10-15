import type { RoleCode, UserId } from './types';

export type User = {
  id: UserId;
  email: string;
  isActive: boolean;
};

export type Role = {
  id: string;
  code: RoleCode;
  name: string;
};

export type UserRole = {
  userId: UserId;
  roleId: string;
  grantedAt: string;
  grantedBy: UserId;
};

export type RoleDelegation = {
  id: string;
  roleCode: RoleCode;
  delegateUserId: UserId;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdBy: UserId;
};

export function isDelegationActive(delegation: RoleDelegation, at: string): boolean {
  return delegation.startsAt <= at && at <= delegation.endsAt;
}
