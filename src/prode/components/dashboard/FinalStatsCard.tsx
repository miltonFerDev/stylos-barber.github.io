import React from 'react';
import { Card } from '../ui/Card';

type Accent = 'accent' | 'emerald' | 'amber';

interface FinalStatsCardProps {
  label: string;
  value: number;
  accent: Accent;
}

const accentStyles: Record<Accent, { tile: string; value: string }> = {
  accent: { tile: 'bg-accent/15 text-accent', value: 'text-accent' },
  emerald: { tile: 'bg-emerald-500/15 text-emerald-400', value: 'text-emerald-400' },
  amber: { tile: 'bg-amber-500/15 text-amber-400', value: 'text-amber-400' },
};

export function FinalStatsCard({ label, value, accent }: FinalStatsCardProps) {
  const styles = accentStyles[accent];
  return (
    <Card className="p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${styles.tile}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className={`text-3xl font-bold tracking-tight ${styles.value}`}>{value}</p>
      <p className="text-textMuted text-sm mt-1">{label}</p>
    </Card>
  );
}