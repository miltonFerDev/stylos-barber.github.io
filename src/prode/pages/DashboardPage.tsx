import React from 'react';
import { ProfileCard } from '../components/dashboard/ProfileCard';
import { PredictionCountCard } from '../components/dashboard/PredictionCountCard';
import { RankingPreviewCard } from '../components/dashboard/RankingPreviewCard';
import { RulesPreviewCard } from '../components/dashboard/RulesPreviewCard';
import { FreshaCTA } from '../components/dashboard/FreshaCTA';

export function DashboardPage() {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h1 className="text-textLight text-2xl font-bold">Prode Mundial 2026</h1>
        <p className="text-textMuted text-sm mt-1">Stylo's Barber · Participá y ganá</p>
      </div>

      <ProfileCard />
      <PredictionCountCard />
      <RankingPreviewCard type="weekly" />
      <RankingPreviewCard type="general" />
      <RulesPreviewCard />
      <FreshaCTA />
    </div>
  );
}
