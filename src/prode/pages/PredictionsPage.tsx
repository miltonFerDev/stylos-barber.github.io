import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { MatchRow } from '../components/predictions/MatchRow';
import { mockMatches, mockPredictions } from '../data/mocks';

export function PredictionsPage() {
  const [selectedMatchday, setSelectedMatchday] = React.useState('Fecha 1');

  const matchdays = Array.from(new Set(mockMatches.map((m: { matchday: string }) => m.matchday)));
  const matchesInDay = mockMatches.filter((m: { matchday: string }) => m.matchday === selectedMatchday);

  const getPrediction = (matchId: string) => {
    return mockPredictions.find((p: { matchId: string }) => p.matchId === matchId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-textLight text-2xl font-bold">Predicciones</h1>
        <Link to="/prode" className="text-accent text-sm font-medium hover:underline">
          ← Volver
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {matchdays.map((day: string) => (
          <button
            key={day}
            onClick={() => setSelectedMatchday(day)}
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
            prediction={getPrediction(match.id)}
          />
        ))}
      </div>

      <div className="pt-4">
        <Button fullWidth>
          Guardar predicciones
        </Button>
      </div>
    </div>
  );
}
