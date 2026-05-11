import React from 'react';
import { useAuthContext } from './AuthProvider';
import { profileService } from '../../services/profile.service';
import type { Profile } from '../../domain/types/profile';

export interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  hasProfile: boolean;
  createProfile: (data: {
    firstName: string;
    lastName: string;
    birthDate: string;
    whatsapp: string;
    email: string;
  }) => Promise<Profile | null>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = React.createContext<ProfileContextValue>({
  profile: null,
  loading: true,
  hasProfile: false,
  createProfile: async () => null,
  refreshProfile: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadProfile = React.useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const p = await profileService.getProfile(user.id);
      setProfile(p);
    } catch (error) {
      console.error('[ProfileProvider] loadProfile error:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const createProfile = React.useCallback(
    async (data: {
      firstName: string;
      lastName: string;
      birthDate: string;
      whatsapp: string;
      email: string;
    }) => {
      if (!user?.id) return null;

      try {
        const p = await profileService.createProfile(user.id, data);
        setProfile(p);
        return p;
      } catch (error) {
        console.error('[ProfileProvider] createProfile error:', error);
        return null;
      }
    },
    [user?.id]
  );

  const value = React.useMemo(
    () => ({
      profile,
      loading,
      hasProfile: profile !== null,
      createProfile,
      refreshProfile: loadProfile,
    }),
    [profile, loading, createProfile, loadProfile]
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext(): ProfileContextValue {
  return React.useContext(ProfileContext);
}
