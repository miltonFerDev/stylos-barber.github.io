import React from 'react';
import { authService } from '../services/auth.service';

interface AuthState {
  user: any | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
  });

  React.useEffect(() => {
    // Check initial session
    authService.getSession().then((session) => {
      setState({
        user: session?.user ?? null,
        loading: false,
        isAuthenticated: !!session?.user,
      });
    });

    // Listen for auth changes
    const subscription = authService.onAuthStateChange((event, session) => {
      setState({
        user: session?.user ?? null,
        loading: false,
        isAuthenticated: !!session?.user,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = React.useCallback(async () => {
    await authService.signInWithGoogle();
  }, []);

  const logout = React.useCallback(async () => {
    await authService.signOut();
  }, []);

  return {
    ...state,
    login,
    logout,
  };
}
