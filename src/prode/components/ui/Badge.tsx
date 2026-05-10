import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'cup' | 'pending' | 'closed' | 'scored' | 'locked';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/15 text-red-400 border-red-500/20',
    info: 'bg-accent/15 text-accent border-accent/20',
    neutral: 'bg-white/5 text-textMuted border-white/10',
    cup: 'bg-cupOrange/15 text-cupOrange border-cupOrange/20',
    pending: 'bg-cupYellow/15 text-cupYellow border-cupYellow/20',
    closed: 'bg-white/5 text-textMuted border-white/10',
    scored: 'bg-cupGreen/15 text-cupGreen border-cupGreen/20',
    locked: 'bg-cupOrange/15 text-cupOrange border-cupOrange/20',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
