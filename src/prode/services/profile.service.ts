import type { Profile } from '../domain/types/profile';

const STORAGE_KEY = 'prode_profile';

function generateAlias(firstName: string, lastName: string, birthDate: string): string {
  const initials = (firstName[0] + lastName[0]).toUpperCase();
  const date = new Date(birthDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${initials}${day}${month}`;
}

export const profileService = {
  getProfile(): Profile | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Profile;
    } catch {
      return null;
    }
  },

  createProfile(data: {
    firstName: string;
    lastName: string;
    birthDate: string;
    whatsapp: string;
    email: string;
  }): Profile {
    const alias = generateAlias(data.firstName, data.lastName, data.birthDate);
    const profile: Profile = {
      id: `local-${Date.now()}`,
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate,
      alias,
      whatsapp: data.whatsapp,
      email: data.email,
      acceptedRules: true,
      acceptedRulesAt: new Date().toISOString(),
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return profile;
  },

  hasProfile(): boolean {
    return this.getProfile() !== null;
  },

  clearProfile() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
