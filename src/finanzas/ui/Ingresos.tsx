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

export function Ingresos() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [payload, setPayload] = useState<IngresosPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [serviceAmount, setServiceAmount] = useState('');
  const [productAmount, setProductAmount] = useState('');
  const [accountId, setAccountId] = useState('');
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    // shortcut: reparte el total en una sola cuenta receptora. Multi-cuenta se agrega si el negocio lo pide.
    const total = (Number(serviceAmount || '0') + Number(productAmount || '0')).toFixed(2);

    const token = await getFinanzasAccessToken();
    const res = await fetch('/api/finanzas/ingresos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        serviceAmount,
        productAmount,
        distributions: [{ accountId, amount: total }],
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

  const total = (Number(serviceAmount || '0') + Number(productAmount || '0')).toFixed(2);
  const canSubmit = Boolean(accountId) && Number(total) > 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-finText">Ingresos</h1>
        <p className="mt-1 text-base text-finMuted">Registro diario de servicios y productos.</p>
      </header>

      {success && (
        <p className="mb-4 rounded-lg bg-finPositive/10 px-4 py-3 text-base text-finPositive">{success}</p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {field('Servicios', (
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              value={serviceAmount}
              onChange={(e) => setServiceAmount(e.target.value)}
              placeholder="0.00"
            />
          ))}
          {field('Productos', (
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              value={productAmount}
              onChange={(e) => setProductAmount(e.target.value)}
              placeholder="0.00"
            />
          ))}
        </div>

        <p className="text-base text-finMuted">
          Total: <span className="font-semibold text-finText">{total}</span>
        </p>

        {field('Cuenta receptora', (
          <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
            <option value="">Elegí…</option>
            {payload.accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        ))}

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
