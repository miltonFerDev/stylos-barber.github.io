import { profilesRepository } from '../repositories/profiles.repository';
import type { Profile } from '../domain/types/profile';

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    return profilesRepository.getById(userId);
  },

  async createProfile(userId: string, data: {
    firstName: string;
    lastName: string;
    birthDate: string;
    whatsapp: string;
    email: string;
  }): Promise<Profile> {
    return profilesRepository.create(userId, data);
  },

  async hasProfile(userId: string): Promise<boolean> {
    const profile = await profilesRepository.getById(userId);
    return profile !== null;
  },
};