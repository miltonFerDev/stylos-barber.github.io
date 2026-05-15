import React from 'react';
import { Link } from 'react-router-dom';

type AuthButtonsVariant = 'nav' | 'full';

interface AuthButtonsProps {
  variant?: AuthButtonsVariant;
}

export function AuthButtons({ variant = 'full' }: AuthButtonsProps) {
  if (variant === 'nav') {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="px-4 py-2 text-sm font-medium text-textMuted hover:text-textLight border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
        >
          Iniciar sesión
        </Link>
        <Link
          to="/signup"
          className="px-4 py-2 text-sm font-medium text-primary bg-accent rounded-lg hover:bg-accentHover transition-colors"
        >
          Registrarse
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <Link
        to="/login"
        className="block w-full py-3 bg-transparent border border-accent text-accent font-medium rounded-lg text-center hover:bg-accent/10 transition-colors"
      >
        Iniciar sesión
      </Link>
      <Link
        to="/signup"
        className="block w-full py-3 bg-accent text-white font-medium rounded-lg text-center hover:bg-accentHover transition-colors"
      >
        Registrarse
      </Link>
    </div>
  );
}