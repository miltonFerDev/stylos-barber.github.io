import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginButton } from '../components/auth/LoginButton';
import { Card } from '../components/ui/Card';
import { ProfileCard } from '../components/dashboard/ProfileCard';
import { PredictionCountCard } from '../components/dashboard/PredictionCountCard';
import { RankingPreviewCard } from '../components/dashboard/RankingPreviewCard';
import { RulesPreviewCard } from '../components/dashboard/RulesPreviewCard';
import { FreshaCTA } from '../components/dashboard/FreshaCTA';

export function DashboardPage() {
  const { isAuthenticated, login, loading } = useAuth();

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h1 className="text-textLight text-2xl font-bold">Prode Mundial 2026</h1>
        <p className="text-textMuted text-sm mt-1">Stylo's Barber · Participá y ganá</p>
      </div>

      {!loading && !isAuthenticated && (
        <Card className="border-accent/30">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl mb-3">
              👋
            </div>
            <h3 className="text-textLight font-bold mb-1">¿Todavía no entraste?</h3>
            <p className="text-textMuted text-sm mb-4">
              Iniciá sesión con Google para hacer tus predicciones y competir por premios.
            </p>
            <LoginButton onLogin={login} />
          </div>
        </Card>
      )}

      {isAuthenticated && <ProfileCard />}
      {isAuthenticated && <PredictionCountCard />}
      <RankingPreviewCard type="weekly" />
      <RankingPreviewCard type="general" />
      <RulesPreviewCard />
      <FreshaCTA />
    </div>
  );
}
