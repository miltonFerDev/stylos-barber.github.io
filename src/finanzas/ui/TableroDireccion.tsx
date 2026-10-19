import { useEffect, useState } from 'react';
import type { AvailabilityReport, ObligationsReport } from '../application/reports-service';
import { finanzasSupabase } from '../presentation/client';

type Money = { amount: string; currency: string };

function formatMoney(m: Money): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: m.currency,
    minimumFractionDigits: 2,
  }).format(Number(m.amount));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type Status = 'loading' | 'unauthenticated' | 'error' | 'ready';

export function TableroDireccion() {
  const [status, setStatus] = useState<Status>('loading');
  const [availability, setAvailability] = useState<AvailabilityReport | null>(null);
  const [obligations, setObligations] = useState<ObligationsReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await finanzasSupabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      if (!token) {
        if (!cancelled) setStatus('unauthenticated');
        return;
      }

      const res = await fetch('/api/finanzas/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        if (!cancelled) setStatus('unauthenticated');
        return;
      }
      if (!res.ok) {
        if (!cancelled) setStatus('error');
        return;
      }

      const body = await res.json();
      if (!cancelled) {
        setAvailability(body.availability);
        setObligations(body.obligations);
        setStatus('ready');
      }
    })().catch(() => {
      if (!cancelled) setStatus('error');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return <div className="p-8 text-center text-textMuted">Cargando tablero…</div>;
  }
  if (status === 'unauthenticated') {
    return (
      <div className="p-8 text-center">
        <p className="text-lg text-textLight mb-2">Finanzas de Stylo's Barber</p>
        <p className="text-textMuted">Iniciá sesión para ver el tablero.</p>
      </div>
    );
  }
  if (status === 'error' || !availability || !obligations) {
    return <div className="p-8 text-center text-cupOrange">No se pudo cargar el tablero.</div>;
  }

  const overdueFirst = [...obligations.lines].sort(
    (a, b) => Number(b.isOverdue) - Number(a.isOverdue)
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-textLight">Tablero · Dirección</h1>
        <p className="mt-1 text-sm text-textMuted">Disponibilidad y obligaciones</p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-textLight">Disponibilidad</h2>
        <div className="rounded-card border border-accentMuted bg-surface p-6">
          <p className="text-3xl font-bold text-cupGreen">
            {formatMoney(availability.totalAvailable)}
          </p>
          <p className="mt-1 text-sm text-textMuted">Total disponible</p>
        </div>
        <ul className="mt-4 space-y-2">
          {availability.lines.map((line) => (
            <li
              key={line.accountId}
              className="flex items-center justify-between rounded-xl bg-surface px-4 py-3"
            >
              <span className="text-textLight">{line.name}</span>
              <span className={line.isAvailable ? 'text-textLight' : 'text-textMuted'}>
                {formatMoney(line.balance)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-textLight">Obligaciones</h2>
        {overdueFirst.length === 0 ? (
          <p className="text-textMuted">Sin obligaciones cargadas.</p>
        ) : (
          <ul className="space-y-2">
            {overdueFirst.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between rounded-xl bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-textLight">{o.concept}</p>
                  <p className="text-xs text-textMuted">{formatDate(o.dueDate)}</p>
                </div>
                <span className={o.isOverdue ? 'font-semibold text-cupOrange' : 'text-textLight'}>
                  {formatMoney(o.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
