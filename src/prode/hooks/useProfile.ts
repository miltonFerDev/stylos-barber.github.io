import React from 'react';
import { profileService } from '../services/profile.service';
import type { Profile } from '../domain/types/profile';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  hasProfile: boolean;
}

export function useProfile() {
  const [state, setState] = React.useState<ProfileState>({
    profile: null,
    loading: true,
    hasProfile: false,
  });

  React.useEffect(() => {
    const profile = profileService.getProfile();
    setState({
      profile,
      loading: false,
      hasProfile: profile !== null,
    });
  }, []);

  const createProfile = React.useCallback(
    (data: {
      firstName: string;
      lastName: string;
      birthDate: string;
      whatsapp: string;
      email: string;
    }) => {
      const profile = profileService.createProfile(data);
      setState({ profile, loading: false, hasProfile: true });
      return profile;
    },
    []
  );

  const refreshProfile = React.useCallback(() => {
    const profile = profileService.getProfile();
    setState({ profile, loading: false, hasProfile: profile !== null });
  }, []);

  return {
    ...state,
    createProfile,
    refreshProfile,
  };
}
