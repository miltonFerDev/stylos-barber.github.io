import type { AvailabilityReport, ObligationsReport } from '../application/reports-service';
import { useFinanzasFetch } from './useFinanzasFetch';

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

type DashboardData = { availability: AvailabilityReport; obligations: ObligationsReport };

export function TableroDireccion() {
  const { status, data } = useFinanzasFetch<DashboardData>('/api/finanzas/dashboard');

  if (status === 'loading') {
    return <div className="p-8 text-center text-finMuted">Cargando tablero…</div>;
  }
  if (status === 'unauthenticated') {
    return (
      <div className="p-8 text-center">
        <p className="mb-2 text-lg text-finText">Finanzas de Stylo's Barber</p>
        <p className="text-finMuted">Iniciá sesión para ver el tablero.</p>
      </div>
    );
  }
  if (status === 'error' || !data) {
    return <div className="p-8 text-center text-finDanger">No se pudo cargar el tablero.</div>;
  }

  const { availability, obligations } = data;
  const overdueFirst = [...obligations.lines].sort(
    (a, b) => Number(b.isOverdue) - Number(a.isOverdue)
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-finText">Tablero</h1>
        <p className="mt-1 text-base text-finMuted">Disponibilidad y obligaciones</p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-finText">Disponibilidad</h2>
        <div className="rounded-xl border border-finBorder bg-finSurface p-5">
          <p className="text-4xl font-bold text-finPositive">
            {formatMoney(availability.totalAvailable)}
          </p>
          <p className="mt-1 text-base text-finMuted">Total disponible</p>
        </div>

        <ul className="mt-3 space-y-2">
          {availability.lines.map((line) => (
            <li
              key={line.accountId}
              className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-finBorder bg-finSurface px-4 py-3"
            >
              <span className="min-w-0 break-words text-base font-medium text-finText">
                {line.name}
              </span>
              <span className={line.isAvailable ? 'text-finText' : 'text-finMuted'}>
                {formatMoney(line.balance)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-finText">Obligaciones</h2>
        {overdueFirst.length === 0 ? (
          <p className="text-finMuted">Sin obligaciones cargadas.</p>
        ) : (
          <ul className="space-y-2">
            {overdueFirst.map((o) => (
              <li
                key={o.id}
                className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-finBorder bg-finSurface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="break-words text-base font-medium text-finText">{o.concept}</p>
                  <p className="text-base text-finMuted">{formatDate(o.dueDate)}</p>
                </div>
                <span className={o.isOverdue ? 'font-semibold text-finDanger' : 'text-finText'}>
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
