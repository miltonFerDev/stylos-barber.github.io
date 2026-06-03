import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProdeNav } from './ProdeNav';
import { AuthProvider } from '../auth/AuthProvider';
import { ProfileProvider } from '../auth/ProfileProvider';
import { AuthGuard } from '../auth/AuthGuard';
import { ProfileGuard } from '../auth/ProfileGuard';
import { DashboardPage } from '../../pages/DashboardPage';
import { AdminGuard } from '../auth/AdminGuard';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { BugReportButton } from '../feedback/BugReportButton';
import { trackPageView } from '../../utils/analytics';

// Lazy load non-critical pages to reduce initial bundle
const FixturePage = React.lazy(() => import('../../pages/FixturePage').then(m => ({ default: m.FixturePage })));
const PredictionsPage = React.lazy(() => import('../../pages/PredictionsPage').then(m => ({ default: m.PredictionsPage })));
const RankingPage = React.lazy(() => import('../../pages/RankingPage').then(m => ({ default: m.RankingPage })));
const RulesPage = React.lazy(() => import('../../pages/RulesPage').then(m => ({ default: m.RulesPage })));
const AdminPage = React.lazy(() => import('../../pages/AdminPage').then(m => ({ default: m.AdminPage })));
const OnboardingPage = React.lazy(() => import('../../pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const LoginPage = React.lazy(() => import('../../pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = React.lazy(() => import('../../pages/SignupPage').then(m => ({ default: m.SignupPage })));
const ResetPasswordPage = React.lazy(() => import('../../pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const NotFoundPage = React.lazy(() => import('../../pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function usePageViews() {
  const location = useLocation();

  React.useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
}

function PageViews() {
  usePageViews();
  return null;
}

export function ProdeShell() {
  return (
    <BrowserRouter basename="/prode">
      <AuthProvider>
        <ProfileProvider>
          <PageViews />
          <div
          className="min-h-screen font-gothic"
          style={{
            background: 'radial-gradient(circle at top left, rgba(62,82,213,0.22), transparent 32%), radial-gradient(circle at top right, rgba(255,79,154,0.16), transparent 28%), #242331',
          }}
        >
          <ProdeNav />
          <main className="max-w-2xl mx-auto px-4 py-8">
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<ProfileGuard><DashboardPage /></ProfileGuard>} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />
                  <Route path="/fixture" element={<FixturePage />} />
                  <Route path="/predicciones" element={<AuthGuard><ProfileGuard><PredictionsPage /></ProfileGuard></AuthGuard>} />
                  <Route path="/ranking" element={<RankingPage />} />
                  <Route path="/reglas" element={<RulesPage />} />
                  <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
          <BugReportButton />
        </div>
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
