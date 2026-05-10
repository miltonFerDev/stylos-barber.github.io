import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/prode', label: 'Dashboard' },
  { path: '/prode/predicciones', label: 'Predicciones' },
  { path: '/prode/ranking', label: 'Rankings' },
  { path: '/prode/reglas', label: 'Reglas' },
];

export function ProdeNav() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => {
    if (path === '/prode') {
      return location.pathname === '/prode' || location.pathname === '/prode/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 bg-primary/95 backdrop-blur-md border-b border-accentMuted/20">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/prode" className="text-textLight font-bold text-lg tracking-tight">
            ⚽ Prode 2026
          </Link>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-textLight focus:outline-none focus:ring-2 focus:ring-accent rounded-lg"
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

          <ul className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive(item.path)
                      ? 'bg-accent/20 text-accent'
                      : 'text-textMuted hover:text-textLight hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-accentMuted/20 pt-2">
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-3 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isActive(item.path)
                        ? 'bg-accent/20 text-accent'
                        : 'text-textMuted hover:text-textLight hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
