import { useCallback, useEffect, useState } from 'react';
import { getFinanzasAccessToken } from '../presentation/client';

type Person = { id: string; displayName: string };
type ResultLine = { id: string; name: string };
type Account = { id: string; name: string };
type Period = { id: string; code: string };
type FondosPayload = { persons: Person[]; resultLines: ResultLine[]; accounts: Account[]; periods: Period[] };

type HistorialSettlement = {
  id: string;
  effectiveDate: string;
  amount: { amount: string; currency: string };
  concept: string;
  nature: string;
  kind: 'inyeccion' | 'retiro';
  personName: string;
};
type HistorialPayload = { settlements: HistorialSettlement[]; periods: Period[] };

type Mode = 'inyeccion' | 'retiro';
type Nature = 'CUENTA_CORRIENTE' | 'PRESTAMO' | 'APORTE';

const NATURES: { value: Nature; label: string }[] = [
  { value: 'CUENTA_CORRIENTE', label: 'Cuenta corriente' },
  { value: 'PRESTAMO', label: 'Préstamo (mutuo)' },
  { value: 'APORTE', label: 'Aporte' },
];

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

function natureLabel(nature: string): string {
  return NATURES.find((n) => n.value === nature)?.label ?? nature;
}

export function Fondos() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [payload, setPayload] = useState<FondosPayload | null>(null);
  const [mode, setMode] = useState<Mode>('inyeccion');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [sourcePersonId, setSourcePersonId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [note, setNote] = useState('');
  const [resultLineId, setResultLineId] = useState('');
  const [nature, setNature] = useState<Nature>('CUENTA_CORRIENTE');
  const [accountId, setAccountId] = useState('');

  // Reversión
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
      const res = await fetch('/api/finanzas/fondos', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        if (!cancelled) setStatus('error');
        return;
      }
      const data: FondosPayload = await res.json();
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
    const res = await fetch('/api/finanzas/fondos/historial', {
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

  async function onRevert(settlementId: string) {
    setRevertError(null);
    setRevertSubmitting(true);
    const token = await getFinanzasAccessToken();
    const res = await fetch(`/api/finanzas/fondos/${settlementId}/revertir`, {
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
      setRevertError(err?.message || 'No se pudo revertir el fondo.');
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirming) {
      setError(null);
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const token = await getFinanzasAccessToken();
    const endpoint = mode === 'inyeccion' ? '/api/finanzas/fondos/inyeccion' : '/api/finanzas/fondos/retiro';
    const base = { sourcePersonId, concept: concept.trim(), amount, currency: 'ARS', effectiveDate, periodId };
    const body = mode === 'inyeccion' ? { ...base, resultLineId, nature } : { ...base, accountId, note: note.trim() || undefined };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    setSubmitting(false);

    if (res.ok) {
      setSuccess(mode === 'inyeccion' ? 'Inyección registrada.' : 'Retiro registrado.');
      setAmount('');
      setConcept('');
      setNote('');
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.message || 'No se pudo registrar.');
    }
  }

  if (status === 'loading') {
    return <div className="p-8 text-center text-finMuted">Cargando fondos…</div>;
  }
  if (status === 'error' || !payload) {
    return <div className="p-8 text-center text-finDanger">No se pudo cargar la pantalla de fondos.</div>;
  }

  const isInyeccion = mode === 'inyeccion';
  const canSubmit =
    Boolean(sourcePersonId) &&
    concept.trim().length > 0 &&
    Number(amount) > 0 &&
    (isInyeccion ? Boolean(resultLineId) : Boolean(accountId));

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-finText">Fondos del dueño</h1>
        <p className="mt-1 text-base text-finMuted">
          Inyección (gasto pagado por el dueño) y retiro (excedente de caja).{' '}
          <a href="/finanzas/ayuda/cuenta-corriente-prestamo-aporte" className="text-finAccent underline">
            Ver conceptos
          </a>
        </p>
      </header>

      {success && (
        <p className="mb-4 rounded-lg bg-finPositive/10 px-4 py-3 text-base text-finPositive">{success}</p>
      )}

      <div className="mb-4 flex gap-1 rounded-lg bg-finBorder/40 p-1" role="tablist">
        {(['inyeccion', 'retiro'] as const).map((m) => (
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
            {m === 'inyeccion' ? 'Inyección' : 'Retiro'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {field('Persona', (
          <select className={inputClass} value={sourcePersonId} onChange={(e) => setSourcePersonId(e.target.value)} required>
            <option value="">Elegí…</option>
            {payload.persons.map((p) => (
              <option key={p.id} value={p.id}>{p.displayName}</option>
            ))}
          </select>
        ))}

        {isInyeccion ? (
          <>
            {field('Línea de resultado (gasto)', (
              <select className={inputClass} value={resultLineId} onChange={(e) => setResultLineId(e.target.value)} required>
                <option value="">Elegí…</option>
                {payload.resultLines.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            ))}
            {field('Naturaleza', (
              <select className={inputClass} value={nature} onChange={(e) => setNature(e.target.value as Nature)} required>
                {NATURES.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            ))}
          </>
        ) : (
          field('Cuenta (de dónde sale el efectivo)', (
            <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
              <option value="">Elegí…</option>
              {payload.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          ))
        )}

        {field('Concepto', (
          <input className={inputClass} value={concept} onChange={(e) => setConcept(e.target.value)} required />
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
          {submitting ? 'Guardando…' : confirming ? `¿Confirmás ${isInyeccion ? 'inyectar' : 'retirar'} $${Number(amount).toFixed(2)}?` : isInyeccion ? 'Registrar inyección' : 'Registrar retiro'}
        </button>
      </form>

      {historial && historial.settlements.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-finText">Fondos recientes</h2>
          <ul className="space-y-2">
            {historial.settlements.map((s) => (
              <li key={s.id} className="rounded-xl border border-finBorder bg-finSurface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-medium text-finText">
                      {formatDate(s.effectiveDate)} · {s.kind === 'retiro' ? 'Retiro' : 'Inyección'} · {s.personName}
                    </p>
                    <p className="text-sm text-finMuted">
                      {formatMoney(s.amount.amount, s.amount.currency)} · {natureLabel(s.nature)} · {s.concept}
                    </p>
                  </div>
                  {revertFor === s.id ? (
                    <span className="text-sm font-semibold text-finMuted">Reversión…</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRevertFor(s.id);
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

                {revertFor === s.id && (
                  <form
                    className="mt-3 space-y-3 border-t border-finBorder pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onRevert(s.id);
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
