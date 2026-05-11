import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { MatchRow } from '../components/predictions/MatchRow';
import { matchService } from '../services/match.service';
import { useAuth } from '../hooks/useAuth';
import { usePredictions } from '../hooks/usePredictions';
import type { PredictionInput } from '../domain/types/prediction';
import type { Match } from '../domain/types/match';
import { competition } from '../config/competition';

export function PredictionsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { savePredictions, getPredictionForMatch } = usePredictions(userId);
  const [selectedMatchday, setSelectedMatchday] = React.useState('');
  const [pendingPredictions, setPendingPredictions] = React.useState<Record<string, { scoreA: number; scoreB: number }>>({});
  const [saveMessage, setSaveMessage] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const [matches, setMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await matchService.getMatches(competition.id);
      setMatches(data);
      if (data.length > 0 && !selectedMatchday) {
        setSelectedMatchday(data[0].matchday);
      }
    } catch (e) {
      setError('Error al cargar los partidos');
    } finally {
      setLoading(false);
    }
  };

  const matchdays = Array.from(new Set(matches.map((m) => m.matchday)));
  const matchesInDay = matches.filter((m) => m.matchday === selectedMatchday);

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
    } catch (e) {
      setSaveMessage('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }

    setTimeout(() => setSaveMessage(''), 3000);
  };

  const hasPendingChanges = Object.keys(pendingPredictions).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
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

      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scroll-smooth scrollbar-hide">
          {matchdays.map((day) => (
            <button
              key={day}
              onClick={() => {
                setSelectedMatchday(day);
                setSaveMessage('');
              }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                selectedMatchday === day
                  ? 'bg-accent text-white shadow-md'
                  : 'bg-primaryLight/50 text-textMuted hover:text-textLight border border-accentMuted/20'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {matchesInDay.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            prediction={getPredictionForMatch(match.id)}
            onPredictionChange={handlePredictionChange}
          />
        ))}
      </div>

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