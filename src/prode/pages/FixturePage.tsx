import React from 'react';
import { BallLoader } from '../components/ui/BallLoader';
import type { Match, GroupLetter } from '../domain/types/match';
import { matchService } from '../services/match.service';
import { MatchCard } from '../components/fixture/MatchCard';
import { GroupAccordion } from '../components/ui/GroupAccordion';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { GROUPS, getGroupLabel } from '../domain/types/match';
import { getPredictionGroupId, getPredictionGroupLabelForId } from '../domain/logic/ranking';
import { worldCup2026 } from '../config/competition';

export function FixturePage() {
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadMatches = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await matchService.getMatches(worldCup2026.id);
      setMatches(data);
    } catch (e) {
      setError('Error al cargar el fixture');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const groupMatches = React.useMemo(
    () => matches.filter((m) => m.phase === 'groups'),
    [matches]
  );

  const knockoutMatches = React.useMemo(
    () => matches.filter((m) => m.phase !== 'groups'),
    [matches]
  );

  const groupsWithData = React.useMemo(() => {
    const map = new Map<GroupLetter, Match[]>();
    GROUPS.forEach((g) => {
      const gm = groupMatches.filter((m) => m.group === g);
      if (gm.length > 0) {
        map.set(g, gm.sort((a, b) => {
          if (a.matchday !== b.matchday) return (a.matchday ?? 0) - (b.matchday ?? 0);
          const timeA = a.matchDate ? new Date(a.matchDate).getTime() : Infinity;
          const timeB = b.matchDate ? new Date(b.matchDate).getTime() : Infinity;
          return timeA - timeB;
        }));
      }
    });
    return map;
  }, [groupMatches]);

  const knockoutGroupsWithData = React.useMemo(() => {
    const order = ['round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'final_stage'];
    const map = new Map<string, Match[]>();
    knockoutMatches.forEach((m) => {
      const groupId = getPredictionGroupId(m);
      const existing = map.get(groupId) ?? [];
      existing.push(m);
      map.set(groupId, existing);
    });
    const result: { groupId: string; matches: Match[] }[] = [];
    order.forEach((g) => {
      const gm = map.get(g);
      if (gm) {
        result.push({ groupId: g, matches: gm.sort((a, b) => a.matchNumber - b.matchNumber) });
      }
    });
    return result;
  }, [knockoutMatches]);

  if (loading) {
    return <BallLoader />;
  }

  if (error) {
    return (
      <div className="space-y-5">
        <h1 className="text-textLight text-2xl font-extrabold tracking-tight">Fixture</h1>
        <ErrorMessage message={error} onRetry={loadMatches} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-textLight text-2xl font-extrabold tracking-tight">Fixture</h1>
        <p className="text-textMuted text-sm mt-1">
          {worldCup2026.subtitle}
        </p>
      </div>

      {/* Group stage */}
      <div className="space-y-2">
        <h2 className="text-textLight font-bold text-lg">Fase de Grupos</h2>
        {Array.from(groupsWithData.entries()).map(([group, groupMatchList]) => (
          <GroupAccordion
            key={group}
            title={getGroupLabel(group)}
            subtitle={`${groupMatchList.length} partidos`}
          >
            {groupMatchList.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </GroupAccordion>
        ))}
      </div>

      {/* Knockout stage */}
      {knockoutGroupsWithData.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-textLight font-bold text-lg">Eliminatorias</h2>
          {knockoutGroupsWithData.map(({ groupId, matches: groupMatches }) => (
            <GroupAccordion
              key={groupId}
              title={getPredictionGroupLabelForId(groupId)}
              subtitle={`${groupMatches.length} partido${groupMatches.length !== 1 ? 's' : ''}`}
            >
              {groupMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </GroupAccordion>
          ))}
        </div>
      )}

      {matches.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-textMuted">No hay partidos disponibles</p>
        </div>
      )}
    </div>
  );
}