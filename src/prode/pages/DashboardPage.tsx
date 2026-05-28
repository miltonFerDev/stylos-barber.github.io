import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthButtons } from '../components/auth/AuthButtons';
import { Card } from '../components/ui/Card';
import { ProfileCard } from '../components/dashboard/ProfileCard';
import { PredictionCountCard } from '../components/dashboard/PredictionCountCard';
import { RankingPreviewCard } from '../components/dashboard/RankingPreviewCard';
import { RulesPreviewCard } from '../components/dashboard/RulesPreviewCard';
import { FreshaCTA } from '../components/dashboard/FreshaCTA';
import { worldCup2026 } from '../config/competition';

export function DashboardPage() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="space-y-5">
      <h1 className="text-textLight text-2xl font-bold tracking-tight">{worldCup2026.name}</h1>

      {!loading && !isAuthenticated && (
        <Card className="border-white/10">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xl mb-3">
              👋
            </div>
            <h3 className="text-textLight font-semibold mb-1">¿Todavía no entraste?</h3>
            <p className="text-textMuted text-sm mb-4">
              Iniciá sesión con email y contraseña para predecir y ganar premios.
            </p>
            <AuthButtons />
          </div>
        </Card>
      )}

      {isAuthenticated && <ProfileCard />}
      {isAuthenticated && <PredictionCountCard />}
      <RankingPreviewCard type="phase" />
      <RankingPreviewCard type="general" />
      <RulesPreviewCard />
      <FreshaCTA />
    </div>
  );
}
