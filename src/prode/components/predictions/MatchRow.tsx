import React from 'react';
import { Card } from '../ui/Card';
import { MatchStatusBadge } from './MatchStatusBadge';
import type { Match } from '../../domain/types/match';

interface MatchRowProps {
  match: Match;
  prediction?: { predictedScoreA: number; predictedScoreB: number };
}

export function MatchRow({ match, prediction }: MatchRowProps) {
  const isFinished = match.status === 'finished';
  const isLocked = isFinished;
  const date = new Date(match.matchDate);
  const formattedDate = date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
  const formattedTime = date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className={`${isLocked ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-textMuted text-xs">{formattedDate} · {formattedTime}</span>
        </div>
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <div className="text-2xl mb-1">🇦🇷</div>
          <p className="text-textLight text-sm font-medium">{match.teamA}</p>
        </div>

        <div className="flex items-center gap-2">
          {isFinished && match.scoreA !== null && match.scoreB !== null ? (
            <>
              <span className="text-textLight text-2xl font-bold">{match.scoreA}</span>
              <span className="text-textMuted text-lg">-</span>
              <span className="text-textLight text-2xl font-bold">{match.scoreB}</span>
            </>
          ) : prediction ? (
            <>
              <span className="text-accent text-xl font-bold">{prediction.predictedScoreA}</span>
              <span className="text-textMuted">-</span>
              <span className="text-accent text-xl font-bold">{prediction.predictedScoreB}</span>
            </>
          ) : (
            <>
              <span className="text-textMuted text-xl font-mono">_</span>
              <span className="text-textMuted">-</span>
              <span className="text-textMuted text-xl font-mono">_</span>
            </>
          )}
        </div>

        <div className="flex-1 text-center">
          <div className="text-2xl mb-1">🇧🇷</div>
          <p className="text-textLight text-sm font-medium">{match.teamB}</p>
        </div>
      </div>

      {prediction && !isFinished && (
        <div className="mt-3 pt-3 border-t border-accentMuted/20">
          <p className="text-textMuted text-xs text-center">
            Tu predicción: <span className="text-accent font-medium">{prediction.predictedScoreA} - {prediction.predictedScoreB}</span>
          </p>
        </div>
      )}

      {isFinished && prediction && match.scoreA !== null && match.scoreB !== null && (
        <div className="mt-3 pt-3 border-t border-accentMuted/20">
          <p className="text-textMuted text-xs text-center">
            Resultado: <span className="text-textLight font-medium">{match.scoreA} - {match.scoreB}</span>
            {' · '}
            <span className="text-accent font-medium">Tu predicción: {prediction.predictedScoreA} - {prediction.predictedScoreB}</span>
          </p>
        </div>
      )}
    </Card>
  );
}
