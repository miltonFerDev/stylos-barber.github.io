import React from 'react';
import { supabase } from '../../config/supabase';
import { authService } from '../../services/auth.service';

export interface AuthContextValue {
  user: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  loginError: string | null;
  signupError: string | null;
  signupSuccess: boolean;
  resetPasswordSent: boolean;
  resetPasswordError: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  dismissSessionExpired: () => void;
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAuthenticated: false,
  sessionExpired: false,
  loginError: null,
  signupError: null,
  signupSuccess: false,
  resetPasswordSent: false,
  resetPasswordError: null,
  login: async () => {},
  loginWithGoogle: async () => {},
  signup: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  logout: async () => {},
  dismissSessionExpired: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = React.useState(false);
  const [signupError, setSignupError] = React.useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = React.useState(false);
  const [resetPasswordSent, setResetPasswordSent] = React.useState(false);
  const [resetPasswordError, setResetPasswordError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;

      if (event === 'SIGNED_OUT') {
        setSessionExpired(true);
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    setLoginError(null);
    try {
      await authService.signIn(email, password);
    } catch (error: any) {
      const message = error.message?.includes('Invalid login')
        ? 'Email o contraseña incorrectos'
        : 'Error al iniciar sesión. Intentá de nuevo.';
      setLoginError(message);
      throw error;
    }
  }, []);

  const loginWithGoogle = React.useCallback(async () => {
    setLoginError(null);
    try {
      await authService.signInWithGoogle();
    } catch (error: any) {
      setLoginError('Error al iniciar sesión con Google');
      console.error('[AuthProvider] loginWithGoogle error:', error);
    }
  }, []);

  const signup = React.useCallback(async (email: string, password: string) => {
    setSignupError(null);
    setSignupSuccess(false);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user?.identities?.length === 0) {
        setSignupError('Este email ya está registrado');
        throw new Error('Email already registered');
      }

      setSignupSuccess(true);
    } catch (error: any) {
      if (!error.message?.includes('already registered')) {
        setSignupError('Error al registrarse. Intentá de nuevo.');
      }
      throw error;
    }
  }, []);

  const resetPassword = React.useCallback(async (email: string) => {
    setResetPasswordError(null);
    setResetPasswordSent(false);
    try {
      await authService.resetPassword(email);
      setResetPasswordSent(true);
    } catch (error: any) {
      setResetPasswordError('Error al enviar el email de recuperación');
      throw error;
    }
  }, []);

  const updatePassword = React.useCallback(async (newPassword: string) => {
    try {
      await authService.updatePassword(newPassword);
    } catch (error: any) {
      throw error;
    }
  }, []);

  const logout = React.useCallback(async () => {
    await authService.signOut();
  }, []);

  const dismissSessionExpired = React.useCallback(() => {
    setSessionExpired(false);
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      sessionExpired,
      loginError,
      signupError,
      signupSuccess,
      resetPasswordSent,
      resetPasswordError,
      login,
      loginWithGoogle,
      signup,
      resetPassword,
      updatePassword,
      logout,
      dismissSessionExpired,
    }),
    [user, loading, sessionExpired, loginError, signupError, signupSuccess, resetPasswordSent, resetPasswordError, login, loginWithGoogle, signup, resetPassword, updatePassword, logout, dismissSessionExpired]
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