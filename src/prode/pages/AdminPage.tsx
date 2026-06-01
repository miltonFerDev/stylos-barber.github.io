import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { matchService } from '../services/match.service';
import { adminService } from '../services/admin.service';
import type { Match, MatchStatus } from '../domain/types/match';
import type { Profile } from '../domain/types/profile';
import { competition } from '../config/competition';
import { getEffectiveStatus } from '../domain/logic/locking';

function AdminStatusBadge({ status, matchDate }: { status: MatchStatus; matchDate: string }) {
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

function AdminMatchCard({ match, onResultSaved }: { match: Match; onResultSaved: () => void }) {
  const [scoreA, setScoreA] = React.useState('');
  const [scoreB, setScoreB] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [saving, setSaving] = React.useState(false);

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

  const date = new Date(match.matchDate);
  const formattedDate = date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const effectiveStatus = getEffectiveStatus(match.status, match.matchDate);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-textMuted text-xs">{formattedDate}</span>
        <AdminStatusBadge status={match.status} matchDate={match.matchDate} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 text-center">
          <p className="text-textLight font-medium">{match.teamA}</p>
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
          <p className="text-textLight font-medium">{match.teamB}</p>
        </div>
      </div>

      {message && (
        <p className="text-center text-sm text-green-400 mb-2">{message}</p>
      )}

      <div className="flex gap-2">
        {match.status !== 'finished' ? (
          <Button size="sm" fullWidth onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar resultado'}
          </Button>
        ) : (
          <button
            onClick={handleReset}
            className="flex-1 text-sm text-textMuted hover:text-yellow-400 transition-colors underline"
          >
            Resetear partido
          </button>
        )}

        {match.status === 'upcoming' && (
          <button
            onClick={handleSetLive}
            className="px-3 py-1 text-sm bg-accent/15 text-accent border border-accent/20 rounded-lg hover:bg-accent/25 transition-colors"
          >
            En curso
          </button>
        )}

        {match.status === 'live' && (
          <button
            onClick={handleSetUpcoming}
            className="px-3 py-1 text-sm bg-white/5 text-textMuted border border-white/10 rounded-lg hover:text-textLight transition-colors"
          >
            Próximo
          </button>
        )}
      </div>
    </Card>
  );
}

