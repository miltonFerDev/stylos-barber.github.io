import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { matchService } from '../services/match.service';
import type { Match } from '../domain/types/match';

function AdminMatchCard({ match, onResultSaved }: { match: Match; onResultSaved: () => void }) {
  const [scoreA, setScoreA] = React.useState('');
  const [scoreB, setScoreB] = React.useState('');
  const [message, setMessage] = React.useState('');

  const handleSave = () => {
    const sA = parseInt(scoreA);
    const sB = parseInt(scoreB);
    
    if (isNaN(sA) || isNaN(sB) || scoreA === '' || scoreB === '') {
      setMessage('Ingresá ambos resultados');
      return;
    }

    matchService.updateMatchResult(match.id, sA, sB);
    setMessage('Resultado guardado');
    setScoreA('');
    setScoreB('');
    onResultSaved();
    
    setTimeout(() => setMessage(''), 2000);
  };

  const handleReset = () => {
    matchService.resetMatch(match.id);
    setMessage('Partido reseteado');
    onResultSaved();
    setTimeout(() => setMessage(''), 2000);
  };

  const date = new Date(match.matchDate);
  const formattedDate = date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-textMuted text-xs">{formattedDate}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          match.status === 'finished' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-blue-500/20 text-blue-400'
        }`}>
          {match.status === 'finished' ? 'Finalizado' : 'Próximo'}
        </span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 text-center">
          <p className="text-textLight font-medium">{match.teamA}</p>
        </div>

        <div className="flex items-center gap-2 px-4">
          {match.status === 'finished' && match.scoreA !== null && match.scoreB !== null ? (
            <>
              <span className="text-textLight text-2xl font-bold">{match.scoreA}</span>
              <span className="text-textMuted">-</span>
              <span className="text-textLight text-2xl font-bold">{match.scoreB}</span>
            </>
          ) : (
            <>
              <input
                type="number"
                min="0"
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value)}
                className="w-12 h-10 bg-primary/50 border border-accentMuted/30 rounded-lg text-textLight text-center text-xl font-bold focus:border-accent focus:outline-none"
                placeholder="-"
              />
              <span className="text-textMuted text-lg">-</span>
              <input
                type="number"
                min="0"
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value)}
                className="w-12 h-10 bg-primary/50 border border-accentMuted/30 rounded-lg text-textLight text-center text-xl font-bold focus:border-accent focus:outline-none"
                placeholder="-"
              />
            </>
          )}
        </div>

        <div className="flex-1 text-center">
          <p className="text-textLight font-medium">{match.teamB}</p>
        </div>
      </div>

      {message && (
        <p className="text-center text-sm text-green-400 mb-2">{message}</p>
      )}

      {match.status !== 'finished' ? (
        <Button size="sm" fullWidth onClick={handleSave}>
          Guardar resultado
        </Button>
      ) : (
        <button
          onClick={handleReset}
          className="w-full text-sm text-textMuted hover:text-yellow-400 transition-colors underline"
        >
          Resetear partido
        </button>
      )}
    </Card>
  );
}

export function AdminPage() {
  const [matches, setMatches] = React.useState(matchService.getMatches());
  const [filter, setFilter] = React.useState<'all' | 'upcoming' | 'finished'>('all');

  const refreshMatches = () => {
    setMatches(matchService.getMatches());
  };

  const filteredMatches = matches.filter((m) => {
    if (filter === 'upcoming') return m.status === 'upcoming';
    if (filter === 'finished') return m.status === 'finished';
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-textLight text-2xl font-bold">Panel Admin</h1>
          <p className="text-textMuted text-sm mt-1">Gestionar resultados de partidos</p>
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

      <div className="flex gap-2">
        {(['all', 'upcoming', 'finished'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-accent text-white'
                : 'bg-primaryLight text-textMuted hover:text-textLight'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'upcoming' ? 'Próximos' : 'Finalizados'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredMatches.map((match) => (
          <AdminMatchCard key={match.id} match={match} onResultSaved={refreshMatches} />
        ))}
      </div>

      {filteredMatches.length === 0 && (
        <div className="text-center py-8">
          <p className="text-textMuted">No hay partidos en esta categoría</p>
        </div>
      )}
    </div>
  );
}
