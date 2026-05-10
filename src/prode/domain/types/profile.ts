export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string; // ISO date string
  alias: string;
  whatsapp: string;
  email: string;
  acceptedRules: boolean;
  acceptedRulesAt: string | null;
  role: UserRole;
  createdAt: string;
}

export interface ProfilePublic {
  alias: string;
  points: number;
  position: number;
}
