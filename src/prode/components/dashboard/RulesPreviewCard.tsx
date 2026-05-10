import React from 'react';
import { Card } from '../ui/Card';
import { useNavigate } from 'react-router-dom';

export function RulesPreviewCard() {
  const navigate = useNavigate();

  return (
    <Card onClick={() => navigate('/reglas')} className="cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-textLight font-semibold text-sm">Reglas y Premios</h3>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-textMuted">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-cupGreen mt-0.5">•</span>
          <p className="text-textMuted">Resultado exacto: <span className="text-textLight font-medium">3 pts</span></p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-cupGreen mt-0.5">•</span>
          <p className="text-textMuted">Ganador correcto: <span className="text-textLight font-medium">1 pt</span></p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-cupYellow/8 rounded-xl border border-cupYellow/15">
        <p className="text-cupYellow text-xs font-semibold mb-0.5">Premio final</p>
        <p className="text-textLight text-base font-bold">Gift card $100.000</p>
      </div>
    </Card>
  );
}
