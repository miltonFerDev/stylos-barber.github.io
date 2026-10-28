import { useCallback, useEffect, useState } from 'react';
import { getFinanzasAccessToken } from '../presentation/client';

type Barber = { id: string; displayName: string };
type Account = { id: string; name: string };
type Period = { id: string; code: string };
type Balance = { barberId: string; pending: { amount: string; currency: string } };
type ComisionesPayload = { barbers: Barber[]; accounts: Account[]; periods: Period[]; balances: Balance[] };

const inputClass =
  'w-full rounded-lg border border-finBorder bg-finSurface px-4 py-3 text-base text-finText placeholder:text-finMuted focus:border-finAccent focus:outline-none';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNum(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function formatMoney(amount: string, currency: string): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount));
}

export function Comisiones() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [payload, setPayload] = useState<ComisionesPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Devengo
  const [barberId, setBarberId] = useState('');
  const [amount, setAmount] = useState('');
  const [devDate, setDevDate] = useState(today());
  const [devPeriodId, setDevPeriodId] = useState('');

  // Pago
  const [payFor, setPayFor] = useState<string | null>(null);
  const [distributions, setDistributions] = useState<Record<string, string>>({});
  const [payDate, setPayDate] = useState(today());
  const [payPeriodId, setPayPeriodId] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getFinanzasAccessToken();
    if (!token) {
      setStatus('error');
      return;
    }
    const res = await fetch('/api/finanzas/comisiones', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setStatus('error');
      return;
    }
    const data: ComisionesPayload = await res.json();
    setPayload(data);
    setDevPeriodId((prev) => prev || (data.periods?.[0]?.id ?? ''));
    setPayPeriodId((prev) => prev || (data.periods?.[0]?.id ?? ''));
    setStatus('ready');
  }, []);

  useEffect(() => {
    load().catch(() => setStatus('error'));
  }, [load]);

  function pendingOf(barberId: string): number {
    const b = payload?.balances.find((x) => x.barberId === barberId);
    return toNum(b?.pending.amount ?? '0');
  }

  async function onDevengar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    const token = await getFinanzasAccessToken();
    const res = await fetch('/api/finanzas/comisiones/devengar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ barberId, amount, currency: 'ARS', effectiveDate: devDate, periodId: devPeriodId }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSuccess('Comisión devengada.');
      setAmount('');
      load().catch(() => setStatus('error'));
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.message || 'No se pudo devengar.');
    }
  }

  async function onPagar(barberId: string) {
    setPayError(null);
    setSubmitting(true);
    const token = await getFinanzasAccessToken();
    const dists = payload!.accounts
      .map((a) => ({ accountId: a.id, amount: distributions[a.id] || '' }))
      .filter((d) => toNum(d.amount) > 0);
    const res = await fetch('/api/finanzas/comisiones/pagar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ barberId, effectiveDate: payDate, periodId: payPeriodId, distributions: dists, currency: 'ARS' }),
    });
    setSubmitting(false);
    if (res.ok) {
      setPayFor(null);
      setDistributions({});
      setSuccess('Comisión pagada.');
      load().catch(() => setStatus('error'));
    } else {
      const err = await res.json().catch(() => null);
      setPayError(err?.message || 'No se pudo pagar.');
    }
  }

  if (status === 'loading') {
    return <div className="p-8 text-center text-finMuted">Cargando comisiones…</div>;
  }
  if (status === 'error' || !payload) {
    return <div className="p-8 text-center text-finDanger">No se pudo cargar la pantalla de comisiones.</div>;
  }

  const pendientes = payload.barbers.filter((b) => pendingOf(b.id) > 0);
  const payPending = payFor ? pendingOf(payFor) : 0;
  const payDistributed = round2(payload.accounts.reduce((s, a) => s + toNum(distributions[a.id] || ''), 0));
  const payRemaining = round2(payPending - payDistributed);
  const canPay = payPending > 0 && payRemaining === 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-finText">Comisiones</h1>
        <p className="mt-1 text-base text-finMuted">Devengá la comisión del día y pagá a cada barbero.</p>
      </header>

      {success && <p className="mb-4 rounded-lg bg-finPositive/10 px-4 py-3 text-base text-finPositive">{success}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-finDanger/10 px-3 py-2 text-base text-finDanger">{error}</p>}

      <form onSubmit={onDevengar} className="mb-8 space-y-3 rounded-xl border border-finBorder bg-finSurface p-4">
        <p className="text-base font-semibold text-finText">Devengar comisión</p>
        {field('Barbero', (
          <select className={inputClass} value={barberId} onChange={(e) => setBarberId(e.target.value)} required>
            <option value="">Elegí…</option>
            {payload.barbers.map((b) => (
              <option key={b.id} value={b.id}>{b.displayName}</option>
            ))}
          </select>
        ))}
        {field('Monto (ARS)', (
          <input className={inputClass} type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        ))}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {field('Fecha', <input className={inputClass} type="date" value={devDate} onChange={(e) => setDevDate(e.target.value)} required />)}
          {field('Período', (
            <select className={inputClass} value={devPeriodId} onChange={(e) => setDevPeriodId(e.target.value)} required>
              <option value="">Elegí…</option>
              {payload.periods.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
            </select>
          ))}
        </div>
        <button type="submit" disabled={submitting || !barberId || !(toNum(amount) > 0)} className="min-h-12 w-full rounded-lg bg-finAccent px-4 py-3 text-base font-semibold text-white hover:bg-finAccentHover disabled:opacity-50">
          {submitting ? 'Guardando…' : 'Devengar'}
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-finText">Saldos pendientes</h2>
        {pendientes.length === 0 ? (
          <p className="text-finMuted">Sin comisiones pendientes de pago.</p>
        ) : (
          <ul className="space-y-2">
            {pendientes.map((b) => {
              const pending = pendingOf(b.id);
              return (
                <li key={b.id} className="rounded-xl border border-finBorder bg-finSurface px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-medium text-finText">{b.displayName}</p>
                      <p className="text-sm text-finMuted">Pendiente {formatMoney(pending.toFixed(2), 'ARS')}</p>
                    </div>
                    {payFor !== b.id && (
                      <button type="button" onClick={() => { setPayFor(b.id); setDistributions({}); setPayError(null); }} className="min-h-12 rounded-lg border border-finBorder px-3 text-base font-semibold text-finAccent hover:bg-finBorder/60">
                        Pagar
                      </button>
                    )}
                  </div>

                  {payFor === b.id && (
                    <div className="mt-3 space-y-3 border-t border-finBorder pt-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {field('Fecha', <input className={inputClass} type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />)}
                        {field('Período', (
                          <select className={inputClass} value={payPeriodId} onChange={(e) => setPayPeriodId(e.target.value)} required>
                            <option value="">Elegí…</option>
                            {payload.periods.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
                          </select>
                        ))}
                      </div>
                      {payload.accounts.map((a) => (
                        <div key={a.id}>
                          <label className="mb-1 block text-sm font-medium text-finText">{a.name} (ARS)</label>
                          <input
                            className={inputClass}
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={distributions[a.id] || ''}
                            onChange={(e) => setDistributions((prev) => ({ ...prev, [a.id]: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                      ))}
                      <p className={`text-base ${payRemaining === 0 ? 'text-finPositive' : 'text-finDanger'}`}>
                        {payRemaining === 0 ? 'Distribución completa.' : `Restante por distribuir: $${payRemaining.toFixed(2)}`}
                      </p>
                      {payError && <p role="alert" className="rounded-lg bg-finDanger/10 px-3 py-2 text-base text-finDanger">{payError}</p>}
                      <div className="flex gap-2">
                        <button type="button" disabled={submitting || !canPay} onClick={() => onPagar(b.id)} className="min-h-12 flex-1 rounded-lg bg-finAccent px-4 py-3 text-base font-semibold text-white hover:bg-finAccentHover disabled:opacity-50">
                          {submitting ? 'Pagando…' : 'Confirmar pago'}
                        </button>
                        <button type="button" onClick={() => { setPayFor(null); setDistributions({}); }} className="min-h-12 rounded-lg border border-finBorder px-4 py-3 text-base font-semibold text-finMuted hover:text-finText">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
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
