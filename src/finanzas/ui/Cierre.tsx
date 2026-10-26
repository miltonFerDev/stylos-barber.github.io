import { useCallback, useEffect, useState } from 'react';
import { getFinanzasAccessToken } from '../presentation/client';

type Account = { id: string; name: string; currency: string };
type Reconciliacion = {
  id: string;
  accountName: string;
  asOf: string;
  theoreticalBalance: { amount: string; currency: string };
  realBalance: { amount: string; currency: string };
  difference: { amount: string; currency: string };
  isShortfall: boolean;
};
type CierresPayload = {
  accounts: Account[];
  periods: { id: string; code: string }[];
  reconciliations: Reconciliacion[];
};

const inputClass =
  'w-full rounded-lg border border-finBorder bg-finSurface px-4 py-3 text-base text-finText placeholder:text-finMuted focus:border-finAccent focus:outline-none';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(amount: { amount: string; currency: string }): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: amount.currency,
    minimumFractionDigits: 2,
  }).format(Number(amount.amount));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function Cierre() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [payload, setPayload] = useState<CierresPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [accountId, setAccountId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [closingDate, setClosingDate] = useState(today());
  const [realBalance, setRealBalance] = useState('');

  const [resolverFor, setResolverFor] = useState<string | null>(null);
  const [resolution, setResolution] = useState<'AJUSTE' | 'EXPLICADA'>('AJUSTE');
  const [reason, setReason] = useState('');
  const [resolSubmitting, setResolSubmitting] = useState(false);
  const [resolError, setResolError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getFinanzasAccessToken();
    if (!token) {
      setStatus('error');
      return;
    }
    const res = await fetch('/api/finanzas/cierres', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 403) {
      setStatus('forbidden');
      return;
    }
    if (!res.ok) {
      setStatus('error');
      return;
    }
    const data: CierresPayload = await res.json();
    setPayload(data);
    setPeriodId((prev) => prev || (data.periods?.[0]?.id ?? ''));
    setStatus('ready');
  }, []);

  useEffect(() => {
    load().catch(() => setStatus('error'));
  }, [load]);

  async function onRegistrarCierre(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    const account = payload?.accounts.find((a) => a.id === accountId);
    const token = await getFinanzasAccessToken();
    const res = await fetch('/api/finanzas/cierres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        accountId,
        periodId,
        closingDate,
        realBalance,
        currency: account?.currency ?? 'ARS',
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSuccess(true);
      setRealBalance('');
      load().catch(() => setStatus('error'));
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.message || 'No se pudo registrar el cierre.');
    }
  }

  async function onResolver(id: string) {
    setResolError(null);
    setResolSubmitting(true);
    const token = await getFinanzasAccessToken();
    const res = await fetch(`/api/finanzas/reconciliaciones/${id}/resolver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ resolution, reason: reason.trim() }),
    });
    setResolSubmitting(false);
    if (res.ok) {
      setResolverFor(null);
      setReason('');
      load().catch(() => setStatus('error'));
    } else {
      const err = await res.json().catch(() => null);
      setResolError(err?.message || 'No se pudo resolver la diferencia.');
    }
  }

  if (status === 'loading') {
    return <div className="p-8 text-center text-finMuted">Cargando cierre…</div>;
  }
  if (status === 'forbidden') {
    return (
      <div className="p-8 text-center">
        <p className="mb-2 text-lg text-finText">Cierre y conciliación</p>
        <p className="text-finMuted">No tenés permiso para conciliar cuentas (solo Tesorería).</p>
      </div>
    );
  }
  if (status === 'error' || !payload) {
    return <div className="p-8 text-center text-finDanger">No se pudo cargar la pantalla de cierre.</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-finText">Cierre diario</h1>
        <p className="mt-1 text-base text-finMuted">Compará el saldo real contra el teórico de cada cuenta</p>
      </header>

      {success && (
        <p className="mb-4 rounded-lg bg-finPositive/10 px-4 py-3 text-base text-finPositive">Cierre registrado.</p>
      )}

      <form onSubmit={onRegistrarCierre} className="space-y-4">
        {field('Cuenta', (
          <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
            <option value="">Elegí…</option>
            {payload.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        ))}
        {field('Período', (
          <select className={inputClass} value={periodId} onChange={(e) => setPeriodId(e.target.value)} required>
            <option value="">Elegí…</option>
            {payload.periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </select>
        ))}
        {field('Fecha de cierre', (
          <input
            className={inputClass}
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            required
          />
        ))}
        {field('Saldo real', (
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={realBalance}
            onChange={(e) => setRealBalance(e.target.value)}
            required
          />
        ))}

        {error && (
          <p role="alert" className="rounded-lg bg-finDanger/10 px-3 py-2 text-base text-finDanger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !accountId || !periodId}
          className="min-h-12 w-full rounded-lg bg-finAccent px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-finAccentHover disabled:opacity-50"
        >
          {submitting ? 'Cerrando…' : 'Registrar cierre'}
        </button>
      </form>

      {payload.reconciliations.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-finText">
            Diferencias pendientes ({payload.reconciliations.length})
          </h2>
          <ul className="space-y-2">
            {payload.reconciliations.map((r) => (
              <li key={r.id} className="rounded-xl border border-finBorder bg-finSurface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-medium text-finText">{r.accountName}</p>
                    <p className="text-sm text-finMuted">
                      {formatDate(r.asOf)} · teórico {formatMoney(r.theoreticalBalance)} · real{' '}
                      {formatMoney(r.realBalance)}
                    </p>
                    <p className={`text-base font-semibold ${r.isShortfall ? 'text-finDanger' : 'text-finPositive'}`}>
                      {r.isShortfall ? 'Faltante' : 'Sobrante'} {formatMoney(r.difference)}
                    </p>
                  </div>
                  {resolverFor === r.id ? (
                    <span className="text-sm font-semibold text-finMuted">Resolviendo…</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setResolverFor(r.id);
                        setResolution('AJUSTE');
                        setReason('');
                        setResolError(null);
                      }}
                      className="min-h-12 rounded-lg border border-finBorder px-3 text-base font-semibold text-finAccent hover:bg-finBorder/60"
                    >
                      Resolver
                    </button>
                  )}
                </div>

                {resolverFor === r.id && (
                  <form
                    className="mt-3 space-y-3 border-t border-finBorder pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onResolver(r.id);
                    }}
                  >
                    <div className="flex gap-2" role="radiogroup" aria-label="Tipo de resolución">
                      {(['AJUSTE', 'EXPLICADA'] as const).map((t) => (
                        <label
                          key={t}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-finBorder px-3 py-3 text-base font-semibold text-finText"
                        >
                          <input
                            type="radio"
                            name={`resolution-${r.id}`}
                            value={t}
                            checked={resolution === t}
                            onChange={() => setResolution(t)}
                            className="h-4 w-4"
                          />
                          {t === 'AJUSTE' ? 'Ajuste' : 'Explicada'}
                        </label>
                      ))}
                    </div>
                    {field('Motivo', (
                      <input
                        className={inputClass}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="¿Por qué la diferencia?"
                        required
                      />
                    ))}
                    {resolError && (
                      <p role="alert" className="rounded-lg bg-finDanger/10 px-3 py-2 text-base text-finDanger">
                        {resolError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={resolSubmitting || !reason.trim()}
                        className="min-h-12 flex-1 rounded-lg bg-finAccent px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-finAccentHover disabled:opacity-50"
                      >
                        {resolSubmitting ? 'Resolviendo…' : 'Confirmar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setResolverFor(null)}
                        className="min-h-12 rounded-lg border border-finBorder px-4 py-3 text-base font-semibold text-finMuted hover:text-finText"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function field(label: string, children: React.ReactNode) {
  return (
    <div>
      <label className="mb-1 block text-base font-medium text-finText">{label}</label>
      {children}
    </div>
  );
}
