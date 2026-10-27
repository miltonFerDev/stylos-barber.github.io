import { useCallback, useEffect, useState } from 'react';
import { getFinanzasAccessToken } from '../presentation/client';

type Investment = {
  id: string;
  concept: string;
  amount: { amount: string; currency: string };
  tentativeDate: string;
  status: string;
  decisionNote: string | null;
  paidAt: string | null;
  capitalized: boolean | null;
  usefulLifeMonths: number | null;
};
type Account = { id: string; name: string };
type Period = { id: string; code: string };
type InversionesPayload = { investments: Investment[]; accounts: Account[]; periods: Period[] };

const STATUS_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador',
  EVALUADA: 'Evaluada',
  APROBADA: 'Aprobada',
  POSTERGADA: 'Postergada',
  RECHAZADA: 'Rechazada',
  PAGADA: 'Pagada',
};

const inputClass =
  'w-full rounded-lg border border-finBorder bg-finSurface px-4 py-3 text-base text-finText placeholder:text-finMuted focus:border-finAccent focus:outline-none';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(m: { amount: string; currency: string }): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: m.currency, minimumFractionDigits: 2 }).format(
    Number(m.amount)
  );
}

export function Inversiones() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [payload, setPayload] = useState<InversionesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [tentativeDate, setTentativeDate] = useState(today());

  const [actionFor, setActionFor] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'aprobar' | 'rechazar' | 'pagar' | null>(null);
  const [reason, setReason] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payDate, setPayDate] = useState(today());
  const [payPeriodId, setPayPeriodId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const load = useCallback(async () => {
    const token = await getFinanzasAccessToken();
    if (!token) {
      setStatus('error');
      return;
    }
    const res = await fetch('/api/finanzas/inversiones', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setStatus('error');
      return;
    }
    const data: InversionesPayload = await res.json();
    setPayload(data);
    setPayPeriodId((prev) => prev || (data.periods?.[0]?.id ?? ''));
    setStatus('ready');
  }, []);

  useEffect(() => {
    load().catch(() => setStatus('error'));
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const token = await getFinanzasAccessToken();
    const res = await fetch('/api/finanzas/inversiones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ concept: concept.trim(), amount, currency: 'ARS', tentativeDate }),
    });
    if (res.ok) {
      setConcept('');
      setAmount('');
      setSuccess('Inversión candidata creada.');
      load();
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.message || 'No se pudo crear.');
    }
  }

  async function onEvaluar(id: string) {
    setActionError(null);
    const token = await getFinanzasAccessToken();
    const res = await fetch(`/api/finanzas/inversiones/${id}/evaluar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ scenario: 'BASE' }),
    });
    if (res.ok) {
      setSuccess('Inversión evaluada.');
      load();
    } else {
      const err = await res.json().catch(() => null);
      setActionFor(id);
      setActionError(err?.message || 'No se pudo evaluar.');
    }
  }

  async function onDecidir(id: string, decision: 'APROBADA' | 'RECHAZADA', confirm = false) {
    setActionError(null);
    setNeedsConfirm(false);
    const token = await getFinanzasAccessToken();
    const res = await fetch(`/api/finanzas/inversiones/${id}/decidir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ decision, reason: reason.trim(), confirmExceedsCapacity: confirm }),
    });
    if (res.ok) {
      setActionFor(null);
      setReason('');
      setSuccess(decision === 'APROBADA' ? 'Inversión aprobada.' : 'Inversión rechazada.');
      load();
    } else {
      const err = await res.json().catch(() => null);
      if (err?.error === 'INVESTMENT_EXCEEDS_CAPACITY') {
        setNeedsConfirm(true);
        setActionError(err.message);
      } else {
        setActionError(err?.message || 'No se pudo decidir.');
      }
    }
  }

  async function onPagar(id: string) {
    setActionError(null);
    const token = await getFinanzasAccessToken();
    const res = await fetch(`/api/finanzas/inversiones/${id}/pagar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ accountId: payAccountId, effectiveDate: payDate, periodId: payPeriodId }),
    });
    if (res.ok) {
      setActionFor(null);
      setSuccess('Inversión pagada.');
      load();
    } else {
      const err = await res.json().catch(() => null);
      setActionError(err?.message || 'No se pudo pagar.');
    }
  }

  if (status === 'loading') {
    return <div className="p-8 text-center text-finMuted">Cargando inversiones…</div>;
  }
  if (status === 'error' || !payload) {
    return <div className="p-8 text-center text-finDanger">No se pudo cargar la pantalla de inversiones.</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-finText">Inversiones</h1>
        <p className="mt-1 text-base text-finMuted">
          Candidata → evaluar → aprobar → pagar.{' '}
          <a href="/finanzas/ayuda/capitalizar-vs-gasto" className="text-finAccent underline">
            Ver concepto
          </a>
        </p>
      </header>

      {success && <p className="mb-4 rounded-lg bg-finPositive/10 px-4 py-3 text-base text-finPositive">{success}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-finDanger/10 px-3 py-2 text-base text-finDanger">{error}</p>}

      <form onSubmit={onCreate} className="mb-8 space-y-3 rounded-xl border border-finBorder bg-finSurface p-4">
        <p className="text-base font-semibold text-finText">Nueva inversión candidata</p>
        {field('Concepto', <input className={inputClass} value={concept} onChange={(e) => setConcept(e.target.value)} required />)}
        {field('Monto', (
          <input className={inputClass} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        ))}
        {field('Fecha tentativa', (
          <input className={inputClass} type="date" value={tentativeDate} onChange={(e) => setTentativeDate(e.target.value)} required />
        ))}
        <button type="submit" className="min-h-12 w-full rounded-lg bg-finAccent px-4 py-3 text-base font-semibold text-white hover:bg-finAccentHover">
          Crear candidata
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-finText">Candidatas ({payload.investments.length})</h2>
        {payload.investments.length === 0 ? (
          <p className="text-finMuted">Sin inversiones cargadas.</p>
        ) : (
          <ul className="space-y-2">
            {payload.investments.map((inv) => (
              <li key={inv.id} className="rounded-xl border border-finBorder bg-finSurface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-medium text-finText">{inv.concept}</p>
                    <p className="text-sm text-finMuted">
                      {formatMoney(inv.amount)} · {inv.tentativeDate}
                    </p>
                  </div>
                  <span className="rounded-full border border-finBorder px-2.5 py-0.5 text-sm font-semibold text-finText">
                    {STATUS_LABEL[inv.status] ?? inv.status}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {(inv.status === 'BORRADOR' || inv.status === 'EVALUADA') && (
                    <button type="button" onClick={() => onEvaluar(inv.id)} className="rounded-lg border border-finBorder px-3 py-2 text-sm font-semibold text-finAccent hover:bg-finBorder/60">
                      Evaluar
                    </button>
                  )}
                  {inv.status === 'EVALUADA' && (
                    <>
                      <button type="button" onClick={() => { setActionFor(inv.id); setActionType('aprobar'); setReason(''); setActionError(null); setNeedsConfirm(false); }} className="rounded-lg border border-finBorder px-3 py-2 text-sm font-semibold text-finPositive hover:bg-finBorder/60">
                        Aprobar
                      </button>
                      <button type="button" onClick={() => { setActionFor(inv.id); setActionType('rechazar'); setReason(''); setActionError(null); }} className="rounded-lg border border-finBorder px-3 py-2 text-sm font-semibold text-finDanger hover:bg-finBorder/60">
                        Rechazar
                      </button>
                    </>
                  )}
                  {inv.status === 'APROBADA' && (
                    <button type="button" onClick={() => { setActionFor(inv.id); setActionType('pagar'); setPayAccountId(''); setPayDate(today()); setActionError(null); }} className="rounded-lg border border-finBorder px-3 py-2 text-sm font-semibold text-finAccent hover:bg-finBorder/60">
                      Pagar
                    </button>
                  )}
                </div>

                {actionFor === inv.id && actionType === 'pagar' && (
                  <form className="mt-3 space-y-3 border-t border-finBorder pt-3" onSubmit={(e) => { e.preventDefault(); onPagar(inv.id); }}>
                    {field('Cuenta', (
                      <select className={inputClass} value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)} required>
                        <option value="">Elegí…</option>
                        {payload.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    ))}
                    {field('Fecha', <input className={inputClass} type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />)}
                    {field('Período', (
                      <select className={inputClass} value={payPeriodId} onChange={(e) => setPayPeriodId(e.target.value)} required>
                        <option value="">Elegí…</option>
                        {payload.periods.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
                      </select>
                    ))}
                    <div className="flex gap-2">
                      <button type="submit" disabled={!payAccountId} className="min-h-12 flex-1 rounded-lg bg-finAccent px-4 py-3 text-base font-semibold text-white hover:bg-finAccentHover disabled:opacity-50">Confirmar pago</button>
                      <button type="button" onClick={() => setActionFor(null)} className="min-h-12 rounded-lg border border-finBorder px-4 py-3 text-base font-semibold text-finMuted hover:text-finText">Cancelar</button>
                    </div>
                  </form>
                )}

                {actionFor === inv.id && (actionType === 'aprobar' || actionType === 'rechazar') && (
                  <form className="mt-3 space-y-3 border-t border-finBorder pt-3" onSubmit={(e) => { e.preventDefault(); onDecidir(inv.id, actionType === 'aprobar' ? 'APROBADA' : 'RECHAZADA', needsConfirm); }}>
                    {field(actionType === 'aprobar' ? 'Motivo (opcional)' : 'Motivo', (
                      <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} required={actionType === 'rechazar'} />
                    ))}
                    <div className="flex gap-2">
                      <button type="submit" disabled={actionType === 'rechazar' && !reason.trim()} className="min-h-12 flex-1 rounded-lg bg-finAccent px-4 py-3 text-base font-semibold text-white hover:bg-finAccentHover disabled:opacity-50">
                        {needsConfirm ? 'Confirmar igual' : actionType === 'aprobar' ? 'Aprobar' : 'Rechazar'}
                      </button>
                      <button type="button" onClick={() => { setActionFor(null); setNeedsConfirm(false); }} className="min-h-12 rounded-lg border border-finBorder px-4 py-3 text-base font-semibold text-finMuted hover:text-finText">Cancelar</button>
                    </div>
                  </form>
                )}

                {actionFor === inv.id && actionError && (
                  <p role="alert" className="mt-2 rounded-lg bg-finDanger/10 px-3 py-2 text-base text-finDanger">{actionError}</p>
                )}
              </li>
            ))}
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