export function AdminPage() {
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<'all' | 'upcoming' | 'live' | 'finished'>('all');
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newMatchDate, setNewMatchDate] = React.useState('');
  const [newTeamA, setNewTeamA] = React.useState('');
  const [newTeamB, setNewTeamB] = React.useState('');
  const [newMatchday, setNewMatchday] = React.useState('');
  const [newMatchNumber, setNewMatchNumber] = React.useState('');
  const [createMessage, setCreateMessage] = React.useState('');
  const [showUsers, setShowUsers] = React.useState(false);
  const [users, setUsers] = React.useState<{ profile: Profile; predictions: any[] }[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);

  const refreshMatches = React.useCallback(async () => {
    const data = await matchService.getMatches(competition.id);
    setMatches(data);
    setLoading(false);
  }, []);

  const refreshUsers = React.useCallback(async () => {
    setUsersLoading(true);
    const data = await adminService.getUsersWithPredictions();
    setUsers(data);
    setUsersLoading(false);
  }, []);

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    const success = await adminService.setAdminRole(userId, !currentIsAdmin);
    if (success) {
      refreshUsers();
    }
  };

  const argToUTC = (localValue: string): string => {
    const d = new Date(`${localValue}:00-03:00`);
    return d.toISOString();
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchDate || !newTeamA || !newTeamB || !newMatchday) {
      setCreateMessage('Completá todos los campos obligatorios');
      return;
    }

    const mNumber = newMatchNumber ? parseInt(newMatchNumber) : undefined;
    if (newMatchNumber && isNaN(mNumber!)) {
      setCreateMessage('Número de partido inválido');
      return;
    }

    const result = await matchService.addMatch({
      matchDate: argToUTC(newMatchDate),
      teamA: newTeamA,
      teamB: newTeamB,
      matchday: newMatchday,
      competition: competition.id,
      matchNumber: mNumber,
    });

    if (result) {
      setCreateMessage('Partido creado correctamente');
      setNewMatchDate('');
      setNewTeamA('');
      setNewTeamB('');
      setNewMatchday('');
      setNewMatchNumber('');
      setShowCreateForm(false);
      refreshMatches();
    } else {
      setCreateMessage('Error al crear el partido');
    }

    setTimeout(() => setCreateMessage(''), 3000);
  };

  React.useEffect(() => {
    refreshMatches();
  }, [refreshMatches]);

  const filteredMatches = matches.filter((m) => {
    if (filter === 'upcoming') return m.status === 'upcoming';
    if (filter === 'live') return m.status === 'live';
    if (filter === 'finished') return m.status === 'finished';
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-textLight text-2xl font-bold">Panel Admin</h1>
          <p className="text-textMuted text-sm mt-1">Gestionar resultados y estados de partidos</p>
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

      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowCreateForm((s) => !s)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accentHover transition-colors"
        >
          {showCreateForm ? 'Cancelar' : 'Nuevo partido'}
        </button>
        <button
          onClick={() => {
            setShowUsers((s) => !s);
            if (!showUsers) refreshUsers();
          }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showUsers
              ? 'bg-accent text-white'
              : 'bg-primaryLight text-textMuted hover:text-textLight'
          }`}
        >
          {showUsers ? 'Ver partidos' : 'Ver usuarios'}
        </button>
      </div>

      {showCreateForm && (
        <Card className="p-4">
          <h3 className="text-textLight font-semibold mb-3">Crear nuevo partido</h3>
          <form onSubmit={handleCreateMatch} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-textMuted text-xs mb-1">Fecha y hora (ARG)</label>
                <input
                  type="datetime-local"
                  value={newMatchDate}
                  onChange={(e) => setNewMatchDate(e.target.value)}
                  className="w-full bg-primary/50 border border-accentMuted/30 rounded-lg px-3 py-2 text-textLight text-sm focus:border-accent focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-textMuted text-xs mb-1">Número de partido</label>
                <input
                  type="number"
                  min="1"
                  value={newMatchNumber}
                  onChange={(e) => setNewMatchNumber(e.target.value)}
                  className="w-full bg-primary/50 border border-accentMuted/30 rounded-lg px-3 py-2 text-textLight text-sm focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-textMuted text-xs mb-1">Equipo local</label>
                <input
                  type="text"
                  value={newTeamA}
                  onChange={(e) => setNewTeamA(e.target.value)}
                  className="w-full bg-primary/50 border border-accentMuted/30 rounded-lg px-3 py-2 text-textLight text-sm focus:border-accent focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-textMuted text-xs mb-1">Equipo visitante</label>
                <input
                  type="text"
                  value={newTeamB}
                  onChange={(e) => setNewTeamB(e.target.value)}
                  className="w-full bg-primary/50 border border-accentMuted/30 rounded-lg px-3 py-2 text-textLight text-sm focus:border-accent focus:outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-textMuted text-xs mb-1">Grupo / Jornada</label>
              <input
                type="text"
                value={newMatchday}
                onChange={(e) => setNewMatchday(e.target.value)}
                placeholder="Ej: Semifinales"
                className="w-full bg-primary/50 border border-accentMuted/30 rounded-lg px-3 py-2 text-textLight text-sm focus:border-accent focus:outline-none"
                required
              />
            </div>
            {createMessage && (
              <p className="text-sm text-center text-green-400">{createMessage}</p>
            )}
            <button
              type="submit"
              className="w-full px-3 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accentHover transition-colors"
            >
              Crear partido
            </button>
          </form>
        </Card>
      )}

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

      {showUsers ? (
        <div className="space-y-3">
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-textMuted">No hay usuarios registrados</p>
            </div>
          ) : (
            users.map(({ profile, predictions }) => (
              <Card key={profile.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-textLight font-semibold">{profile.firstName} {profile.lastName}</p>
                    <p className="text-textMuted text-sm">@{profile.alias} · {profile.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {profile.role === 'admin' && (
                      <Badge variant="scored">Admin</Badge>
                    )}
                    <button
                      onClick={() => handleToggleAdmin(profile.id, profile.role === 'admin')}
                      className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                        profile.role === 'admin'
                          ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                          : 'border-accent/30 text-accent hover:bg-accent/10'
                      }`}
                    >
                      {profile.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-textMuted text-xs">
                  <span>WhatsApp: {profile.whatsapp}</span>
                  <span>·</span>
                  <span>Predicciones: {predictions.length}</span>
                  <span>·</span>
                  <span>Registrado: {new Date(profile.createdAt).toLocaleDateString('es-AR')}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMatches.map((match) => (
                <AdminMatchCard key={match.id} match={match} onResultSaved={refreshMatches} />
              ))}
            </div>
          )}

          {filteredMatches.length === 0 && !loading && !showUsers && (
            <div className="text-center py-8">
              <p className="text-textMuted">No hay partidos en esta categoría</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}