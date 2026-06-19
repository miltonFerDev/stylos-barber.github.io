import React from 'react';
import { BallLoader } from '../components/ui/BallLoader';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useAuth } from '../hooks/useAuth';
import { useRankings } from '../hooks/useRankings';
import type { RankingEntry, PhaseIdentifier } from '../domain/types/ranking';
import { phaseIdToString, getPhaseLabel } from '../domain/types/ranking';
import { worldCup2026 } from '../config/competition';

function RankingTable({ entries, highlightAlias }: { entries: RankingEntry[]; highlightAlias?: string | null }) {
  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const isHighlighted = entry.alias === highlightAlias;

        const getPositionStyle = (pos: number, highlighted: boolean) => {
          if (pos === 1) return {
            bg: 'bg-cupYellow/8',
            border: 'border-cupYellow/20',
            badge: 'bg-cupYellow/15 text-cupYellow',
          };
          if (highlighted) return {
            bg: 'bg-accent/8',
            border: 'border-accent/20',
            badge: 'bg-accent/15 text-accent',
          };
          return {
            bg: 'bg-transparent',
            border: 'border-transparent',
            badge: 'bg-white/8 text-textMuted',
          };
        };

        const style = getPositionStyle(entry.position, isHighlighted);

        return (
          <div
            key={entry.alias}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${style.bg} ${style.border}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${style.badge}`}>
              {entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : `#${entry.position}`}
            </div>

            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-base truncate ${isHighlighted ? 'text-accent' : 'text-textLight'}`}>
                {entry.alias}
                {isHighlighted && (
                  <span className="ml-2 text-xs font-normal text-accent/70">(vos)</span>
                )}
              </p>
              <div className="flex items-center gap-4 text-sm text-textMuted mt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {entry.exactPredictions} exactos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  {entry.correctWinners} ganador
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className={`text-2xl font-bold ${entry.position === 1 ? 'text-amber-400' : 'text-textLight'}`}>
                {entry.points}
              </p>
              <p className="text-textMuted text-xs">pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RankingPage() {
  const { user } = useAuth();
  const [view, setView] = React.useState<'phases' | 'general'>('phases');
  const [selectedPhaseIdx, setSelectedPhaseIdx] = React.useState(0);
  const [activePhase, setActivePhase] = React.useState<PhaseIdentifier | null>(null);

  const { phase, general, userAlias, loading, error, refreshRankings, availablePhases, selectedPhase } = useRankings(user?.id ?? null, activePhase);

  React.useEffect(() => {
    if (availablePhases.length > 0 && selectedPhaseIdx < availablePhases.length) {
      setActivePhase(availablePhases[selectedPhaseIdx]);
    }
  }, [availablePhases, selectedPhaseIdx]);

  const prizeInfo = worldCup2026.prizes.perPhase;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-textLight text-xl font-bold tracking-tight">Rankings</h1>
          <p className="text-textMuted text-sm mt-1">Competí por los mejores premios</p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-accent text-sm font-medium hover:text-accentHover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver
        </Link>
      </div>

      {/* View tabs */}
      <div className="flex bg-white/5 rounded-xl p-1">
        <button
          onClick={() => setView('phases')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            view === 'phases'
              ? 'bg-white/10 text-textLight shadow-sm'
              : 'text-textMuted hover:text-textLight'
          }`}
        >
          Por fase
        </button>
        <button
          onClick={() => setView('general')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            view === 'general'
              ? 'bg-white/10 text-textLight shadow-sm'
              : 'text-textMuted hover:text-textLight'
          }`}
        >
          General
        </button>
      </div>

      {/* Phase selector */}
      {view === 'phases' && availablePhases.length > 0 && (
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {availablePhases.map((ph, idx) => (
              <button
                key={phaseIdToString(ph)}
                onClick={() => setSelectedPhaseIdx(idx)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedPhaseIdx === idx
                    ? 'bg-accent text-white shadow-md'
                    : 'bg-primaryLight/50 text-textMuted hover:text-textLight border border-accentMuted/20'
                }`}
              >
                {getPhaseLabel(ph)}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={refreshRankings} />}

      <Card className="p-4">
        {loading ? (
          <BallLoader text="Cargando rankings..." />
        ) : view === 'phases' && selectedPhase && phase.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primaryLight/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-textMuted">Aún no hay resultados en esta fase</p>
            {prizeInfo && (
              <p className="text-textMuted text-xs mt-2">🏆 {prizeInfo}</p>
            )}
          </div>
        ) : view === 'phases' || view === 'general' ? (
          <>
            {view === 'phases' && selectedPhase && (
              <div className="mb-4 pb-3 border-b border-white/10">
                <h2 className="text-textLight font-bold text-lg">{getPhaseLabel(selectedPhase)}</h2>
                {prizeInfo && (
                  <p className="text-textMuted text-xs mt-1">🥇 1° puesto: {prizeInfo}</p>
                )}
              </div>
            )}
            <RankingTable
              entries={view === 'phases' ? phase : general}
              highlightAlias={userAlias}
            />
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-textMuted">No hay rankings disponibles</p>
          </div>
        )}
      </Card>
    </div>
  );
}