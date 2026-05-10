import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-accent text-4xl mb-6">
        🔍
      </div>
      <h1 className="text-textLight text-3xl font-bold mb-2 text-center">
        Página no encontrada
      </h1>
      <p className="text-textMuted text-sm mb-8 text-center max-w-md">
        La ruta que estás buscando no existe en el Prode Mundial 2026.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
      >
        Volver al dashboard
      </Link>
    </div>
  );
}
