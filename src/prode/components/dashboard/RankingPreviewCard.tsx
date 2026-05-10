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
  const title = isWeekly ? '📊 Ranking Semanal' : '🏆 Ranking General';
  const subtitle = isWeekly ? 'Fecha 1' : 'Todos los tiempos';
  const top3 = data.slice(0, 3);

  const getMedal = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  return (
    <Card onClick={() => navigate('/ranking')} className="cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-textLight font-bold text-lg">{title}</h3>
          <p className="text-textMuted text-sm mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-2">
        {top3.map((entry) => (
          <div
            key={entry.alias}
            className={`flex items-center gap-3 p-2 rounded-lg ${
              entry.alias === 'MF2401' ? 'bg-accent/10 border border-accent/20' : 'bg-primary/30'
            }`}
          >
            <span className="text-lg w-8 text-center">{getMedal(entry.position)}</span>
            <span className="text-textLight font-medium flex-1">{entry.alias}</span>
            <span className="text-accent font-bold">{entry.points} pts</span>
          </div>
        ))}
      </div>

      <div className="mt-3 text-center">
        <span className="text-accent text-sm font-medium hover:underline">
          Ver ranking completo →
        </span>
      </div>
    </Card>
  );
}
