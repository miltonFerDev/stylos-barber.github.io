import { supabase } from '../config/supabase';
import type { Profile, UserRole } from '../domain/types/profile';

interface ProfileRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  public_alias: string;
  whatsapp: string;
  birth_date: string;
  is_admin: boolean;
  accepted_rules_at: string | null;
  created_at: string;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    alias: row.public_alias,
    whatsapp: row.whatsapp,
    email: row.email,
    acceptedRules: row.accepted_rules_at !== null,
    acceptedRulesAt: row.accepted_rules_at,
    role: (row.is_admin ? 'admin' : 'user') as UserRole,
    createdAt: row.created_at,
  };
}

function generateAlias(firstName: string, lastName: string, birthDate: string): string {
  const initials = (firstName[0] + lastName[0]).toUpperCase();
  const date = new Date(birthDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${initials}${day}${month}`;
}

export const profilesRepository = {
  async getById(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[profilesRepository] getById error:', error.message);
      return null;
    }

    if (!data) return null;
    return rowToProfile(data as ProfileRow);
  },

  async create(userId: string, data: {
    firstName: string;
    lastName: string;
    birthDate: string;
    whatsapp: string;
    email: string;
  }): Promise<Profile> {
    const alias = generateAlias(data.firstName, data.lastName, data.birthDate);
    const now = new Date().toISOString();

    const { data: row, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        public_alias: alias,
        whatsapp: data.whatsapp,
        birth_date: data.birthDate,
        is_admin: false,
        accepted_rules_at: now,
      }, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[profilesRepository] create error:', error.message);
      throw new Error(`Error creating profile: ${error.message}`);
    }

    return {
      id: userId,
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate,
      alias,
      whatsapp: data.whatsapp,
      email: data.email,
      acceptedRules: true,
      acceptedRulesAt: now,
      role: 'user',
      createdAt: now,
    };
  },

  async update(userId: string, data: Partial<{
    firstName: string;
    lastName: string;
    whatsapp: string;
  }>): Promise<Profile | null> {
    const updateData: Record<string, unknown> = {};
    if (data.firstName !== undefined) {
      updateData.first_name = data.firstName;
    }
    if (data.lastName !== undefined) {
      updateData.last_name = data.lastName;
    }
    if (data.whatsapp !== undefined) {
      updateData.whatsapp = data.whatsapp;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('[profilesRepository] update error:', error.message);
      return null;
    }

    return this.getById(userId);
  },

  async setAdmin(userId: string, isAdmin: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    if (error) {
      console.error('[profilesRepository] setAdmin error:', error.message);
      return false;
    }
    return true;
  },
};