import React from 'react';
import { Badge } from '../ui/Badge';
import type { MatchStatus } from '../../domain/types/match';

interface MatchStatusBadgeProps {
  status: MatchStatus;
}

export function MatchStatusBadge({ status }: MatchStatusBadgeProps) {
  switch (status) {
    case 'upcoming':
      return (
        <Badge variant="pending">
          <span className="w-1.5 h-1.5 rounded-full bg-cupYellow mr-1.5" />
          Abierto
        </Badge>
      );
    case 'live':
      return (
        <Badge variant="closed">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Cerrado
        </Badge>
      );
    case 'finished':
      return (
        <Badge variant="closed">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Cerrado
        </Badge>
      );
  }
}