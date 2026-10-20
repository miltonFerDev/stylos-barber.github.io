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
    <li className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-finBorder bg-finSurface px-4 py-3">
      <div className="min-w-0">
        <p className="break-words text-base font-medium text-finText">{o.concept}</p>
        <p className="text-base text-finMuted">
          vence {formatDate(o.dueDate)}
          {o.expectedPaymentDate ? ` · pagar ${formatDate(o.expectedPaymentDate)}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="rounded-full border border-finBorder px-2.5 py-0.5 text-sm font-semibold text-finText">
          Prioridad {o.priority}
        </span>
        <span className={o.isOverdue ? 'font-semibold text-finDanger' : 'text-finText'}>
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
    return <div className="p-8 text-center text-finMuted">Cargando agenda…</div>;
  }
  if (status === 'unauthenticated') {
    return (
      <div className="p-8 text-center">
        <p className="mb-2 text-lg text-finText">Finanzas de Stylo's Barber</p>
        <p className="text-finMuted">Iniciá sesión para ver la agenda.</p>
      </div>
    );
  }
  if (status === 'error' || !data) {
    return <div className="p-8 text-center text-finDanger">No se pudo cargar la agenda.</div>;
  }

  const active = sortAgenda(data.obligations.lines.filter((o) => ACTIVE_STATUSES.has(o.status)));
  const vencidas = active.filter((o) => o.isOverdue);
  const proximas = active.filter((o) => !o.isOverdue);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-finText">Agenda</h1>
        <p className="mt-1 text-base text-finMuted">Vencimientos ordenados por fecha y prioridad</p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-finDanger">Vencidas ({vencidas.length})</h2>
        {vencidas.length === 0 ? (
          <p className="text-finMuted">Sin obligaciones vencidas.</p>
        ) : (
          <ul className="space-y-2">
            {vencidas.map((o) => (
              <ObligacionItem key={o.id} o={o} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-finText">Próximas ({proximas.length})</h2>
        {proximas.length === 0 ? (
          <p className="text-finMuted">Sin obligaciones próximas.</p>
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
