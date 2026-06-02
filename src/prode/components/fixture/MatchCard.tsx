import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Match, MatchStatus } from '../../domain/types/match';
import { getEffectiveStatus, isPredictionAllowed } from '../../domain/logic/locking';
import { TeamDisplay } from '../ui/FlagIcon';

interface MatchCardProps {
  match: Match;
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