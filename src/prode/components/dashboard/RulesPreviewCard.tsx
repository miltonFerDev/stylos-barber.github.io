import React from 'react';
import { Card } from '../ui/Card';
import { useNavigate } from 'react-router-dom';

export function RulesPreviewCard() {
  const navigate = useNavigate();

  return (
    <Card onClick={() => navigate('/reglas')} className="cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-textLight font-bold text-lg flex items-center gap-2">
            📜 Reglas y Premios
          </h3>
        </div>
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-accent mt-0.5">•</span>
          <p className="text-textMuted">Resultado exacto: <span className="text-textLight font-medium">3 puntos</span></p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-accent mt-0.5">•</span>
          <p className="text-textMuted">Ganador correcto: <span className="text-textLight font-medium">1 punto</span></p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-accent mt-0.5">•</span>
          <p className="text-textMuted">Predicciones editables hasta el inicio</p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
        <p className="text-amber-400 text-sm font-medium">🏆 Premio final</p>
        <p className="text-textLight text-lg font-bold">Gift card $100.000</p>
      </div>

      <div className="mt-3 text-center">
        <span className="text-accent text-sm font-medium hover:underline">
          Ver reglas completas →
        </span>
      </div>
    </Card>
  );
}
