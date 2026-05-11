import { useProfileContext } from '../components/auth/ProfileProvider';

export function useProfile(_userId?: string | null) {
  return useProfileContext();
}
