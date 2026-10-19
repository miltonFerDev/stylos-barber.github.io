import { useState } from 'react';
import { TableroDireccion } from './TableroDireccion';
import { AgendaTesorería } from './AgendaTesorería';

type View = 'tablero' | 'agenda';

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? 'bg-accent text-white' : 'text-textMuted hover:text-textLight'
      }`}
    >
      {children}
    </button>
  );
}

export function FinanzasShell() {
  const [view, setView] = useState<View>('tablero');

  return (
    <div className="min-h-screen">
      <nav className="border-b border-accentMuted bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <span className="font-bold text-textLight">Finanzas</span>
          <div className="flex gap-1">
            <TabButton active={view === 'tablero'} onClick={() => setView('tablero')}>
              Tablero
            </TabButton>
            <TabButton active={view === 'agenda'} onClick={() => setView('agenda')}>
              Agenda
            </TabButton>
          </div>
        </div>
      </nav>
      {view === 'tablero' ? <TableroDireccion /> : <AgendaTesorería />}
    </div>
  );
}
