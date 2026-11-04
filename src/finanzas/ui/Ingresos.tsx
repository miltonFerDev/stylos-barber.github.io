import { useCallback, useEffect, useState } from 'react';
import { getFinanzasAccessToken } from '../presentation/client';

type Account = { id: string; name: string };
type Period = { id: string; code: string };
type IngresosPayload = { accounts: Account[]; periods: Period[] };

type HistorialIncome = {
  id: string;
  effectiveDate: string;
  serviceAmount: { amount: string; currency: string };
  productAmount: { amount: string; currency: string };
};
type HistorialPayload = { incomes: HistorialIncome[]; periods: Period[] };

const inputClass =
  'w-full rounded-lg border border-finBorder bg-finSurface px-4 py-3 text-base text-finText placeholder:text-finMuted focus:border-finAccent focus:outline-none';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(amount: string, currency: string): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
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

  const [historial, setHistorial] = useState<HistorialPayload | null>(null);
  const [revertFor, setRevertFor] = useState<string | null>(null);
  const [revertReason, setRevertReason] = useState('');
  const [revertDate, setRevertDate] = useState(today());
  const [revertPeriodId, setRevertPeriodId] = useState('');
  const [revertSubmitting, setRevertSubmitting] = useState(false);
  const [revertError, setRevertError] = useState<string | null>(null);

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

  const loadHistorial = useCallback(async () => {
    const token = await getFinanzasAccessToken();
    if (!token) {
      setHistorial(null);
      return;
    }
    const res = await fetch('/api/finanzas/ingresos/historial', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setHistorial(null);
      return;
    }
    const data: HistorialPayload = await res.json();
    setHistorial(data);
    setRevertPeriodId((prev) => prev || (data.periods?.[0]?.id ?? ''));
  }, []);

  useEffect(() => {
    loadHistorial().catch(() => setHistorial(null));
  }, [loadHistorial]);

  async function onRevert(incomeId: string) {
    setRevertError(null);
    setRevertSubmitting(true);
    const token = await getFinanzasAccessToken();
    const res = await fetch(`/api/finanzas/ingresos/${incomeId}/revertir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: revertReason.trim(), periodId: revertPeriodId, reversalDate: revertDate }),
    });
    setRevertSubmitting(false);
    if (res.ok) {
      setRevertFor(null);
      setRevertReason('');
      loadHistorial().catch(() => setHistorial(null));
    } else {
      const err = await res.json().catch(() => null);
      setRevertError(err?.message || 'No se pudo revertir el ingreso.');
    }
  }

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

      {historial && historial.incomes.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-finText">Ingresos recientes</h2>
          <ul className="space-y-2">
            {historial.incomes.map((i) => {
              const total = Number(i.serviceAmount.amount) + Number(i.productAmount.amount);
              return (
                <li key={i.id} className="rounded-xl border border-finBorder bg-finSurface px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-medium text-finText">{formatDate(i.effectiveDate)}</p>
                      <p className="text-sm text-finMuted">{formatMoney(total.toFixed(2), i.serviceAmount.currency)}</p>
                    </div>
                    {revertFor === i.id ? (
                      <span className="text-sm font-semibold text-finMuted">Reversión…</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setRevertFor(i.id);
                          setRevertReason('');
                          setRevertDate(today());
                          setRevertError(null);
                        }}
                        className="min-h-12 rounded-lg border border-finBorder px-3 text-base font-semibold text-finDanger hover:bg-finDanger/10"
                      >
                        Revertir
                      </button>
                    )}
                  </div>

                  {revertFor === i.id && (
                    <form
                      className="mt-3 space-y-3 border-t border-finBorder pt-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        onRevert(i.id);
                      }}
                    >
                      {field('Motivo', (
                        <input
                          className={inputClass}
                          value={revertReason}
                          onChange={(e) => setRevertReason(e.target.value)}
                          placeholder="¿Por qué se revierte?"
                          required
                        />
                      ))}
                      {field('Fecha de reversión', (
                        <input className={inputClass} type="date" value={revertDate} onChange={(e) => setRevertDate(e.target.value)} required />
                      ))}
                      {field('Período', (
                        <select className={inputClass} value={revertPeriodId} onChange={(e) => setRevertPeriodId(e.target.value)} required>
                          <option value="">Elegí…</option>
                          {historial.periods.map((p) => (
                            <option key={p.id} value={p.id}>{p.code}</option>
                          ))}
                        </select>
                      ))}
                      {revertError && (
                        <p role="alert" className="rounded-lg bg-finDanger/10 px-3 py-2 text-base text-finDanger">{revertError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={revertSubmitting || !revertReason.trim() || !revertPeriodId}
                          className="min-h-12 flex-1 rounded-lg bg-finDanger px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-finDanger/90 disabled:opacity-50"
                        >
                          {revertSubmitting ? 'Revirtiendo…' : 'Confirmar reversión'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevertFor(null)}
                          className="min-h-12 rounded-lg border border-finBorder px-4 py-3 text-base font-semibold text-finMuted hover:text-finText"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
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
