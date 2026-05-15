import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { AuthButtons } from '../auth/AuthButtons';
import { UserProfile } from '../auth/UserProfile';
import { competition } from '../../config/competition';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/fixture', label: 'Fixture' },
  { path: '/predicciones', label: 'Predicciones' },
  { path: '/ranking', label: 'Rankings' },
  { path: '/reglas', label: 'Reglas' },
];

export function ProdeNav() {
  const location = useLocation();
  const { user, isAuthenticated, login, logout, loading } = useAuth();
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
              <svg className="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C9.5 2 7.5 4 7 6H5C3.9 6 3 6.9 3 8V10C3 11.1 3.9 12 5 12H5.2C5.6 14.3 7.2 16.2 9.4 17H8C6.3 17 5 18.3 5 20V21C5 21.6 5.4 22 6 22H18C18.6 22 19 21.6 19 21V20C19 18.3 17.7 17 16 17H14.6C16.8 16.2 18.4 14.3 18.8 12H19C20.1 12 21 11.1 21 10V8C21 6.9 20.1 6 19 6H17C16.5 4 14.5 2 12 2ZM7 8C7 6.9 7.9 6 9 6H9.4C9.7 6.8 10.3 7.5 11 7.8V9H7V8ZM13 7.8C13.7 7.5 14.3 6.8 14.6 6H15C16.1 6 17 6.9 17 8V9H13V7.8ZM5 10H19V12H5V10Z"/>
              </svg>
              <span>{competition.shortName}</span>
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
            <svg className="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C9.5 2 7.5 4 7 6H5C3.9 6 3 6.9 3 8V10C3 11.1 3.9 12 5 12H5.2C5.6 14.3 7.2 16.2 9.4 17H8C6.3 17 5 18.3 5 20V21C5 21.6 5.4 22 6 22H18C18.6 22 19 21.6 19 21V20C19 18.3 17.7 17 16 17H14.6C16.8 16.2 18.4 14.3 18.8 12H19C20.1 12 21 11.1 21 10V8C21 6.9 20.1 6 19 6H17C16.5 4 14.5 2 12 2ZM7 8C7 6.9 7.9 6 9 6H9.4C9.7 6.8 10.3 7.5 11 7.8V9H7V8ZM13 7.8C13.7 7.5 14.3 6.8 14.6 6H15C16.1 6 17 6.9 17 8V9H13V7.8ZM5 10H19V12H5V10Z"/>
            </svg>
            <span>{competition.shortName}</span>
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
