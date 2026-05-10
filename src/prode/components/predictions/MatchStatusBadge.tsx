import React from 'react';
import { Badge } from '../ui/Badge';
import type { MatchStatus } from '../../domain/types/match';

interface MatchStatusBadgeProps {
  status: MatchStatus;
}

export function MatchStatusBadge({ status }: MatchStatusBadgeProps) {
  if (status === 'upcoming') {
    return <Badge variant="success">Abierto</Badge>;
  }
  return <Badge variant="neutral">Terminado</Badge>;
}
