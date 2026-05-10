import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { mockPredictions } from '../../data/mocks';
import { matchService } from '../../services/match.service';

export function PredictionCountCard() {
  const navigate = useNavigate();
  const matches = matchService.getMatches();
  const openMatches = matches.filter(m => m.status === 'upcoming');
  const madePredictions = mockPredictions.length;
  const totalOpen = openMatches.length;
  const pending = totalOpen - madePredictions;

  return (
    <Card className="border-l-4 border-l-accent">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-textLight font-bold text-lg flex items-center gap-2">
            ⚽ Predicciones
          </h3>
          <p className="text-textMuted text-sm mt-1">Fecha 1</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-primary/50 rounded-full h-2 overflow-hidden">
          <div
            className="bg-accent h-full rounded-full transition-all"
            style={{ width: `${totalOpen > 0 ? (madePredictions / totalOpen) * 100 : 0}%` }}
          />
        </div>
        <span className="text-textLight text-sm font-medium whitespace-nowrap">
          {madePredictions}/{totalOpen}
        </span>
      </div>

      {pending > 0 ? (
        <div className="space-y-2">
          <p className="text-amber-400 text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {pending} {pending === 1 ? 'predicción pendiente' : 'predicciones pendientes'}
          </p>
          <Button size="sm" fullWidth onClick={() => navigate('/prode/predicciones')}>
            Completar predicciones →
          </Button>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-emerald-400 text-sm flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            ¡Todas las predicciones hechas!
          </p>
        </div>
      )}
    </Card>
  );
}
