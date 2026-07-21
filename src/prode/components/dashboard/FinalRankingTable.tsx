import React from 'react';
import type { RankingEntry } from '../../domain/types/ranking';

interface FinalRankingTableProps {
  entries: RankingEntry[];
}

function getPositionBadge(position: number): string {
  if (position === 1) return '🥇';
  if (position === 2) return '🥈';
  if (position === 3) return '🥉';
  return `#${position}`;
}

function getRowStyle(position: number): { bg: string; border: string; badge: string } {
  if (position === 1) {
    return {
      bg: 'bg-cupYellow/8',
      border: 'border-cupYellow/20',
      badge: 'bg-cupYellow/15 text-cupYellow',
    };
  }
  if (position === 2) {
    return {
      bg: 'bg-white/[0.04]',
      border: 'border-white/10',
      badge: 'bg-white/10 text-textLight',
    };
  }
  if (position === 3) {
    return {
      bg: 'bg-amber-700/[0.06]',
      border: 'border-amber-700/20',
      badge: 'bg-amber-700/15 text-amber-300',
    };
  }
  return {
    bg: 'bg-transparent',
    border: 'border-transparent',
    badge: 'bg-white/8 text-textMuted',
  };
}

export function FinalRankingTable({ entries }: FinalRankingTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-textMuted">Todavía no hay resultados publicados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const style = getRowStyle(entry.position);
        return (
          <div
            key={entry.alias}
            className={`flex items-center gap-3 p-3 sm:gap-4 sm:p-4 rounded-xl border transition-all ${style.bg} ${style.border}`}
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold shrink-0 ${style.badge}`}
            >
              {getPositionBadge(entry.position)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base text-textLight truncate">
                {entry.alias}
              </p>
              <div className="flex items-center gap-3 text-xs text-textMuted mt-1">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {entry.exactPredictions} exactos
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  {entry.correctWinners} parciales
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p
                className={`text-xl sm:text-2xl font-bold ${
                  entry.position === 1 ? 'text-amber-400' : 'text-textLight'
                }`}
              >
                {entry.points}
              </p>
              <p className="text-textMuted text-[10px] sm:text-xs">pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}