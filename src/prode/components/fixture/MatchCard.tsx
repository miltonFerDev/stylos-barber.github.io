import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Match, MatchStatus } from '../../domain/types/match';

// Import flag SVG components from country-flag-icons
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

interface MatchCardProps {
  match: Match;
}

// Map of country names to flag components
const countryFlagMap: Record<string, React.FC<any>> = {
  'Argentina': AR,
  'Brasil': BR,
  'Alemania': DE,
  'Francia': FR,
  'Islandia': IS,
  'Camerun': CM,
  'Japon': JP,
  'Polonia': PL,
  'Australia': AU,
  'Uruguay': UY,
  'España': ES,
  'Inglaterra': GB,
  'Italia': IT,
  'Portugal': PT,
  'Belgica': BE,
  'Holanda': NL,
  'Estados Unidos': US,
  'Mexico': MX,
  'Canada': CA,
  'Chile': CL,
  'Colombia': CO,
  'Ecuador': EC,
  'Peru': PE,
  'Paraguay': PY,
  'Bolivia': BO,
  'Venezuela': VE,
};

function FlagIcon({ country }: { country: string }) {
  const FlagComponent = countryFlagMap[country];
  
  if (!FlagComponent) {
    // Fallback: show a circle with country code initials
    return (
      <div className="w-8 h-6 rounded bg-primaryLight flex items-center justify-center text-textLight text-xs font-bold border border-accentMuted/30">
        {country.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <FlagComponent className="w-8 h-6 rounded shadow-sm" />
  );
}

function formatMatchDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatMatchTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: MatchStatus) {
  switch (status) {
    case 'upcoming':
      return <Badge variant="info">Próximo</Badge>;
    case 'finished':
      return <Badge variant="success">Finalizado</Badge>;
    default:
      return null;
  }
}

export function MatchCard({ match }: MatchCardProps) {
  const isFinished = match.status === 'finished';

  return (
    <Card className="p-4 hover:shadow-cardHover transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-textMuted text-xs">
          {formatMatchDate(match.matchDate)} · {formatMatchTime(match.matchDate)}
        </span>
        {getStatusBadge(match.status)}
      </div>

      <div className="flex items-center justify-between">
        {/* Team A */}
        <div className="flex items-center gap-3 flex-1">
          <FlagIcon country={match.teamA} />
          <span className="text-textLight font-medium">{match.teamA}</span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-2 px-4">
          {isFinished ? (
            <>
              <span className="text-textLight text-xl font-bold">{match.scoreA}</span>
              <span className="text-textMuted">-</span>
              <span className="text-textLight text-xl font-bold">{match.scoreB}</span>
            </>
          ) : (
            <span className="text-textMuted text-lg font-medium">vs</span>
          )}
        </div>

        {/* Team B */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <span className="text-textLight font-medium">{match.teamB}</span>
          <FlagIcon country={match.teamB} />
        </div>
      </div>
    </Card>
  );
}
