import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { MatchRow } from '../components/predictions/MatchRow';
import { mockMatches } from '../data/mocks';
import { usePredictions } from '../hooks/usePredictions';
import type { PredictionInput } from '../domain/types/prediction';

export function PredictionsPage() {
  const { savePredictions, getPredictionForMatch } = usePredictions();
  const [selectedMatchday, setSelectedMatchday] = React.useState('Fecha 1');
  const [pendingPredictions, setPendingPredictions] = React.useState<Record<string, { scoreA: number; scoreB: number }>>({});
  const [saveMessage, setSaveMessage] = React.useState('');

  const matchdays = Array.from(new Set(mockMatches.map((m) => m.matchday)));
  const matchesInDay = mockMatches.filter((m) => m.matchday === selectedMatchday);

  const handlePredictionChange = (matchId: string, scoreA: number, scoreB: number) => {
    setPendingPredictions((prev) => ({
      ...prev,
      [matchId]: { scoreA, scoreB },
    }));
    // Clear save message when user makes changes
    if (saveMessage) setSaveMessage('');
  };

  const handleSave = () => {
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

    savePredictions(inputs);
    setPendingPredictions({});
    setSaveMessage('¡Predicciones guardadas!');
    
    // Clear message after 3 seconds
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const hasPendingChanges = Object.keys(pendingPredictions).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-textLight text-2xl font-bold">Predicciones</h1>
        <Link to="/" className="text-accent text-sm font-medium hover:underline">
          ← Volver
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {matchdays.map((day) => (
          <button
            key={day}
            onClick={() => {
              setSelectedMatchday(day);
              setSaveMessage('');
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              selectedMatchday === day
                ? 'bg-accent text-white'
                : 'bg-primaryLight text-textMuted hover:text-textLight'
            }`}
          >
            {day}
          </button>
        ))}
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
          disabled={!hasPendingChanges}
        >
          {hasPendingChanges ? 'Guardar predicciones' : 'Predicciones guardadas'}
        </Button>
      </div>
    </div>
  );
}
