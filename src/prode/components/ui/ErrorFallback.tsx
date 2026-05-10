import React from 'react';

interface Props {
  error?: Error;
  resetErrorBoundary?: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-3xl mb-4">
        💥
      </div>
      <h2 className="text-textLight text-xl font-bold mb-2 text-center">
        Algo salió mal
      </h2>
      <p className="text-textMuted text-sm mb-6 text-center max-w-md">
        Hubo un error inesperado. Probá recargar la página o volver al inicio.
      </p>
      {error && (
        <details className="mb-6 text-textMuted text-xs bg-white/5 rounded-lg p-3 max-w-md w-full">
          <summary className="cursor-pointer font-medium">Ver detalles técnicos</summary>
          <pre className="mt-2 overflow-auto text-red-300 whitespace-pre-wrap">
            {error.message}
          </pre>
        </details>
      )}
      <div className="flex gap-3">
        {resetErrorBoundary && (
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Reintentar
          </button>
        )}
        <a
          href="/prode"
          className="px-4 py-2 bg-white/10 text-textLight rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
