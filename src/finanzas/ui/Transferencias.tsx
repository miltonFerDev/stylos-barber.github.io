import { useCallback, useEffect, useState } from 'react';
import { getFinanzasAccessToken } from '../presentation/client';

type Account = { id: string; name: string };
type Period = { id: string; code: string };
type TransferenciasPayload = { accounts: Account[]; periods: Period[] };

type HistorialTransfer = {
  id: string;
  effectiveDate: string;
  amount: { amount: string; currency: string };
  fromAccountName: string;
  toAccountName: string;
};
type HistorialPayload = { transfers: HistorialTransfer[]; periods: Period[] };

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
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Transferencias() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [payload, setPayload] = useState<TransferenciasPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [amount, setAmount] = useState('');

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
      const res = await fetch('/api/finanzas/transferencias', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        if (!cancelled) setStatus('error');
        return;
      }
      const data: TransferenciasPayload = await res.json();
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
    const res = await fetch('/api/finanzas/transferencias/historial', {
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

  async function onRevert(transferId: string) {
    setRevertError(null);
    setRevertSubmitting(true);
    const token = await getFinanzasAccessToken();
    const res = await fetch(`/api/finanzas/transferencias/${transferId}/revertir`, {
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
      setRevertError(err?.message || 'No se pudo revertir la transferencia.');
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const token = await getFinanzasAccessToken();
    const res = await fetch('/api/finanzas/transferencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fromAccountId, toAccountId, amount, currency: 'ARS', effectiveDate, periodId }),
    });
    setSubmitting(false);

    if (res.ok) {
      setSuccess('Transferencia registrada.');
      setAmount('');
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.message || 'No se pudo registrar.');
    }
  }

  if (status === 'loading') {
    return <div className="p-8 text-center text-finMuted">Cargando transferencias…</div>;
  }
  if (status === 'error' || !payload) {
    return <div className="p-8 text-center text-finDanger">No se pudo cargar la pantalla de transferencias.</div>;
  }

  const canSubmit =
    Boolean(fromAccountId) &&
    Boolean(toAccountId) &&
    fromAccountId !== toAccountId &&
    Number(amount) > 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-finText">Transferencias</h1>
        <p className="mt-1 text-base text-finMuted">Mové dinero entre cuentas propias.</p>
      </header>

      {success && (
        <p className="mb-4 rounded-lg bg-finPositive/10 px-4 py-3 text-base text-finPositive">{success}</p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {field('Cuenta de origen', (
          <select className={inputClass} value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} required>
            <option value="">Elegí…</option>
            {payload.accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        ))}

        {field('Cuenta de destino', (
          <select className={inputClass} value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required>
            <option value="">Elegí…</option>
            {payload.accounts
              .filter((a) => a.id !== fromAccountId)
              .map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
          </select>
        ))}

        {field('Monto', (
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
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

        {error && (
          <p role="alert" className="rounded-lg bg-finDanger/10 px-3 py-2 text-base text-finDanger">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="min-h-12 w-full rounded-lg bg-finAccent px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-finAccentHover disabled:opacity-50"
        >
          {submitting ? 'Guardando…' : 'Registrar transferencia'}
        </button>
      </form>

      {historial && historial.transfers.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-finText">Transferencias recientes</h2>
          <ul className="space-y-2">
            {historial.transfers.map((t) => (
              <li key={t.id} className="rounded-xl border border-finBorder bg-finSurface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-medium text-finText">
                      {formatDate(t.effectiveDate)} · {t.fromAccountName} → {t.toAccountName}
                    </p>
                    <p className="text-sm text-finMuted">{formatMoney(t.amount)}</p>
                  </div>
                  {revertFor === t.id ? (
                    <span className="text-sm font-semibold text-finMuted">Reversión…</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRevertFor(t.id);
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

                {revertFor === t.id && (
                  <form
                    className="mt-3 space-y-3 border-t border-finBorder pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onRevert(t.id);
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
