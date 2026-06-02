import React from 'react';
import { Card } from '../ui/Card';
import { MatchStatusBadge } from './MatchStatusBadge';
import type { Match } from '../../domain/types/match';
import { isPredictionLocked, getEffectiveStatus, isPredictionAllowed } from '../../domain/logic/locking';

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
import ZA from 'country-flag-icons/react/3x2/ZA';
import KR from 'country-flag-icons/react/3x2/KR';
import CZ from 'country-flag-icons/react/3x2/CZ';
import BA from 'country-flag-icons/react/3x2/BA';
import QA from 'country-flag-icons/react/3x2/QA';
import CH from 'country-flag-icons/react/3x2/CH';
import MA from 'country-flag-icons/react/3x2/MA';
import HT from 'country-flag-icons/react/3x2/HT';
import TR from 'country-flag-icons/react/3x2/TR';
import CI from 'country-flag-icons/react/3x2/CI';
import SE from 'country-flag-icons/react/3x2/SE';
import TN from 'country-flag-icons/react/3x2/TN';
import EG from 'country-flag-icons/react/3x2/EG';
import IR from 'country-flag-icons/react/3x2/IR';
import NZ from 'country-flag-icons/react/3x2/NZ';
import CV from 'country-flag-icons/react/3x2/CV';
import SA from 'country-flag-icons/react/3x2/SA';
import IQ from 'country-flag-icons/react/3x2/IQ';
import NO from 'country-flag-icons/react/3x2/NO';
import DZ from 'country-flag-icons/react/3x2/DZ';
import AT from 'country-flag-icons/react/3x2/AT';
import JO from 'country-flag-icons/react/3x2/JO';
import CD from 'country-flag-icons/react/3x2/CD';
import UZ from 'country-flag-icons/react/3x2/UZ';
import HR from 'country-flag-icons/react/3x2/HR';
import GH from 'country-flag-icons/react/3x2/GH';
import PA from 'country-flag-icons/react/3x2/PA';
import SN from 'country-flag-icons/react/3x2/SN';
import CW from 'country-flag-icons/react/3x2/CW';

const countryFlagMap: Record<string, React.FC<any>> = {
  'Argentina': AR, 'Brasil': BR, 'Alemania': DE, 'Francia': FR,
  'Islandia': IS, 'Camerun': CM, 'Japon': JP, 'Polonia': PL,
  'Australia': AU, 'Uruguay': UY, 'España': ES, 'Inglaterra': GB,
  'Italia': IT, 'Portugal': PT, 'Belgica': BE, 'Holanda': NL,
  'Estados Unidos': US, 'Mexico': MX, 'Canada': CA, 'Chile': CL,
  'Colombia': CO, 'Ecuador': EC, 'Peru': PE, 'Paraguay': PY,
  'Bolivia': BO, 'Venezuela': VE,
  'México': MX, 'Sudáfrica': ZA, 'Corea del Sur': KR, 'Rep. Checa': CZ,
  'Canadá': CA, 'Bosnia y Herzegovina': BA, 'Qatar': QA, 'Suiza': CH,
  'Marruecos': MA, 'Haití': HT, 'Escocia': GB, 'Turquía': TR,
  'Curazao': CW, 'Costa de Marfil': CI, 'Países Bajos': NL,
  'Japón': JP, 'Suecia': SE, 'Túnez': TN, 'Bélgica': BE,
  'Egipto': EG, 'Irán': IR, 'Nueva Zelanda': NZ, 'Cabo Verde': CV,
  'Arabia Saudita': SA, 'Iraq': IQ, 'Noruega': NO, 'Argelia': DZ,
  'Austria': AT, 'Jordania': JO, 'RD Congo': CD, 'Uzbekistán': UZ,
  'Croacia': HR, 'Ghana': GH, 'Panamá': PA, 'Senegal': SN,
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

function TeamDisplay({ name, placeholder, side }: { name: string | null; placeholder: string | null; side: 'left' | 'right' }) {
  if (name) {
    return (
      <div className="flex items-center gap-2">
        {side === 'left' && <FlagIcon country={name} />}
        <span className="text-textLight font-semibold text-base">{name}</span>
        {side === 'right' && <FlagIcon country={name} />}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-6 rounded bg-primaryLight/50 flex items-center justify-center text-textMuted text-xs border border-accentMuted/20">?</div>
      <span className="text-textMuted italic text-sm">{placeholder ?? 'Por definir'}</span>
    </div>
  );
}

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