import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useProfile } from '../../hooks/useProfile';
import { mockRankingGeneral } from '../../data/mocks';

export function ProfileCard() {
  const navigate = useNavigate();
  const { profile, clearProfile } = useProfile();

  const alias = profile?.alias ?? '???';
  const userRanking = mockRankingGeneral.find(r => r.alias === alias);
  const position = userRanking?.position ?? '-';
  const points = userRanking?.points ?? 0;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -translate-y-8 translate-x-8" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-textMuted text-sm mb-1">Hola, 👋</p>
            <h2 className="text-textLight text-xl font-bold">{alias}</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xl font-bold">
            {alias.slice(0, 2)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-primary/50 rounded-xl p-3">
            <p className="text-textMuted text-xs mb-1">Puntos</p>
            <p className="text-textLight text-2xl font-bold">{points}</p>
          </div>
          <div className="bg-primary/50 rounded-xl p-3">
            <p className="text-textMuted text-xs mb-1">Posición</p>
            <p className="text-textLight text-2xl font-bold">#{position}</p>
          </div>
        </div>

        <div className="mt-3">
          <Badge variant="info">Fecha 1 · 2 de 3 predicciones</Badge>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              clearProfile();
              navigate('/');
              window.location.reload();
            }}
            className="text-xs text-textMuted hover:text-red-400 transition-colors underline"
          >
            Borrar mis datos de prueba
          </button>
          {profile?.role !== 'admin' && (
            <button
              onClick={() => {
                const updated = { ...profile, role: 'admin' as const };
                localStorage.setItem('prode_profile', JSON.stringify(updated));
                window.location.reload();
              }}
              className="text-xs text-textMuted hover:text-yellow-400 transition-colors underline"
            >
              Hacerme admin (dev)
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
