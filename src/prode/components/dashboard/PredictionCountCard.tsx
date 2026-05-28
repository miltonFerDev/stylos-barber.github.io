import React from 'react';
import { Card } from '../ui/Card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePredictions } from '../../hooks/usePredictions';
import { matchService } from '../../services/match.service';
import { worldCup2026 } from '../../config/competition';

export function PredictionCountCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { predictions } = usePredictions(user?.id ?? null);
  const [totalOpen, setTotalOpen] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    matchService.getMatches(worldCup2026.id).then((matches) => {
      const openMatches = matches.filter(m => m.status === 'upcoming');
      setTotalOpen(openMatches.length);
      setLoading(false);
    });
  }, []);

  const madePredictions = predictions.length;
  const pending = Math.max(0, totalOpen - madePredictions);
  const progressPercent = totalOpen > 0 ? (Math.min(madePredictions, totalOpen) / totalOpen) * 100 : 0;
  const isComplete = pending === 0 && totalOpen > 0;

  if (loading) return null;

  return (
    <Card borderTopColor="cupYellow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-cupYellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h3 className="text-textLight font-semibold text-sm">Mis predicciones</h3>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cupYellow/15 text-cupYellow'}`}>
          {isComplete ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-textMuted text-xs">Progreso</span>
          <span className={`text-xs font-medium ${isComplete ? 'text-emerald-400' : 'text-textLight'}`}>
            {madePredictions}/{totalOpen}
          </span>
        </div>
        <div className="bg-primary/40 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-cupYellow'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {pending > 0 ? (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-amber-400 text-xs">
              Tenés <span className="font-semibold">{pending}</span> {pending === 1 ? 'partido sin predecir' : 'partidos sin predecir'}
            </p>
          </div>
          <button
            onClick={() => navigate('/predicciones')}
            className="w-full py-3.5 px-4 rounded-xl bg-cupYellow text-[#242331] text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            Predecir ahora
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-emerald-400 text-xs font-semibold">
            Predicciones completas!
          </p>
        </div>
      )}
    </Card>
  );
}