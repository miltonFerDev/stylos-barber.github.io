import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useAuth } from '../hooks/useAuth';
import { useRankings } from '../hooks/useRankings';
import type { RankingEntry } from '../domain/types/ranking';

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
  const [activeTab, setActiveTab] = React.useState<'weekly' | 'general'>('weekly');
  const { weekly, general, userAlias, loading, error, refreshRankings } = useRankings(user?.id ?? null);

  const data = activeTab === 'weekly' ? weekly : general;

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

      <div className="flex bg-white/5 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'weekly'
              ? 'bg-white/10 text-textLight shadow-sm'
              : 'text-textMuted hover:text-textLight'
          }`}
        >
          Semanal
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'general'
              ? 'bg-white/10 text-textLight shadow-sm'
              : 'text-textMuted hover:text-textLight'
          }`}
        >
          General
        </button>
      </div>

      {error && <ErrorMessage message={error} onRetry={refreshRankings} />}

      <Card className="p-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-textMuted">Cargando rankings...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primaryLight/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-textMuted">No hay rankings disponibles</p>
          </div>
        ) : (
          <RankingTable entries={data} highlightAlias={userAlias} />
        )}
      </Card>
    </div>
  );
}
