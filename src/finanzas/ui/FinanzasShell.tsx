import { lazy, Suspense, useEffect, useState } from 'react';
import { finanzasSupabase } from '../presentation/client';
import { Login } from './Login';
import { TableroDireccion } from './TableroDireccion';

const AgendaTesorería = lazy(() =>
  import('./AgendaTesorería').then((m) => ({ default: m.AgendaTesorería }))
);
const AltaObligacion = lazy(() =>
  import('./AltaObligacion').then((m) => ({ default: m.AltaObligacion }))
);
const RegistrarPago = lazy(() =>
  import('./RegistrarPago').then((m) => ({ default: m.RegistrarPago }))
);

type View = 'tablero' | 'agenda' | 'nueva' | 'pagar';

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
              <TabButton active={view === 'pagar'} onClick={() => setView('pagar')}>
                Pagar
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
      <Suspense fallback={<div className="p-8 text-center text-finMuted">Cargando…</div>}>
        {view === 'tablero' ? (
          <TableroDireccion />
        ) : view === 'agenda' ? (
          <AgendaTesorería />
        ) : view === 'nueva' ? (
          <AltaObligacion />
        ) : (
          <RegistrarPago />
        )}
      </Suspense>
    </div>
  );
}
