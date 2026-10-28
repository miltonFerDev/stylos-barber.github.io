import { lazy, Suspense, useEffect, useState } from 'react';
import { finanzasSupabase } from '../presentation/client';
import { FinanzasNav, type FinanzasView } from './FinanzasNav';
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
const Cierre = lazy(() =>
  import('./Cierre').then((m) => ({ default: m.Cierre }))
);
const Fondos = lazy(() =>
  import('./Fondos').then((m) => ({ default: m.Fondos }))
);
const Inversiones = lazy(() =>
  import('./Inversiones').then((m) => ({ default: m.Inversiones }))
);
const Transferencias = lazy(() =>
  import('./Transferencias').then((m) => ({ default: m.Transferencias }))
);
const Ingresos = lazy(() =>
  import('./Ingresos').then((m) => ({ default: m.Ingresos }))
);
const Comisiones = lazy(() =>
  import('./Comisiones').then((m) => ({ default: m.Comisiones }))
);

export function FinanzasShell() {
  const [view, setView] = useState<FinanzasView>('tablero');
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
    <div className="flex min-h-screen flex-col md:flex-row">
      <FinanzasNav view={view} onChange={setView} />
      <main className="min-w-0 flex-1">
        <Suspense fallback={<div className="p-8 text-center text-finMuted">Cargando…</div>}>
          {view === 'tablero' ? (
            <TableroDireccion />
          ) : view === 'agenda' ? (
            <AgendaTesorería />
          ) : view === 'nueva' ? (
            <AltaObligacion />
          ) : view === 'pagar' ? (
            <RegistrarPago />
          ) : view === 'cierre' ? (
            <Cierre />
          ) : view === 'fondos' ? (
            <Fondos />
          ) : view === 'inversiones' ? (
            <Inversiones />
          ) : view === 'transferencias' ? (
            <Transferencias />
          ) : view === 'comisiones' ? (
            <Comisiones />
          ) : (
            <Ingresos />
          )}
        </Suspense>
      </main>
    </div>
  );
}
