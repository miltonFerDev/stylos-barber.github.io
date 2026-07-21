import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProdeNav } from './ProdeNav';
import { FinalDashboardPage } from '../../pages/FinalDashboardPage';
import { ErrorBoundary } from './ErrorBoundary';
import { BallLoader } from '../ui/BallLoader';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <BallLoader size="lg" />
    </div>
  );
}

export function ProdeShell() {
  return (
    <BrowserRouter basename="/prode">
      <div
        className="min-h-screen font-gothic"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(62,82,213,0.22), transparent 32%), radial-gradient(circle at top right, rgba(255,79,154,0.16), transparent 28%), #242331',
        }}
      >
        <ProdeNav />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<FinalDashboardPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}