import React from 'react';
import { worldCup2026 } from '../../config/competition';
import copa from '../../../assets/copa.jpg';

export function ProdeNav() {
  return (
    <nav className="sticky top-0 z-50 bg-primary/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 md:h-16">
          <a
            href="/prode"
            className="flex items-center gap-2 sm:gap-2.5 text-textLight font-bold text-lg tracking-tight shrink-0"
          >
            <img src={copa.src} alt="Copa" className="w-[34px] h-[34px] rounded object-contain" />
            <span>{worldCup2026.shortName}</span>
          </a>

          <a
            href="/"
            className="flex items-center gap-1.5 text-textMuted hover:text-textLight text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span className="hidden sm:inline">Volver a Stylo&rsquo;s Barber</span>
            <span className="sm:hidden">Volver</span>
          </a>
        </div>
      </div>
    </nav>
  );
}