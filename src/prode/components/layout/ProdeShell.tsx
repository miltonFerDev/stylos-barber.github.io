import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProdeNav } from './ProdeNav';
import { AuthGuard } from '../auth/AuthGuard';
import { DashboardPage } from '../../pages/DashboardPage';
import { PredictionsPage } from '../../pages/PredictionsPage';
import { RankingPage } from '../../pages/RankingPage';
import { RulesPage } from '../../pages/RulesPage';

export function ProdeShell() {
  return (
    <BrowserRouter basename="/prode">
      <div className="min-h-screen bg-primary font-gothic">
        <ProdeNav />
        <main className="max-w-2xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/predicciones" element={<AuthGuard><PredictionsPage /></AuthGuard>} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/reglas" element={<RulesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
