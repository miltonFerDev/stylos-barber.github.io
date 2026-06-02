import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { matchService } from '../services/match.service';
import type { Match, MatchStatus, TournamentPhase } from '../domain/types/match';
import { PHASE_LABELS } from '../domain/types/match';
import { getEffectiveStatus, isPredictionAllowed } from '../domain/logic/locking';
import { worldCup2026 } from '../config/competition';

function AdminStatusBadge({ status, matchDate }: { status: MatchStatus; matchDate: string | null }) {
  const effectiveStatus = getEffectiveStatus(status, matchDate);
  switch (effectiveStatus) {
    case 'upcoming':
      return <Badge variant="pending">Próximo</Badge>;
    case 'live':
      return <Badge variant="info">En curso</Badge>;
    case 'finished':
      return <Badge variant="scored">Finalizado</Badge>;
  }
}

function AdminMatchCard({ match, onResultSaved, onTeamsUpdated }: { match: Match; onResultSaved: () => void; onTeamsUpdated: () => void }) {
  const [scoreA, setScoreA] = React.useState('');
  const [scoreB, setScoreB] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [editingTeams, setEditingTeams] = React.useState(false);
  const [editTeamA, setEditTeamA] = React.useState(match.teamA ?? '');
  const [editTeamB, setEditTeamB] = React.useState(match.teamB ?? '');

  const canPredict = isPredictionAllowed(match);
  const hasPlaceholder = !canPredict;

  const handleSave = async () => {
    const sA = parseInt(scoreA);
    const sB = parseInt(scoreB);

    if (isNaN(sA) || isNaN(sB) || scoreA === '' || scoreB === '') {
      setMessage('Ingresá ambos resultados');
      return;
    }

    setSaving(true);
    await matchService.updateMatchResult(match.id, sA, sB);
    setSaving(false);
    setMessage('Resultado guardado');
    setScoreA('');
    setScoreB('');
    onResultSaved();

    setTimeout(() => setMessage(''), 2000);
  };

  const handleReset = async () => {
    await matchService.resetMatch(match.id);
    setMessage('Partido reseteado');
    onResultSaved();
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSetLive = async () => {
    await matchService.updateMatchStatus(match.id, 'live');
    setMessage('Estado actualizado a En curso');
    onResultSaved();
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSetUpcoming = async () => {
    await matchService.updateMatchStatus(match.id, 'upcoming');
    setMessage('Estado actualizado a Próximo');
    onResultSaved();
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSaveTeams = async () => {
    const result = await matchService.updateMatchTeams(match.id, editTeamA || null, editTeamB || null);
    if (result) {
      setMessage('Equipos actualizados');
      setEditingTeams(false);
      onTeamsUpdated();
    } else {
      setMessage('Error al actualizar equipos');
    }
    setTimeout(() => setMessage(''), 2000);
  };

  const formattedDate = match.matchDate
    ? new Date(match.matchDate).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Fecha por confirmar';

  const effectiveStatus = getEffectiveStatus(match.status, match.matchDate);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-textMuted text-xs">{formattedDate}</span>
        <div className="flex items-center gap-2">
          {match.group && <span className="text-textMuted text-xs bg-primaryLight px-2 py-0.5 rounded">Grupo {match.group}</span>}
          {hasPlaceholder && <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded">Por definir</span>}
          <AdminStatusBadge status={match.status} matchDate={match.matchDate} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 text-center">
          {match.teamA ? (
            <p className="text-textLight font-medium">{match.teamA}</p>
          ) : (
            <p className="text-textMuted italic text-sm" title={match.teamAPlaceholder ?? ''}>{match.teamAPlaceholder ?? 'Por definir'}</p>
          )}
        </div>

        <div className="flex items-center gap-2 px-4">
          {effectiveStatus === 'finished' && match.scoreA !== null && match.scoreB !== null ? (
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
          {match.teamB ? (
            <p className="text-textLight font-medium">{match.teamB}</p>
          ) : (
            <p className="text-textMuted italic text-sm" title={match.teamBPlaceholder ?? ''}>{match.teamBPlaceholder ?? 'Por definir'}</p>
          )}
        </div>
      </div>

      {message && (
        <p className="text-center text-sm text-green-400 mb-2">{message}</p>
      )}

      {editingTeams ? (
        <div className="space-y-2 mb-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={editTeamA}
              onChange={(e) => setEditTeamA(e.target.value)}
              className="bg-primary/50 border border-accentMuted/30 rounded-lg px-3 py-2 text-textLight text-sm focus:border-accent focus:outline-none"
              placeholder={match.teamAPlaceholder ?? 'Equipo local'}
            />
            <input
              type="text"
              value={editTeamB}
              onChange={(e) => setEditTeamB(e.target.value)}
              className="bg-primary/50 border border-accentMuted/30 rounded-lg px-3 py-2 text-textLight text-sm focus:border-accent focus:outline-none"
              placeholder={match.teamBPlaceholder ?? 'Equipo visitante'}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" fullWidth onClick={handleSaveTeams}>Guardar equipos</Button>
            <button onClick={() => setEditingTeams(false)} className="flex-1 text-sm text-textMuted hover:text-textLight transition-colors underline">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {match.status !== 'finished' && (
            <Button size="sm" fullWidth onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar resultado'}
            </Button>
          )}
          {match.status === 'finished' && (
            <button onClick={handleReset} className="flex-1 text-sm text-textMuted hover:text-yellow-400 transition-colors underline">
              Resetear partido
            </button>
          )}
          {match.status === 'upcoming' && (
            <button onClick={handleSetLive} className="px-3 py-1 text-sm bg-accent/15 text-accent border border-accent/20 rounded-lg hover:bg-accent/25 transition-colors">
              En curso
            </button>
          )}
          {match.status === 'live' && (
            <button onClick={handleSetUpcoming} className="px-3 py-1 text-sm bg-white/5 text-textMuted border border-white/10 rounded-lg hover:text-textLight transition-colors">
              Próximo
            </button>
          )}
          {hasPlaceholder && (
            <button onClick={() => setEditingTeams(true)} className="px-3 py-1 text-sm bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded-lg hover:bg-yellow-400/20 transition-colors">
              Definir equipos
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

export function AdminPage() {
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<'all' | 'upcoming' | 'live' | 'finished'>('all');
  const [phaseFilter, setPhaseFilter] = React.useState<TournamentPhase | 'all'>('all');

  const refreshMatches = React.useCallback(async () => {
    const data = await matchService.getMatches(worldCup2026.id);
    setMatches(data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    refreshMatches();
  }, [refreshMatches]);

  const filteredMatches = React.useMemo(() => {
    let result = matches;
    if (filter === 'upcoming') result = result.filter((m) => m.status === 'upcoming');
    if (filter === 'live') result = result.filter((m) => m.status === 'live');
    if (filter === 'finished') result = result.filter((m) => m.status === 'finished');
    if (phaseFilter !== 'all') result = result.filter((m) => m.phase === phaseFilter);
    return result;
  }, [matches, filter, phaseFilter]);

  const phases: (TournamentPhase | 'all')[] = ['all', 'groups', 'round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'third_place', 'final'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-textLight text-2xl font-bold">Panel Admin</h1>
          <p className="text-textMuted text-sm mt-1">Gestionar resultados y equipos</p>
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

      {/* Phase filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {phases.map((phase) => (
          <button
            key={phase}
            onClick={() => setPhaseFilter(phase)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              phaseFilter === phase
                ? 'bg-accent text-white'
                : 'bg-primaryLight text-textMuted hover:text-textLight'
            }`}
          >
            {phase === 'all' ? 'Todas las fases' : PHASE_LABELS[phase]}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'upcoming', 'live', 'finished'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-accent text-white'
                : 'bg-primaryLight text-textMuted hover:text-textLight'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'upcoming' ? 'Próximos' : f === 'live' ? 'En curso' : 'Finalizados'}
          </button>
        ))}
      </div>

      {/* Matches */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-textMuted">No hay partidos en esta categoria</p>
          </div>
        ) : (
          filteredMatches.map((match) => (
            <AdminMatchCard key={match.id} match={match} onResultSaved={refreshMatches} onTeamsUpdated={refreshMatches} />
          ))
        )}
      </div>
    </div>
  );
}