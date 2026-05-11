import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

export function ProfileCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id ?? null);

  const alias = profile?.alias ?? '???';

  return (
    <Card borderTopColor="cupGreen">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0`}>
          <span className="text-xl">🎯</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-textMuted text-xs mb-0.5">Tu perfil</p>
          <h2 className="text-textLight text-lg font-bold truncate">{alias}</h2>
        </div>
        {profile?.role === 'admin' && (
          <Badge variant="warning">Admin</Badge>
        )}
      </div>

      {user && (
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
    </Card>
  );
}