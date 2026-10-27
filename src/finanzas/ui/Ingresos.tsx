import { useEffect, useState } from 'react';
import { getFinanzasAccessToken } from '../presentation/client';

type Account = { id: string; name: string };
type Period = { id: string; code: string };
type IngresosPayload = { accounts: Account[]; periods: Period[] };

const inputClass =
  'w-full rounded-lg border border-finBorder bg-finSurface px-4 py-3 text-base text-finText placeholder:text-finMuted focus:border-finAccent focus:outline-none';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNum(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// Redondea a 2 decimales (ARS) para comparar total vs distribuido sin ruido de float.
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function Ingresos() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [payload, setPayload] = useState<IngresosPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [serviceAmount, setServiceAmount] = useState('');
  const [productAmount, setProductAmount] = useState('');
  const [distributions, setDistributions] = useState<Record<string, string>>({});
  const [periodId, setPeriodId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getFinanzasAccessToken();
      if (!token) {
        if (!cancelled) setStatus('error');
        return;
      }
      const res = await fetch('/api/finanzas/ingresos', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        if (!cancelled) setStatus('error');
        return;
      }
      const data: IngresosPayload = await res.json();
      if (!cancelled) {
        setPayload(data);
        setPeriodId(data.periods?.[0]?.id ?? '');
        setStatus('ready');
      }
    })().catch(() => {
      if (!cancelled) setStatus('error');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setDist(accountId: string, value: string) {
    setDistributions((prev) => ({ ...prev, [accountId]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const token = await getFinanzasAccessToken();
    const dists = payload!.accounts
      .map((a) => ({ accountId: a.id, amount: distributions[a.id] || '' }))
      .filter((d) => toNum(d.amount) > 0);

    const res = await fetch('/api/finanzas/ingresos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        serviceAmount,
        productAmount,
        distributions: dists,
        currency: 'ARS',
        effectiveDate,
        periodId,
        adjustmentNote: note.trim() || undefined,
      }),
    });
    setSubmitting(false);

    if (res.ok) {
      setSuccess('Ingreso registrado.');
      setServiceAmount('');
      setProductAmount('');
      setDistributions({});
      setNote('');
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.message || 'No se pudo registrar.');
    }
  }

  if (status === 'loading') {
    return <div className="p-8 text-center text-finMuted">Cargando ingresos…</div>;
  }
  if (status === 'error' || !payload) {
    return <div className="p-8 text-center text-finDanger">No se pudo cargar la pantalla de ingresos.</div>;
  }

  const total = round2(toNum(serviceAmount) + toNum(productAmount));
  const distributed = round2(payload.accounts.reduce((sum, a) => sum + toNum(distributions[a.id] || ''), 0));
  const remaining = round2(total - distributed);
  const canSubmit = total > 0 && remaining === 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-finText">Ingresos</h1>
        <p className="mt-1 text-base text-finMuted">
          Cuánto entró (en pesos) por servicios y productos, y en qué cuentas.
        </p>
      </header>

      {success && (
        <p className="mb-4 rounded-lg bg-finPositive/10 px-4 py-3 text-base text-finPositive">{success}</p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {field('Servicios (ARS)', (
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={serviceAmount}
              onChange={(e) => setServiceAmount(e.target.value)}
              placeholder="0.00"
            />
          ))}
          {field('Productos (ARS)', (
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={productAmount}
              onChange={(e) => setProductAmount(e.target.value)}
              placeholder="0.00"
            />
          ))}
        </div>

        <p className="text-base text-finMuted">
          Total ingresado: <span className="font-semibold text-finText">${total.toFixed(2)}</span>
        </p>

        <section className="rounded-xl border border-finBorder bg-finSurface p-4">
          <p className="mb-1 text-base font-semibold text-finText">Distribución por cuenta</p>
          <p className="mb-3 text-sm text-finMuted">Repartí el total entre las cuentas donde entró la plata.</p>
          <div className="space-y-3">
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
                  onChange={(e) => setDist(a.id, e.target.value)}
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
          <p className={`mt-3 text-base ${remaining === 0 ? 'text-finPositive' : 'text-finDanger'}`}>
            {remaining === 0 ? 'Distribución completa.' : `Restante por distribuir: $${remaining.toFixed(2)}`}
          </p>
        </section>

        {field('Fecha', (
          <input className={inputClass} type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required />
        ))}

        {field('Período', (
          <select className={inputClass} value={periodId} onChange={(e) => setPeriodId(e.target.value)} required>
            <option value="">Elegí…</option>
            {payload.periods.map((p) => (
              <option key={p.id} value={p.id}>{p.code}</option>
            ))}
          </select>
        ))}

        {field('Nota (opcional)', (
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        ))}

        {error && (
          <p role="alert" className="rounded-lg bg-finDanger/10 px-3 py-2 text-base text-finDanger">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="min-h-12 w-full rounded-lg bg-finAccent px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-finAccentHover disabled:opacity-50"
        >
          {submitting ? 'Guardando…' : 'Registrar ingreso'}
        </button>
      </form>
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
