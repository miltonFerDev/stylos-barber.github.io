import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { mockProfile, mockRankingGeneral } from '../../data/mocks';

export function ProfileCard() {
  const userRanking = mockRankingGeneral.find(r => r.alias === mockProfile.alias);
  const position = userRanking?.position ?? '-';
  const points = userRanking?.points ?? 0;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -translate-y-8 translate-x-8" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-textMuted text-sm mb-1">Hola, 👋</p>
            <h2 className="text-textLight text-xl font-bold">{mockProfile.alias}</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xl font-bold">
            {mockProfile.alias.slice(0, 2)}
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
      </div>
    </Card>
  );
}
