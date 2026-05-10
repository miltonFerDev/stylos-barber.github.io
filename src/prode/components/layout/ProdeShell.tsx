import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProdeNav } from './ProdeNav';
import { AuthGuard } from '../auth/AuthGuard';
import { ProfileGuard } from '../auth/ProfileGuard';
import { DashboardPage } from '../../pages/DashboardPage';
import { FixturePage } from '../../pages/FixturePage';
import { PredictionsPage } from '../../pages/PredictionsPage';
import { RankingPage } from '../../pages/RankingPage';
import { RulesPage } from '../../pages/RulesPage';
import { AdminPage } from '../../pages/AdminPage';
import { OnboardingPage } from '../../pages/OnboardingPage';
import { AdminGuard } from '../auth/AdminGuard';

export function ProdeShell() {
  return (
    <BrowserRouter basename="/prode">
      <div className="min-h-screen bg-primary font-gothic">
        <ProdeNav />
        <main className="max-w-2xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<ProfileGuard><DashboardPage /></ProfileGuard>} />
            <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />
            <Route path="/fixture" element={<FixturePage />} />
            <Route path="/predicciones" element={<AuthGuard><ProfileGuard><PredictionsPage /></ProfileGuard></AuthGuard>} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/reglas" element={<RulesPage />} />
            <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
