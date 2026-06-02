import React from 'react';
import { Card } from '../ui/Card';
import { MatchStatusBadge } from './MatchStatusBadge';
import type { Match } from '../../domain/types/match';
import { isPredictionLocked, getEffectiveStatus, isPredictionAllowed } from '../../domain/logic/locking';
import { TeamDisplay } from '../ui/FlagIcon';

interface MatchRowProps {
  match: Match;
  prediction?: { predictedScoreA: number; predictedScoreB: number };
  onPredictionChange?: (matchId: string, scoreA: number, scoreB: number) => void;
}

export function MatchRow({ match, prediction, onPredictionChange }: MatchRowProps) {
  const isLocked = isPredictionLocked(match.matchDate);
  const isFinished = match.status === 'finished';
  const effectiveStatus = getEffectiveStatus(match.status, match.matchDate);
  const canPredict = isPredictionAllowed(match);

  const [scoreA, setScoreA] = React.useState(
    prediction?.predictedScoreA?.toString() ?? ''
  );
  const [scoreB, setScoreB] = React.useState(
    prediction?.predictedScoreB?.toString() ?? ''
  );

  React.useEffect(() => {
    if (prediction) {
      setScoreA(prediction.predictedScoreA.toString());
      setScoreB(prediction.predictedScoreB.toString());
    }
  }, [prediction]);

  const handleScoreAChange = (value: string) => {
    if (isLocked || !canPredict) return;
    const numValue = value === '' ? '' : Math.max(0, parseInt(value) || 0).toString();
    setScoreA(numValue);
    if (onPredictionChange && numValue !== '') {
      onPredictionChange(match.id, parseInt(numValue) || 0, parseInt(scoreB) || 0);
    }
  };

  const handleScoreBChange = (value: string) => {
    if (isLocked || !canPredict) return;
    const numValue = value === '' ? '' : Math.max(0, parseInt(value) || 0).toString();
    setScoreB(numValue);
    if (onPredictionChange && numValue !== '') {
      onPredictionChange(match.id, parseInt(scoreA) || 0, parseInt(numValue) || 0);
    }
  };

  const formattedDate = match.matchDate
    ? new Date(match.matchDate).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
      })
    : 'Fecha por confirmar';
  const formattedTime = match.matchDate
    ? new Date(match.matchDate).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <Card className={`${isLocked || isFinished || !canPredict ? 'opacity-75' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <span className="text-textMuted text-xs">{formattedDate} · {formattedTime}</span>
        {isLocked && canPredict && <span className="text-textMuted text-xs font-medium ml-2">🔒 Bloqueado</span>}
        {!canPredict && <span className="text-textMuted text-xs font-medium ml-2">🔒 Equipos por definir</span>}
        <div className="ml-auto">
          <MatchStatusBadge status={effectiveStatus} />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="sm:hidden space-y-3">
        <div className="flex items-center gap-3">
          <TeamDisplay name={match.teamA} placeholder={match.teamAPlaceholder} side="left" />
          {isFinished && match.scoreA !== null ? (
            <span className="text-textLight text-2xl font-bold w-16 text-center">{match.scoreA}</span>
          ) : isLocked ? (
            <span className="text-accent text-2xl font-bold w-16 text-center">{prediction?.predictedScoreA ?? '-'}</span>
          ) : canPredict ? (
            <input
              type="number"
              min="0"
              value={scoreA}
              onChange={(e) => handleScoreAChange(e.target.value)}
              aria-label={`Goles de ${match.teamA ?? match.teamAPlaceholder ?? ''}`}
              className="w-16 h-14 bg-primary/40 border border-white/10 rounded-xl text-textLight text-center text-2xl font-bold focus:border-cupYellow focus:outline-none focus:ring-2 focus:ring-cupYellow/30"
              placeholder="-"
            />
          ) : (
            <span className="text-textMuted text-xl w-16 text-center">-</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <TeamDisplay name={match.teamB} placeholder={match.teamBPlaceholder} side="left" />
          {isFinished && match.scoreB !== null ? (
            <span className="text-textLight text-2xl font-bold w-16 text-center">{match.scoreB}</span>
          ) : isLocked ? (
            <span className="text-accent text-2xl font-bold w-16 text-center">{prediction?.predictedScoreB ?? '-'}</span>
          ) : canPredict ? (
            <input
              type="number"
              min="0"
              value={scoreB}
              onChange={(e) => handleScoreBChange(e.target.value)}
              aria-label={`Goles de ${match.teamB ?? match.teamBPlaceholder ?? ''}`}
              className="w-16 h-14 bg-primary/40 border border-white/10 rounded-xl text-textLight text-center text-2xl font-bold focus:border-cupYellow focus:outline-none focus:ring-2 focus:ring-cupYellow/30"
              placeholder="-"
            />
          ) : (
            <span className="text-textMuted text-xl w-16 text-center">-</span>
          )}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:flex sm:items-center gap-4 sm:gap-3">
        <div className="flex-1 text-left">
          <TeamDisplay name={match.teamA} placeholder={match.teamAPlaceholder} side="left" />
        </div>

        <div className="flex items-center justify-center gap-3">
          {isFinished && match.scoreA !== null && match.scoreB !== null ? (
            <>
              <span className="text-textLight text-3xl font-bold">{match.scoreA}</span>
              <span className="text-textMuted text-2xl">-</span>
              <span className="text-textLight text-3xl font-bold">{match.scoreB}</span>
            </>
          ) : isLocked ? (
            prediction ? (
              <>
                <span className="text-accent text-2xl font-bold">{prediction.predictedScoreA}</span>
                <span className="text-textMuted text-lg">-</span>
                <span className="text-accent text-2xl font-bold">{prediction.predictedScoreB}</span>
              </>
            ) : (
              <span className="text-textMuted text-sm">Sin predecir</span>
            )
          ) : canPredict ? (
            <>
              <input
                type="number"
                min="0"
                value={scoreA}
                onChange={(e) => handleScoreAChange(e.target.value)}
                aria-label={`Goles de ${match.teamA ?? match.teamAPlaceholder ?? ''}`}
                className="w-16 h-14 bg-primary/40 border border-white/10 rounded-xl text-textLight text-center text-2xl font-bold focus:border-cupYellow focus:outline-none focus:ring-2 focus:ring-cupYellow/30"
                placeholder="-"
              />
              <span className="text-textMuted text-xl" aria-hidden="true">-</span>
              <input
                type="number"
                min="0"
                value={scoreB}
                onChange={(e) => handleScoreBChange(e.target.value)}
                aria-label={`Goles de ${match.teamB ?? match.teamBPlaceholder ?? ''}`}
                className="w-16 h-14 bg-primary/40 border border-white/10 rounded-xl text-textLight text-center text-2xl font-bold focus:border-cupYellow focus:outline-none focus:ring-2 focus:ring-cupYellow/30"
                placeholder="-"
              />
            </>
          ) : (
            <span className="text-textMuted text-sm italic">Por definir</span>
          )}
        </div>

        <div className="flex-1 text-right">
          <TeamDisplay name={match.teamB} placeholder={match.teamBPlaceholder} side="right" />
        </div>
      </div>

      {prediction && !isFinished && !isLocked && canPredict && (
        <div className="mt-3 pt-3 border-t border-white/6">
          <p className="text-textMuted text-xs text-center">
            Guardado: <span className="text-cupYellow font-medium">{prediction.predictedScoreA} - {prediction.predictedScoreB}</span>
          </p>
        </div>
      )}

      {isFinished && prediction && match.scoreA !== null && match.scoreB !== null && canPredict && (
        <div className="mt-3 pt-3 border-t border-white/6">
          <p className="text-textMuted text-xs text-center">
            Resultado: <span className="text-textLight font-medium">{match.scoreA} - {match.scoreB}</span>
            {' · '}
            <span className="text-cupYellow font-medium">Vos: {prediction.predictedScoreA} - {prediction.predictedScoreB}</span>
          </p>
        </div>
      )}
    </Card>
  );
}