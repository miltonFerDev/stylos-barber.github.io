import React from 'react';
import { supabase } from '../../config/supabase';
import { authService } from '../../services/auth.service';

export interface AuthContextValue {
  user: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  loginError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAuthenticated: false,
  loginError: null,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Supabase fires INITIAL_SESSION immediately with the current session.
    // No need for a separate getSession() call.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;

      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const login = React.useCallback(async () => {
    setLoginError(null);
    try {
      await authService.signInWithGoogle();
    } catch (error: any) {
      setLoginError('Error al iniciar sesión. Intentá de nuevo.');
      console.error('[AuthProvider] login error:', error);
    }
  }, []);

  const logout = React.useCallback(async () => {
    await authService.signOut();
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      loginError,
      login,
      logout,
    }),
    [user, loading, loginError, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  return React.useContext(AuthContext);
}
