import { useEffect, useState } from 'react';
import { finanzasSupabase } from '../presentation/client';
import { Login } from './Login';
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
  // null = verificando sesión; boolean = autenticado o no
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    finanzasSupabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSession(Boolean(data.session));
    });

    const { data: sub } = finanzasSupabase.auth.onAuthStateChange((_event, s) => {
      setSession(Boolean(s));
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (session === null) {
    return <div className="p-8 text-center text-textMuted">Cargando…</div>;
  }
  if (session === false) {
    return <Login />;
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-accentMuted bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
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
          <button
            type="button"
            onClick={() => finanzasSupabase.auth.signOut()}
            className="text-sm text-textMuted transition-colors hover:text-textLight"
          >
            Salir
          </button>
        </div>
      </nav>
      {view === 'tablero' ? <TableroDireccion /> : <AgendaTesorería />}
    </div>
  );
}
