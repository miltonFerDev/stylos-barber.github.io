import { useCallback, useEffect, useState } from 'react';
import { getFinanzasAccessToken } from '../presentation/client';

type Barber = { id: string; displayName: string };
type Account = { id: string; name: string };
type Period = { id: string; code: string };
type Balance = { barberId: string; pending: { amount: string; currency: string } };
type ComisionesPayload = { barbers: Barber[]; accounts: Account[]; periods: Period[]; balances: Balance[] };

type HistorialItem = {
  id: string;
  effectiveDate: string;
  amount: { amount: string; currency: string };
  barberName: string;
};
type HistorialPayload = { records: HistorialItem[]; payments: HistorialItem[]; periods: Period[] };

const inputClass =
  'w-full rounded-lg border border-finBorder bg-finSurface px-4 py-3 text-base text-finText placeholder:text-finMuted focus:border-finAccent focus:outline-none';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const [confirmingDev, setConfirmingDev] = useState(false);
  const [confirmingPay, setConfirmingPay] = useState(false);

  // Comisión del día (carga batch por barbero)
  const [devAmounts, setDevAmounts] = useState<Record<string, string>>({});
  const [devDate, setDevDate] = useState(today());
  const [devPeriodId, setDevPeriodId] = useState('');

  // Pago
  const [payFor, setPayFor] = useState<string | null>(null);
  const [distributions, setDistributions] = useState<Record<string, string>>({});
  const [payDate, setPayDate] = useState(today());
  const [payPeriodId, setPayPeriodId] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  // Reversión
  const [historial, setHistorial] = useState<HistorialPayload | null>(null);
  const [revertTarget, setRevertTarget] = useState<{ kind: 'record' | 'payment'; id: string } | null>(null);
  const [revertReason, setRevertReason] = useState('');
  const [revertDate, setRevertDate] = useState(today());
  const [revertPeriodId, setRevertPeriodId] = useState('');
  const [revertSubmitting, setRevertSubmitting] = useState(false);
  const [revertError, setRevertError] = useState<string | null>(null);

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

  const loadHistorial = useCallback(async () => {
    const token = await getFinanzasAccessToken();
    if (!token) {
      setHistorial(null);
      return;
    }
    const res = await fetch('/api/finanzas/comisiones/historial', {
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

  async function onRevert(kind: 'record' | 'payment', id: string) {
    setRevertError(null);
    setRevertSubmitting(true);
    const token = await getFinanzasAccessToken();
    const path = kind === 'record' ? 'devengos' : 'pagos';
    const res = await fetch(`/api/finanzas/comisiones/${path}/${id}/revertir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: revertReason.trim(), periodId: revertPeriodId, reversalDate: revertDate }),
    });
    setRevertSubmitting(false);
    if (res.ok) {
      setRevertTarget(null);
      setRevertReason('');
      loadHistorial().catch(() => setHistorial(null));
      load().catch(() => setStatus('error'));
    } else {
      const err = await res.json().catch(() => null);
      setRevertError(err?.message || 'No se pudo revertir.');
    }
  }

  function pendingOf(barberId: string): number {
    const b = payload?.balances.find((x) => x.barberId === barberId);
    return toNum(b?.pending.amount ?? '0');
  }

  async function onDevengar(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmingDev) {
      setError(null);
      setConfirmingDev(true);
      return;
    }
    setConfirmingDev(false);
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const token = await getFinanzasAccessToken();
    const entries = payload!.barbers
      .filter((b) => toNum(devAmounts[b.id] || '') > 0)
      .map((b) => ({ barberId: b.id, displayName: b.displayName, amount: devAmounts[b.id] }));

    let okCount = 0;
    const failed: string[] = [];
    for (const entry of entries) {
      const res = await fetch('/api/finanzas/comisiones/devengar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ barberId: entry.barberId, amount: entry.amount, currency: 'ARS', effectiveDate: devDate, periodId: devPeriodId }),
      });
      if (res.ok) {
        okCount += 1;
      } else {
        const err = await res.json().catch(() => null);
        failed.push(`${entry.displayName}: ${err?.message || 'error'}`);
      }
    }

    setSubmitting(false);
    if (failed.length === 0) {
      setSuccess(`Se registraron ${okCount} comisión${okCount === 1 ? '' : 'es'}.`);
      setDevAmounts({});
    } else {
      setError(`Se registraron ${okCount} de ${entries.length}. Falló: ${failed.join(' · ')}`);
    }
    load().catch(() => setStatus('error'));
  }

  async function onPagar(barberId: string) {
    if (!confirmingPay) {
      setPayError(null);
      setConfirmingPay(true);
      return;
    }
    setConfirmingPay(false);
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
  const devCount = payload.barbers.filter((b) => toNum(devAmounts[b.id] || '') > 0).length;
  const devTotal = round2(payload.barbers.reduce((s, b) => s + toNum(devAmounts[b.id] || ''), 0));

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-finText">Comisiones</h1>
        <p className="mt-1 text-base text-finMuted">Registrá la comisión del día y pagá a cada barbero. · <a href="/finanzas/ayuda" className="text-finAccent underline">Ver ayuda</a></p>
      </header>

      {success && <p className="mb-4 rounded-lg bg-finPositive/10 px-4 py-3 text-base text-finPositive">{success}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-finDanger/10 px-3 py-2 text-base text-finDanger">{error}</p>}

      <form onSubmit={onDevengar} className="mb-8 space-y-3 rounded-xl border border-finBorder bg-finSurface p-4">
        <p className="text-base font-semibold text-finText">Comisión del día</p>
        <p className="text-sm text-finMuted">Cargá lo que ganó cada barbero hoy. Dejá en 0 (o vacío) a quien no trabajó.</p>
        {payload.barbers.map((b) => (
          <div key={b.id}>
            <label className="mb-1 block text-sm font-medium text-finText">{b.displayName} (ARS)</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={devAmounts[b.id] || ''}
              onChange={(e) => setDevAmounts((prev) => ({ ...prev, [b.id]: e.target.value }))}
              placeholder="0.00"
            />
          </div>
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
        <button type="submit" disabled={submitting || devCount === 0} className="min-h-12 w-full rounded-lg bg-finAccent px-4 py-3 text-base font-semibold text-white hover:bg-finAccentHover disabled:opacity-50">
          {submitting ? 'Guardando…' : confirmingDev ? `¿Confirmás registrar ${devCount} comisión${devCount === 1 ? '' : 'es'} por $${devTotal.toFixed(2)}?` : 'Registrar comisiones'}
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
                      <button type="button" onClick={() => { setPayFor(b.id); setDistributions({}); setPayError(null); setConfirmingPay(false); }} className="min-h-12 rounded-lg border border-finBorder px-3 text-base font-semibold text-finAccent hover:bg-finBorder/60">
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
                          {submitting ? 'Pagando…' : confirmingPay ? `¿Confirmás pagar $${payPending.toFixed(2)}?` : 'Confirmar pago'}
                        </button>
                        <button type="button" onClick={() => { setPayFor(null); setDistributions({}); setConfirmingPay(false); }} className="min-h-12 rounded-lg border border-finBorder px-4 py-3 text-base font-semibold text-finMuted hover:text-finText">
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

      {historial && (
        <>
          <RevertList
            title="Comisiones registradas"
            kind="record"
            items={historial.records}
            periods={historial.periods}
            revertTarget={revertTarget}
            onOpen={(id) => {
              setRevertTarget({ kind: 'record', id });
              setRevertReason('');
              setRevertDate(today());
              setRevertError(null);
            }}
            onCancel={() => setRevertTarget(null)}
            onSubmit={(id) => onRevert('record', id)}
            reason={revertReason}
            setReason={setRevertReason}
            date={revertDate}
            setDate={setRevertDate}
            periodId={revertPeriodId}
            setPeriodId={setRevertPeriodId}
            submitting={revertSubmitting}
            error={revertError}
          />
          <RevertList
            title="Pagos de comisión recientes"
            kind="payment"
            items={historial.payments}
            periods={historial.periods}
            revertTarget={revertTarget}
            onOpen={(id) => {
              setRevertTarget({ kind: 'payment', id });
              setRevertReason('');
              setRevertDate(today());
              setRevertError(null);
            }}
            onCancel={() => setRevertTarget(null)}
            onSubmit={(id) => onRevert('payment', id)}
            reason={revertReason}
            setReason={setRevertReason}
            date={revertDate}
            setDate={setRevertDate}
            periodId={revertPeriodId}
            setPeriodId={setRevertPeriodId}
            submitting={revertSubmitting}
            error={revertError}
          />
        </>
      )}
    </div>
  );
}

function RevertList(props: {
  title: string;
  kind: 'record' | 'payment';
  items: HistorialItem[];
  periods: Period[];
  revertTarget: { kind: 'record' | 'payment'; id: string } | null;
  onOpen: (id: string) => void;
  onCancel: () => void;
  onSubmit: (id: string) => void;
  reason: string;
  setReason: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  periodId: string;
  setPeriodId: (v: string) => void;
  submitting: boolean;
  error: string | null;
}) {
  if (props.items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-finText">{props.title}</h2>
      <ul className="space-y-2">
        {props.items.map((item) => {
          const active = props.revertTarget?.kind === props.kind && props.revertTarget.id === item.id;
          return (
            <li key={item.id} className="rounded-xl border border-finBorder bg-finSurface px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-medium text-finText">
                    {formatDate(item.effectiveDate)} · {item.barberName}
                  </p>
                  <p className="text-sm text-finMuted">{formatMoney(item.amount.amount, item.amount.currency)}</p>
                </div>
                {active ? (
                  <span className="text-sm font-semibold text-finMuted">Reversión…</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => props.onOpen(item.id)}
                    className="min-h-12 rounded-lg border border-finBorder px-3 text-base font-semibold text-finDanger hover:bg-finDanger/10"
                  >
                    Revertir
                  </button>
                )}
              </div>

              {active && (
                <form
                  className="mt-3 space-y-3 border-t border-finBorder pt-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    props.onSubmit(item.id);
                  }}
                >
                  {field('Motivo', (
                    <input
                      className={inputClass}
                      value={props.reason}
                      onChange={(e) => props.setReason(e.target.value)}
                      placeholder="¿Por qué se revierte?"
                      required
                    />
                  ))}
                  {field('Fecha de reversión', (
                    <input className={inputClass} type="date" value={props.date} onChange={(e) => props.setDate(e.target.value)} required />
                  ))}
                  {field('Período', (
                    <select className={inputClass} value={props.periodId} onChange={(e) => props.setPeriodId(e.target.value)} required>
                      <option value="">Elegí…</option>
                      {props.periods.map((p) => (
                        <option key={p.id} value={p.id}>{p.code}</option>
                      ))}
                    </select>
                  ))}
                  {props.error && (
                    <p role="alert" className="rounded-lg bg-finDanger/10 px-3 py-2 text-base text-finDanger">{props.error}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={props.submitting || !props.reason.trim() || !props.periodId}
                      className="min-h-12 flex-1 rounded-lg bg-finDanger px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-finDanger/90 disabled:opacity-50"
                    >
                      {props.submitting ? 'Revirtiendo…' : 'Confirmar reversión'}
                    </button>
                    <button
                      type="button"
                      onClick={props.onCancel}
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
