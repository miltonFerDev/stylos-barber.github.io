import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { mockRankingGeneral } from '../../data/mocks';

export function ProfileCard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { profile, clearProfile } = useProfile();

  const alias = profile?.alias ?? '???';
  const userRanking = mockRankingGeneral.find(r => r.alias === alias);
  const position = userRanking?.position ?? '-';
  const points = userRanking?.points ?? 0;

  const getPositionBadge = (pos: number | string) => {
    if (pos === 1) return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', label: '🥇' };
    if (pos === 2) return { bg: 'bg-gray-400/15', border: 'border-gray-400/30', text: 'text-gray-300', label: '🥈' };
    if (pos === 3) return { bg: 'bg-orange-600/15', border: 'border-orange-600/30', text: 'text-orange-400', label: '🥉' };
    return { bg: 'bg-accent/10', border: 'border-accent/20', text: 'text-accent', label: `#${pos}` };
  };

  const posStyle = getPositionBadge(position);

  return (
    <Card borderTopColor="cupGreen">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-11 h-11 rounded-xl ${posStyle.bg} border ${posStyle.border} flex items-center justify-center shrink-0`}>
          <span className="text-xl">{posStyle.label}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-textMuted text-xs mb-0.5">Tu perfil</p>
          <h2 className="text-textLight text-lg font-bold truncate">{alias}</h2>
        </div>
        {profile?.role === 'admin' && (
          <Badge variant="warning">Admin</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-primary/40 rounded-xl p-4 border border-white/[0.06]">
          <p className="text-textMuted text-xs mb-1">Puntos</p>
          <p className="text-textLight text-2xl font-bold">{points}</p>
        </div>
        <div className="bg-primary/40 rounded-xl p-4 border border-white/[0.06]">
          <p className="text-textMuted text-xs mb-1">Posición</p>
          <p className="text-textLight text-2xl font-bold">#{position}</p>
        </div>
      </div>

      {isAuthenticated && (
        <button
          onClick={() => navigate('/predicciones')}
          className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-textLight text-sm font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2"
        >
          Ver mis predicciones
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <div className="flex gap-4 pt-3 mt-3 border-t border-white/[0.06]">
        <button
          onClick={() => {
            clearProfile();
            navigate('/');
            window.location.reload();
          }}
          className="text-xs text-textMuted/60 hover:text-red-400/80 transition-colors"
        >
          Borrar mis datos
        </button>
        {profile?.role !== 'admin' && (
          <button
            onClick={() => {
              const updated = { ...profile, role: 'admin' as const };
              localStorage.setItem('prode_profile', JSON.stringify(updated));
              window.location.reload();
            }}
            className="text-xs text-textMuted/60 hover:text-yellow-400/80 transition-colors ml-auto"
          >
            Dev: admin
          </button>
        )}
      </div>
    </Card>
  );
}
