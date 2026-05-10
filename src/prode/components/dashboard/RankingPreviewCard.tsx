import React from 'react';
import { Card } from '../ui/Card';
import { useNavigate } from 'react-router-dom';
import { mockRankingWeekly, mockRankingGeneral } from '../../data/mocks';

interface RankingPreviewCardProps {
  type: 'weekly' | 'general';
}

export function RankingPreviewCard({ type }: RankingPreviewCardProps) {
  const navigate = useNavigate();
  const isWeekly = type === 'weekly';
  const data = isWeekly ? mockRankingWeekly : mockRankingGeneral;
  const title = isWeekly ? 'Ranking Semanal' : 'Ranking General';
  const subtitle = isWeekly ? 'Fecha 1' : 'Todos los tiempos';
  const top3 = data.slice(0, 3);

  const getPositionStyle = (position: number) => {
    if (position === 1) return {
      bg: 'bg-cupYellow/8',
      border: 'border-cupYellow/20',
      badge: 'bg-cupYellow/15 text-cupYellow',
    };
    return {
      bg: 'bg-transparent',
      border: 'border-transparent',
      badge: 'bg-white/8 text-textMuted',
    };
  };

  return (
    <Card onClick={() => navigate('/ranking')} className="cursor-pointer">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-textLight font-semibold text-base">{title}</h3>
          <p className="text-textMuted text-xs mt-0.5">{subtitle}</p>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isWeekly ? 'bg-white/8 text-textMuted' : 'bg-cupYellow/10 text-cupYellow'}`}>
          {isWeekly ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {top3.map((entry) => {
          const style = getPositionStyle(entry.position);
          return (
            <div key={entry.alias} className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all ${style.bg} ${style.border}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${style.badge}`}>
                {entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : `#${entry.position}`}
              </div>
              <span className="text-textLight text-sm font-medium flex-1 truncate">{entry.alias}</span>
              <span className={`font-semibold text-sm ${entry.position === 1 ? 'text-cupYellow' : 'text-textMuted'}`}>
                {entry.points} pts
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-white/[0.06] text-center">
        <span className="text-textMuted text-xs font-medium hover:text-textLight transition-colors">
          Ver ranking completo →
        </span>
      </div>
    </Card>
  );
}
