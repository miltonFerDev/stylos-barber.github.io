import React from 'react';
import { BallLoader } from '../components/ui/BallLoader';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { MatchRow } from '../components/predictions/MatchRow';
import { GroupAccordion } from '../components/ui/GroupAccordion';
import { matchService } from '../services/match.service';
import { useAuth } from '../hooks/useAuth';
import { usePredictions } from '../hooks/usePredictions';
import type { PredictionInput } from '../domain/types/prediction';
import type { Match, GroupLetter } from '../domain/types/match';
import { getGroupLabel } from '../domain/types/match';
import { getPredictionGroupId, getPredictionGroupLabelForId } from '../domain/logic/ranking';
import { worldCup2026 } from '../config/competition';
import { trackPredictionSaved } from '../utils/analytics';

type ViewMode = 'groups' | 'knockout';

export function PredictionsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { savePredictions, getPredictionForMatch } = usePredictions(userId);
  const [pendingPredictions, setPendingPredictions] = React.useState<Record<string, { scoreA: number; scoreB: number }>>({});
  const [saveMessage, setSaveMessage] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const [matches, setMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [viewMode, setViewMode] = React.useState<ViewMode>('groups');
  const [selectedMatchday, setSelectedMatchday] = React.useState<number>(1);
  const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await matchService.getMatches(worldCup2026.id);
      setMatches(data);
    } catch (e) {
      setError('Error al cargar los partidos');
    } finally {
      setLoading(false);
    }
  };

  const groupMatches = React.useMemo(
    () => matches.filter((m) => m.phase === 'groups'),
    [matches]
  );

  const knockoutMatches = React.useMemo(
    () => matches.filter((m) => m.phase !== 'groups'),
    [matches]
  );

  const matchdays = React.useMemo(
    () => Array.from(new Set(groupMatches.map((m) => m.matchday).filter((d): d is number => d !== null))).sort((a, b) => a - b),
    [groupMatches]
  );

  const groupsInMatchday = React.useMemo(() => {
    const filtered = groupMatches.filter((m) => m.matchday === selectedMatchday);
    return Array.from(new Set(filtered.map((m) => m.group))).filter((g): g is GroupLetter => g !== null).sort();
  }, [groupMatches, selectedMatchday]);

  const getMatchesForGroupAndMatchday = React.useCallback(
    (group: GroupLetter) =>
      groupMatches.filter((m) => m.group === group && m.matchday === selectedMatchday),
    [groupMatches, selectedMatchday]
  );

  const knockoutGroups = React.useMemo(() => {
    const order = ['round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'final_stage'];
    const set = new Set<string>();
    knockoutMatches.forEach((m) => set.add(getPredictionGroupId(m)));
    return order.filter((g) => set.has(g));
  }, [knockoutMatches]);

  React.useEffect(() => {
    if (knockoutGroups.length > 0 && (selectedGroup === null || !knockoutGroups.includes(selectedGroup))) {
      setSelectedGroup(knockoutGroups[0]);
    }
  }, [knockoutGroups, selectedGroup]);

  const matchesForGroup = React.useMemo(() => {
    if (!selectedGroup) return [];
    return knockoutMatches
      .filter((m) => getPredictionGroupId(m) === selectedGroup)
      .sort((a, b) => a.matchNumber - b.matchNumber);
  }, [knockoutMatches, selectedGroup]);

  const handlePredictionChange = (matchId: string, scoreA: number, scoreB: number) => {
    setPendingPredictions((prev) => ({
      ...prev,
      [matchId]: { scoreA, scoreB },
    }));
    if (saveMessage) setSaveMessage('');
  };

  const handleSave = async () => {
    const inputs: PredictionInput[] = Object.entries(pendingPredictions)
      .filter(([_, scores]) => scores.scoreA !== undefined && scores.scoreB !== undefined)
      .map(([matchId, scores]) => ({
        matchId,
        predictedScoreA: scores.scoreA,
        predictedScoreB: scores.scoreB,
      }));

    if (inputs.length === 0) {
      setSaveMessage('No hay predicciones para guardar');
      return;
    }

    setSaving(true);
    setSaveMessage('');
    try {
      await savePredictions(inputs);
      setPendingPredictions({});
      setSaveMessage('Predicciones guardadas!');
      trackPredictionSaved(inputs.length);
    } catch (e) {
      setSaveMessage('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }

    setTimeout(() => setSaveMessage(''), 3000);
  };

  const hasPendingChanges = Object.keys(pendingPredictions).length > 0;

  if (loading) {
    return <BallLoader />;
  }

  if (error) {
    return (
      <div className="space-y-5">
        <h1 className="text-textLight text-2xl font-extrabold tracking-tight">Mis Predicciones</h1>
        <ErrorMessage message={error} onRetry={loadMatches} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-textLight text-2xl font-extrabold tracking-tight">Mis Predicciones</h1>
          <p className="text-textMuted text-sm mt-1">Completá tus resultados antes de cada partido</p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-accent text-sm font-medium hover:text-accentHover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver
        </Link>
      </div>

      {/* View mode tabs: Groups / Knockout */}
      <div className="flex gap-2">
        {(['groups', 'knockout'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              viewMode === mode
                ? 'bg-accent text-white shadow-md'
                : 'bg-primaryLight/50 text-textMuted hover:text-textLight border border-accentMuted/20'
            }`}
          >
            {mode === 'groups' ? 'Fase de Grupos' : 'Eliminatorias'}
          </button>
        ))}
      </div>

      {viewMode === 'groups' && (
        <>
          {/* Matchday tabs: Fecha 1, Fecha 2, Fecha 3 */}
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scroll-smooth scrollbar-hide">
              {matchdays.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedMatchday(day)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    selectedMatchday === day
                      ? 'bg-accent text-white shadow-md'
                      : 'bg-primaryLight/50 text-textMuted hover:text-textLight border border-accentMuted/20'
                  }`}
                >
                  Fecha {day}
                </button>
              ))}
            </div>
          </div>

          {/* Group accordions for this matchday */}
          <div className="space-y-2">
            {groupsInMatchday.map((group) => {
              const groupMatchesForDay = getMatchesForGroupAndMatchday(group);
              return (
                <GroupAccordion
                  key={group}
                  title={getGroupLabel(group)}
                  subtitle={`${groupMatchesForDay.length} partido${groupMatchesForDay.length !== 1 ? 's' : ''}`}
                >
                  {groupMatchesForDay.map((match) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                      prediction={getPredictionForMatch(match.id)}
                      onPredictionChange={handlePredictionChange}
                    />
                  ))}
                </GroupAccordion>
              );
            })}
          </div>
        </>
      )}

      {viewMode === 'groups' && groupsInMatchday.length === 0 && (
        <div className="text-center py-8">
          <p className="text-textMuted">No hay partidos para esta fecha</p>
        </div>
      )}

      {viewMode === 'knockout' && (
        <>
          {/* Group tabs */}
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scroll-smooth scrollbar-hide">
              {knockoutGroups.map((group) => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    selectedGroup === group
                      ? 'bg-accent text-white shadow-md'
                      : 'bg-primaryLight/50 text-textMuted hover:text-textLight border border-accentMuted/20'
                  }`}
                >
                  {getPredictionGroupLabelForId(group)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {matchesForGroup.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                prediction={getPredictionForMatch(match.id)}
                onPredictionChange={handlePredictionChange}
              />
            ))}
          </div>
        </>
      )}

      {viewMode === 'knockout' && matchesForGroup.length === 0 && (
        <div className="text-center py-8">
          <p className="text-textMuted">No hay partidos para esta fase</p>
        </div>
      )}

      {saveMessage && (
        <div className={`text-center text-sm ${saveMessage.includes('guardadas') ? 'text-green-400' : 'text-yellow-400'}`}>
          {saveMessage}
        </div>
      )}

      <div className="pt-4">
        <Button
          fullWidth
          onClick={handleSave}
          disabled={!hasPendingChanges || saving}
        >
          {saving ? 'Guardando...' : hasPendingChanges ? 'Guardar predicciones' : 'Predicciones guardadas'}
        </Button>
      </div>
    </div>
  );
}