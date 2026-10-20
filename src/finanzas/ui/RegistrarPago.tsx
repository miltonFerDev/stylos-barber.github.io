import { useEffect, useMemo, useState } from 'react';
import { getFinanzasAccessToken } from '../presentation/client';

type Account = { id: string; name: string; currency: string };
type ObligationLine = {
  id: string;
  concept: string;
  dueDate: string;
  pendingAmount: { amount: string; currency: string };
  status: string;
};
type PendientesPayload = {
  obligations: { lines: ObligationLine[]; currency: string };
  accounts: Account[];
  periods: { id: string; code: string }[];
  resultLines: { id: string; name: string }[];
};

type Mode = 'aplicado' | 'egreso';

const inputClass =
  'w-full rounded-lg border border-finBorder bg-finSurface px-4 py-3 text-base text-finText placeholder:text-finMuted focus:border-finAccent focus:outline-none';

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RegistrarPago() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [payload, setPayload] = useState<PendientesPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [mode, setMode] = useState<Mode>('aplicado');
  const [accountId, setAccountId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [periodId, setPeriodId] = useState('');
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [concept, setConcept] = useState('');
  const [resultLineId, setResultLineId] = useState('');
  const [directAmount, setDirectAmount] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getFinanzasAccessToken();
      if (!token) {
        if (!cancelled) setStatus('error');
        return;
      }
      const res = await fetch('/api/finanzas/pagos', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        if (!cancelled) setStatus('error');
        return;
      }
      const data: PendientesPayload = await res.json();
      if (!cancelled) {
        const lines: ObligationLine[] = data.obligations?.lines ?? [];
        setPayload({ ...data, obligations: { ...data.obligations, lines } });
        setPeriodId(data.periods?.[0]?.id ?? '');
        setApplied(Object.fromEntries(lines.map((l) => [l.id, l.pendingAmount.amount])));
        setStatus('ready');
      }
    })().catch(() => {
      if (!cancelled) setStatus('error');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const lines = payload?.obligations.lines ?? [];

  const total = useMemo(() => {
    let sum = 0;
    for (const line of lines) {
      const value = toNumber(applied[line.id] ?? '');
      const cap = toNumber(line.pendingAmount.amount);
      sum += Math.min(value, cap);
    }
    return sum;
  }, [lines, applied]);

  const isEgreso = mode === 'egreso';
  const canSubmit = isEgreso
    ? Boolean(accountId) && toNumber(directAmount) > 0 && Boolean(resultLineId) && concept.trim().length > 0
    : Boolean(accountId) && total > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const applications = isEgreso
      ? []
      : lines
          .map((line) => ({
            obligationId: line.id,
            appliedAmount: Math.min(toNumber(applied[line.id] ?? ''), toNumber(line.pendingAmount.amount)).toFixed(2),
          }))
          .filter((a) => toNumber(a.appliedAmount) > 0);

    const amount = isEgreso ? toNumber(directAmount).toFixed(2) : total.toFixed(2);

    const token = await getFinanzasAccessToken();
    const res = await fetch('/api/finanzas/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        accountId,
        effectiveDate,
        periodId,
        amount,
        currency: 'ARS',
        applications,
        ...(isEgreso ? { concept: concept.trim(), resultLineId } : {}),
      }),
    });
    setSubmitting(false);

    if (res.ok) {
      setSuccess(true);
      if (isEgreso) {
        setConcept('');
        setResultLineId('');
        setDirectAmount('');
      } else {
        setApplied(Object.fromEntries(lines.map((l) => [l.id, l.pendingAmount.amount])));
      }
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.message || 'No se pudo registrar el pago.');
    }
  }

  if (status === 'loading') {
    return <div className="p-8 text-center text-finMuted">Cargando pagos…</div>;
  }
  if (status === 'error' || !payload) {
    return <div className="p-8 text-center text-finDanger">No se pudo cargar el formulario de pago.</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-finText">Registrar pago</h1>
        <p className="mt-1 text-base text-finMuted">Aplicá un pago a obligaciones o cargá un egreso directo</p>
      </header>

      {success && (
        <p className="mb-4 rounded-lg bg-finPositive/10 px-4 py-3 text-base text-finPositive">
          Pago registrado. Miralo en la agenda.
        </p>
      )}

      <div className="mb-4 flex gap-1 rounded-lg bg-finBorder/40 p-1" role="tablist">
        {(['aplicado', 'egreso'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-12 flex-1 rounded-lg px-3 text-base font-semibold transition-colors ${
              mode === m ? 'bg-finAccent text-white' : 'text-finMuted hover:text-finText'
            }`}
          >
            {m === 'aplicado' ? 'Aplicado a obligaciones' : 'Egreso directo'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-base font-medium text-finText">Cuenta pagadora</label>
          <select
            className={inputClass}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            <option value="">Elegí…</option>
            {payload.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {field('Fecha de pago', (
          <input
            className={inputClass}
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            required
          />
        ))}

        {isEgreso ? (
          <>
            {field('Concepto', (
              <input
                className={inputClass}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                required
              />
            ))}

            {field('Línea de resultado', (
              <select
                className={inputClass}
                value={resultLineId}
                onChange={(e) => setResultLineId(e.target.value)}
                required
              >
                <option value="">Elegí…</option>
                {payload.resultLines.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            ))}

            {field('Monto', (
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={directAmount}
                onChange={(e) => setDirectAmount(e.target.value)}
                required
              />
            ))}
          </>
        ) : lines.length === 0 ? (
          <p className="rounded-lg border border-finBorder bg-finSurface px-4 py-6 text-center text-base text-finMuted">
            No hay obligaciones con saldo pendiente. Usá «Egreso directo» para un gasto sin obligación.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <span className="text-base font-medium text-finText">Obligaciones</span>
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="rounded-lg border border-finBorder bg-finSurface px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-base font-medium text-finText">{line.concept}</span>
                    <span className="text-sm text-finMuted">
                      Pendiente {line.pendingAmount.amount}
                    </span>
                  </div>
                  <input
                    className={`${inputClass} mt-2`}
                    type="number"
                    min="0"
                    max={line.pendingAmount.amount}
                    step="0.01"
                    value={applied[line.id] ?? ''}
                    onChange={(e) =>
                      setApplied((prev) => ({ ...prev, [line.id]: e.target.value }))
                    }
                    aria-label={`Monto a aplicar para ${line.concept}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-finBorder/40 px-4 py-3">
              <span className="text-base font-semibold text-finText">Total a pagar</span>
              <span className="text-lg font-bold text-finText">${total.toFixed(2)}</span>
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-finDanger/10 px-3 py-2 text-base text-finDanger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="min-h-12 w-full rounded-lg bg-finAccent px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-finAccentHover disabled:opacity-50"
        >
          {submitting ? 'Guardando…' : 'Registrar pago'}
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
