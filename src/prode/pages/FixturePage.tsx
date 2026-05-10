import React from 'react';
import type { Match } from '../domain/types/match';
import { matchService } from '../services/match.service';
import { MatchCard } from '../components/fixture/MatchCard';

interface GroupedMatches {
  matchday: string;
  matches: Match[];
}

function groupByMatchday(matches: Match[]): GroupedMatches[] {
  const groups: Record<string, Match[]> = {};
  
  matches.forEach((match: Match) => {
    if (!groups[match.matchday]) {
      groups[match.matchday] = [];
    }
    groups[match.matchday].push(match);
  });

  // Sort matchdays by extracting number (e.g., "Fecha 1" -> 1)
  return Object.entries(groups)
    .sort(([a], [b]) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    })
    .map(([matchday, matches]) => ({
      matchday,
      matches: matches.sort((a: Match, b: Match) => 
        new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      ),
    }));
}

export function FixturePage() {
  const [matches] = React.useState(matchService.getMatches());
  
  const groupedMatches = React.useMemo(() => groupByMatchday(matches), [matches]);
  const [selectedMatchday, setSelectedMatchday] = React.useState(
    groupedMatches[0]?.matchday || ''
  );

  const currentGroup = groupedMatches.find((g) => g.matchday === selectedMatchday);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-textLight text-2xl font-extrabold tracking-tight">Fixture</h1>
        <p className="text-textMuted text-sm mt-1">
          Todos los partidos del Mundial 2026
        </p>
      </div>

      {/* Matchday tabs */}
      {groupedMatches.length > 0 && (
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scroll-smooth scrollbar-hide">
            {groupedMatches.map((group) => (
              <button
                key={group.matchday}
                onClick={() => setSelectedMatchday(group.matchday)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedMatchday === group.matchday
                    ? 'bg-accent text-white shadow-md'
                    : 'bg-primaryLight/50 text-textMuted hover:text-textLight border border-accentMuted/20'
                }`}
              >
                {group.matchday}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Matches list */}
      {currentGroup ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-textLight font-bold">{currentGroup.matchday}</h2>
            <span className="text-textMuted text-xs">
              {currentGroup.matches.length} partido{currentGroup.matches.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {currentGroup.matches.map((match: Match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-textMuted">No hay partidos disponibles</p>
        </div>
      )}
    </div>
  );
}
