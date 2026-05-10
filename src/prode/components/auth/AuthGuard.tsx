import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoginButton } from '../auth/LoginButton';
import { Card } from '../ui/Card';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Card className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-3xl mx-auto mb-4">
            🔒
          </div>
          <h2 className="text-textLight text-xl font-bold mb-2">
            Iniciá sesión para participar
          </h2>
          <p className="text-textMuted text-sm mb-6">
            Usá tu cuenta de Google para entrar al prode, hacer tus predicciones y competir por premios.
          </p>
          <LoginButton onLogin={login} />
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
