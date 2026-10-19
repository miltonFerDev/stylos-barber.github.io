import type { ObligationLine, ObligationsReport } from '../application/reports-service';
import { useFinanzasFetch } from './useFinanzasFetch';

type Money = { amount: string; currency: string };

const ACTIVE_STATUSES = new Set(['PENDIENTE', 'PROGRAMADA', 'PARCIAL', 'VENCIDA']);
const PRIORITY_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

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

function sortAgenda(lines: ObligationLine[]): ObligationLine[] {
  return [...lines].sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) ||
      (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
  );
}

function ObligacionItem({ o }: { o: ObligationLine }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-textLight">{o.concept}</p>
        <p className="text-xs text-textMuted">
          vence {formatDate(o.dueDate)}
          {o.expectedPaymentDate ? ` · pagar ${formatDate(o.expectedPaymentDate)}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="rounded-full bg-accentMuted px-2 py-0.5 text-xs font-semibold text-accent">
          {o.priority}
        </span>
        <span className={o.isOverdue ? 'font-semibold text-cupOrange' : 'text-textLight'}>
          {formatMoney(o.amount)}
        </span>
      </div>
    </li>
  );
}

type AgendaData = { obligations: ObligationsReport };

export function AgendaTesorería() {
  const { status, data } = useFinanzasFetch<AgendaData>('/api/finanzas/agenda');

  if (status === 'loading') {
    return <div className="p-8 text-center text-textMuted">Cargando agenda…</div>;
  }
  if (status === 'unauthenticated') {
    return (
      <div className="p-8 text-center">
        <p className="text-lg text-textLight mb-2">Finanzas de Stylo's Barber</p>
        <p className="text-textMuted">Iniciá sesión para ver la agenda.</p>
      </div>
    );
  }
  if (status === 'error' || !data) {
    return <div className="p-8 text-center text-cupOrange">No se pudo cargar la agenda.</div>;
  }

  const active = sortAgenda(data.obligations.lines.filter((o) => ACTIVE_STATUSES.has(o.status)));
  const vencidas = active.filter((o) => o.isOverdue);
  const proximas = active.filter((o) => !o.isOverdue);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-textLight">Agenda · Tesorería</h1>
        <p className="mt-1 text-sm text-textMuted">Vencimientos ordenados por fecha y prioridad</p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-cupOrange">
          Vencidas ({vencidas.length})
        </h2>
        {vencidas.length === 0 ? (
          <p className="text-textMuted">Sin obligaciones vencidas.</p>
        ) : (
          <ul className="space-y-2">
            {vencidas.map((o) => (
              <ObligacionItem key={o.id} o={o} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-textLight">
          Próximas ({proximas.length})
        </h2>
        {proximas.length === 0 ? (
          <p className="text-textMuted">Sin obligaciones próximas.</p>
        ) : (
          <ul className="space-y-2">
            {proximas.map((o) => (
              <ObligacionItem key={o.id} o={o} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
