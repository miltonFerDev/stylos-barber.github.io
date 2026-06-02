import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Match, MatchStatus } from '../../domain/types/match';
import { getEffectiveStatus, isPredictionAllowed } from '../../domain/logic/locking';

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

interface MatchCardProps {
  match: Match;
}

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

function TeamDisplay({ name, placeholder }: { name: string | null; placeholder: string | null }) {
  if (name) {
    return (
      <div className="flex items-center gap-2">
        <FlagIcon country={name} />
        <span className="text-textLight font-semibold">{name}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-6 rounded bg-primaryLight/50 flex items-center justify-center text-textMuted text-xs border border-accentMuted/20">
        ?
      </div>
      <span className="text-textMuted italic text-sm">{placeholder ?? 'Por definir'}</span>
    </div>
  );
}

function formatMatchDate(dateStr: string | null): string {
  if (!dateStr) return 'Fecha por confirmar';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatMatchTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(effectiveStatus: MatchStatus) {
  switch (effectiveStatus) {
    case 'upcoming':
      return <Badge variant="pending">Próximo</Badge>;
    case 'live':
      return <Badge variant="info">En curso</Badge>;
    case 'finished':
      return <Badge variant="scored">Finalizado</Badge>;
  }
}

export function MatchCard({ match }: MatchCardProps) {
  const effectiveStatus = getEffectiveStatus(match.status, match.matchDate);
  const isFinished = effectiveStatus === 'finished';
  const hasPlaceholder = !isPredictionAllowed(match);

  return (
    <Card className={`transition-all ${isFinished ? 'bg-primaryLight/40' : ''} ${hasPlaceholder ? 'opacity-80' : 'hover:shadow-cardHover hover:-translate-y-0.5'}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-textMuted text-sm flex items-center gap-1.5">
          <svg className="w-4 h-4 text-cupGreen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatMatchDate(match.matchDate)} · {formatMatchTime(match.matchDate)}
        </span>
        {getStatusBadge(effectiveStatus)}
      </div>

      <div className="flex items-center justify-between min-w-0">
        <div className="flex-1 min-w-0">
          <TeamDisplay name={match.teamA} placeholder={match.teamAPlaceholder} />
        </div>

        <div className="flex items-center gap-3 px-5 py-3">
          {isFinished && match.scoreA !== null && match.scoreB !== null ? (
            <div className="flex items-center gap-2 bg-primary/50 rounded-xl px-5 py-3">
              <span className="text-textLight text-3xl font-bold">{match.scoreA}</span>
              <span className="text-textMuted text-xl">—</span>
              <span className="text-textLight text-3xl font-bold">{match.scoreB}</span>
            </div>
          ) : hasPlaceholder ? (
            <div className="bg-primary/30 border border-accentMuted/20 rounded-xl px-4 py-3">
              <span className="text-textMuted text-sm italic">Por definir</span>
            </div>
          ) : (
            <div className="bg-accent/10 border border-accent/20 rounded-xl px-5 py-3">
              <span className="text-accent text-xl font-medium">vs</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex justify-end">
          <TeamDisplay name={match.teamB} placeholder={match.teamBPlaceholder} />
        </div>
      </div>
    </Card>
  );
}