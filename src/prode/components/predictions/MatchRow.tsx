import React from 'react';
import { Card } from '../ui/Card';
import { MatchStatusBadge } from './MatchStatusBadge';
import type { Match } from '../../domain/types/match';
import { isPredictionLocked } from '../../domain/logic/locking';

// Import flag SVG components
import AR from 'country-flag-icons/react/3x2/AR';
import BR from 'country-flag-icons/react/3x2/BR';
import DE from 'country-flag-icons/react/3x2/DE';
import FR from 'country-flag-icons/react/3x2/FR';
import IS from 'country-flag-icons/react/3x2/IS';
import CM from 'country-flag-icons/react/3x2/CM';
import JP from 'country-flag-icons/react/3x2/JP';
import PL from 'country-flag-icons/react/3x2/PL';
import AU from 'country-flag-icons/react/3x2/AU';
import UY from 'country-flag-icons/react/3x2/UY';
import ES from 'country-flag-icons/react/3x2/ES';
import GB from 'country-flag-icons/react/3x2/GB';
import IT from 'country-flag-icons/react/3x2/IT';
import PT from 'country-flag-icons/react/3x2/PT';
import BE from 'country-flag-icons/react/3x2/BE';
import NL from 'country-flag-icons/react/3x2/NL';
import US from 'country-flag-icons/react/3x2/US';
import MX from 'country-flag-icons/react/3x2/MX';
import CA from 'country-flag-icons/react/3x2/CA';
import CL from 'country-flag-icons/react/3x2/CL';
import CO from 'country-flag-icons/react/3x2/CO';
import EC from 'country-flag-icons/react/3x2/EC';
import PE from 'country-flag-icons/react/3x2/PE';
import PY from 'country-flag-icons/react/3x2/PY';
import BO from 'country-flag-icons/react/3x2/BO';
import VE from 'country-flag-icons/react/3x2/VE';

const countryFlagMap: Record<string, React.FC<any>> = {
  'Argentina': AR, 'Brasil': BR, 'Alemania': DE, 'Francia': FR,
  'Islandia': IS, 'Camerun': CM, 'Japon': JP, 'Polonia': PL,
  'Australia': AU, 'Uruguay': UY, 'España': ES, 'Inglaterra': GB,
  'Italia': IT, 'Portugal': PT, 'Belgica': BE, 'Holanda': NL,
  'Estados Unidos': US, 'Mexico': MX, 'Canada': CA, 'Chile': CL,
  'Colombia': CO, 'Ecuador': EC, 'Peru': PE, 'Paraguay': PY,
  'Bolivia': BO, 'Venezuela': VE,
};

function FlagIcon({ country }: { country: string }) {
  const FlagComponent = countryFlagMap[country];
  if (!FlagComponent) {
    return (
      <div className="w-8 h-6 rounded bg-primaryLight flex items-center justify-center text-textLight text-xs font-bold border border-accentMuted/30">
        {country.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return <FlagComponent className="w-8 h-6 rounded shadow-sm" />;
}

interface MatchRowProps {
  match: Match;
  prediction?: { predictedScoreA: number; predictedScoreB: number };
  onPredictionChange?: (matchId: string, scoreA: number, scoreB: number) => void;
}

export function MatchRow({ match, prediction, onPredictionChange }: MatchRowProps) {
  const isLocked = isPredictionLocked(match.matchDate);
  const isFinished = match.status === 'finished';
  
  const [scoreA, setScoreA] = React.useState(
    prediction?.predictedScoreA?.toString() ?? ''
  );
  const [scoreB, setScoreB] = React.useState(
    prediction?.predictedScoreB?.toString() ?? ''
  );

  // Sync with external prediction changes
  React.useEffect(() => {
    if (prediction) {
      setScoreA(prediction.predictedScoreA.toString());
      setScoreB(prediction.predictedScoreB.toString());
    }
  }, [prediction]);

  const handleScoreAChange = (value: string) => {
    if (isLocked) return;
    const numValue = value === '' ? '' : Math.max(0, parseInt(value) || 0).toString();
    setScoreA(numValue);
    if (onPredictionChange && numValue !== '') {
      onPredictionChange(match.id, parseInt(numValue) || 0, parseInt(scoreB) || 0);
    }
  };

  const handleScoreBChange = (value: string) => {
    if (isLocked) return;
    const numValue = value === '' ? '' : Math.max(0, parseInt(value) || 0).toString();
    setScoreB(numValue);
    if (onPredictionChange && numValue !== '') {
      onPredictionChange(match.id, parseInt(scoreA) || 0, parseInt(numValue) || 0);
    }
  };

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
    <Card className={`${isLocked || isFinished ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-textMuted text-xs">{formattedDate} · {formattedTime}</span>
          {isLocked && (
            <span className="text-textMuted text-xs flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Bloqueado
            </span>
          )}
        </div>
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <div className="flex justify-center mb-1">
            <FlagIcon country={match.teamA} />
          </div>
          <p className="text-textLight text-sm font-medium">{match.teamA}</p>
        </div>

        <div className="flex items-center gap-2">
          {isFinished && match.scoreA !== null && match.scoreB !== null ? (
            <>
              <span className="text-textLight text-2xl font-bold">{match.scoreA}</span>
              <span className="text-textMuted text-lg">-</span>
              <span className="text-textLight text-2xl font-bold">{match.scoreB}</span>
            </>
          ) : isLocked ? (
            prediction ? (
              <>
                <span className="text-accent text-xl font-bold">{prediction.predictedScoreA}</span>
                <span className="text-textMuted">-</span>
                <span className="text-accent text-xl font-bold">{prediction.predictedScoreB}</span>
              </>
            ) : (
              <span className="text-textMuted text-sm">Sin predicción</span>
            )
          ) : (
            <>
              <input
                type="number"
                min="0"
                value={scoreA}
                onChange={(e) => handleScoreAChange(e.target.value)}
                className="w-12 h-10 bg-primary/50 border border-accentMuted/30 rounded-lg text-textLight text-center text-xl font-bold focus:border-accent focus:outline-none"
                placeholder="-"
              />
              <span className="text-textMuted text-lg">-</span>
              <input
                type="number"
                min="0"
                value={scoreB}
                onChange={(e) => handleScoreBChange(e.target.value)}
                className="w-12 h-10 bg-primary/50 border border-accentMuted/30 rounded-lg text-textLight text-center text-xl font-bold focus:border-accent focus:outline-none"
                placeholder="-"
              />
            </>
          )}
        </div>

        <div className="flex-1 text-center">
          <div className="flex justify-center mb-1">
            <FlagIcon country={match.teamB} />
          </div>
          <p className="text-textLight text-sm font-medium">{match.teamB}</p>
        </div>
      </div>

      {prediction && !isFinished && !isLocked && (
        <div className="mt-3 pt-3 border-t border-accentMuted/20">
          <p className="text-textMuted text-xs text-center">
            Predicción guardada: <span className="text-accent font-medium">{prediction.predictedScoreA} - {prediction.predictedScoreB}</span>
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
