import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { mockRankingWeekly, mockRankingGeneral } from '../data/mocks';
import type { RankingEntry } from '../domain/types/ranking';

function RankingTable({ entries, highlightAlias }: { entries: RankingEntry[]; highlightAlias?: string }) {
  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.alias}
          className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
            entry.alias === highlightAlias
              ? 'bg-accent/15 border border-accent/30'
              : 'bg-primaryLight/30 hover:bg-primaryLight/50'
          }`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            entry.position === 1 ? 'bg-amber-500/20 text-amber-400' :
            entry.position === 2 ? 'bg-gray-400/20 text-gray-300' :
            entry.position === 3 ? 'bg-orange-600/20 text-orange-400' :
            'bg-primary/50 text-textMuted'
          }`}>
            {entry.position}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate ${entry.alias === highlightAlias ? 'text-accent' : 'text-textLight'}`}>
              {entry.alias}
              {entry.alias === highlightAlias && <span className="ml-2 text-xs">(vos)</span>}
            </p>
            <div className="flex items-center gap-2 text-xs text-textMuted">
              <span>{entry.exactPredictions} exactos</span>
              <span>·</span>
              <span>{entry.correctWinners} ganadores</span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-textLight font-bold text-lg">{entry.points}</p>
            <p className="text-textMuted text-xs">pts</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RankingPage() {
  const [activeTab, setActiveTab] = React.useState<'weekly' | 'general'>('weekly');

  const data = activeTab === 'weekly' ? mockRankingWeekly : mockRankingGeneral;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-textLight text-2xl font-bold">Rankings</h1>
        <Link to="/" className="text-accent text-sm font-medium hover:underline">
          ← Volver
        </Link>
      </div>

      <div className="flex bg-primaryLight/50 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'weekly'
              ? 'bg-accent text-white shadow-sm'
              : 'text-textMuted hover:text-textLight'
          }`}
        >
          📊 Semanal
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'general'
              ? 'bg-accent text-white shadow-sm'
              : 'text-textMuted hover:text-textLight'
          }`}
        >
          🏆 General
        </button>
      </div>

      <Card className="p-4">
        <RankingTable entries={data} highlightAlias="MF2401" />
      </Card>
    </div>
  );
}
