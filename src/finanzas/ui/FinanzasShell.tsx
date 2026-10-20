import { useEffect, useState } from 'react';
import { finanzasSupabase } from '../presentation/client';
import { Login } from './Login';
import { TableroDireccion } from './TableroDireccion';
import { AgendaTesorería } from './AgendaTesorería';
import { AltaObligacion } from './AltaObligacion';

type View = 'tablero' | 'agenda' | 'nueva';

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
      aria-current={active ? 'page' : undefined}
      className={`min-h-12 rounded-lg px-4 text-base font-semibold transition-colors ${
        active
          ? 'bg-finAccent text-white'
          : 'text-finMuted hover:bg-finBorder/60 hover:text-finText'
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
    return <div className="p-8 text-center text-finMuted">Cargando…</div>;
  }
  if (session === false) {
    return <Login />;
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-finBorder bg-finSurface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-lg font-bold text-finText">Finanzas</span>
            <div className="flex flex-wrap gap-1">
              <TabButton active={view === 'tablero'} onClick={() => setView('tablero')}>
                Tablero
              </TabButton>
              <TabButton active={view === 'agenda'} onClick={() => setView('agenda')}>
                Agenda
              </TabButton>
              <TabButton active={view === 'nueva'} onClick={() => setView('nueva')}>
                Nueva
              </TabButton>
            </div>
          </div>
          <button
            type="button"
            onClick={() => finanzasSupabase.auth.signOut()}
            className="min-h-12 rounded-lg px-3 text-base font-semibold text-finMuted transition-colors hover:text-finDanger"
          >
            Salir
          </button>
        </div>
      </nav>
      {view === 'tablero' ? (
        <TableroDireccion />
      ) : view === 'agenda' ? (
        <AgendaTesorería />
      ) : (
        <AltaObligacion />
      )}
    </div>
  );
}
