import React from 'react';
import { useProfile } from '../../hooks/useProfile';
import { trackBugReportClick } from '../../utils/analytics';

export function BugReportButton() {
  const { profile } = useProfile();

  const handleClick = () => {
    trackBugReportClick();

    const subject = "Error en Prode Stylo's";
    const alias = profile?.alias ?? 'No identificado';
    const pantalla = window.location.href;
    const fecha = new Date().toLocaleString('es-AR');

    const body = [
      `Hola Stylo's, encontré un error en el Prode.`,
      ``,
      `Pantalla: ${pantalla}`,
      `Fecha/hora: ${fecha}`,
      `Usuario: ${alias}`,
      ``,
      `Descripción del error:`,
      `[Contanos qué pasó]`,
    ].join('\n');

    window.location.href = `mailto:stylos.barber1@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-3 right-3 z-30
                 flex items-center gap-1.5 px-2.5 py-2
                 rounded-xl text-xs font-medium
                 bg-white/5 hover:bg-white/10
                 border border-white/[0.06] hover:border-white/[0.12]
                 text-textMuted hover:text-textLight
                 transition-all duration-200
                 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-1 focus:ring-offset-primary
                 backdrop-blur-sm
                 md:bottom-6 md:right-6 md:px-3 md:py-2"
      aria-label="Reportar error"
      title="Reportar error"
    >
      <svg
        className="w-3.5 h-3.5 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m8 2 1.88 1.88" />
        <path d="M14.12 3.88 16 2" />
        <path d="M9 7.13v-1a3 3 0 0 1 6 0v1" />
        <path d="M18 11a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v3a6 6 0 0 0 12 0v-3Z" />
        <path d="M12 20v-9" />
        <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
        <path d="M6 13H2" />
        <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
        <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
        <path d="M22 13h-4" />
        <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
      </svg>
      <span className="hidden sm:inline">Reportar error</span>
    </button>
  );
}
