import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { AuthButtons } from '../auth/AuthButtons';
import { UserProfile } from '../auth/UserProfile';
import { worldCup2026 } from '../../config/competition';
import copa from '../../../assets/copa.jpg';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/fixture', label: 'Fixture' },
  { path: '/predicciones', label: 'Predicciones' },
  { path: '/ranking', label: 'Rankings' },
  { path: '/reglas', label: 'Reglas' },
];

export function ProdeNav() {
  const location = useLocation();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const { profile } = useProfile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const isAdmin = profile?.role === 'admin';

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/prode' || location.pathname === '/prode/';
    }
    return location.pathname.startsWith(path);
  };

  const allNavItems = isAdmin ? [...navItems, { path: '/admin', label: 'Admin' }] : navItems;

  return (
    <nav className="sticky top-0 z-50 bg-primary/80 backdrop-blur-xl border-b border-white/[0.06]">
      {/* Desktop header */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <Link to="/" className="flex items-center gap-2.5 text-textLight font-bold text-lg tracking-tight shrink-0">
              <img src={copa.src} alt="Copa" className="w-[34px] h-[34px] rounded object-contain" />
              <span>{worldCup2026.shortName}</span>
            </Link>

            {/* Center: Navigation links */}
            <ul className="flex items-center gap-1">
              {allNavItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-1 focus:ring-offset-primary whitespace-nowrap ${
                      isActive(item.path)
                        ? 'bg-white/10 text-textLight shadow-sm'
                        : 'text-textMuted hover:text-textLight hover:bg-white/[0.04]'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Right: Auth */}
            <div className="shrink-0">
              {!loading && isAuthenticated && (
                <UserProfile user={user} onLogout={logout} />
              )}
              {!loading && !isAuthenticated && (
                <AuthButtons variant="nav" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2 text-textLight font-bold text-lg tracking-tight">
            <img src={copa.src} alt="Copa" className="w-[34px] h-[34px] rounded object-contain" />
            <span>{worldCup2026.shortName}</span>
          </Link>

          <div className="flex items-center gap-2">
            {!loading && isAuthenticated && (
              <button
                onClick={logout}
                className="text-textMuted hover:text-textLight text-sm font-medium transition-colors"
              >
                Salir
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-textLight focus:outline-none focus:ring-2 focus:ring-accent rounded-lg"
              aria-label="Abrir menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="pb-4 border-t border-accentMuted/20 pt-2 px-4">
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                    className={`block px-3 py-3 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary ${
                      isActive(item.path)
                        ? 'bg-accent/20 text-accent'
                        : 'text-textMuted hover:text-textLight hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {isAdmin && (
                <li>
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isActive('/admin') ? 'page' : undefined}
                    className={`block px-3 py-3 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary ${
                      isActive('/admin')
                        ? 'bg-accent/20 text-accent'
                        : 'text-textMuted hover:text-textLight hover:bg-white/5'
                    }`}
                  >
                    Admin
                  </Link>
                </li>
              )}
            </ul>
            {!loading && !isAuthenticated && (
              <div className="mt-3">
                <AuthButtons />
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
