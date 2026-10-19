import { useEffect, useState } from 'react';
import { getFinanzasAccessToken } from '../presentation/client';

type Option = { id: string; label: string };

type MaestrosPayload = {
  persons: Option[];
  categories: Option[];
  resultLines: Option[];
  accounts: Option[];
  periods: { id: string; code: string }[];
};

const PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const;

function labelOf(m: { id: string; displayName?: string; name?: string }): string {
  return m.displayName ?? m.name ?? m.id;
}

function field(label: string, children: React.ReactNode) {
  return (
    <div>
      <label className="mb-1 block text-sm text-textMuted">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-accentMuted bg-surface px-3 py-2 text-textLight';

export function AltaObligacion() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [maestros, setMaestros] = useState<MaestrosPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expectedPaymentDate, setExpectedPaymentDate] = useState('');
  const [priority, setPriority] = useState('P3');
  const [isEstimated, setIsEstimated] = useState(false);
  const [personId, setPersonId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [resultLineId, setResultLineId] = useState('');
  const [plannedAccountId, setPlannedAccountId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getFinanzasAccessToken();
      if (!token) {
        if (!cancelled) setStatus('error');
        return;
      }
      const res = await fetch('/api/finanzas/maestros', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        if (!cancelled) setStatus('error');
        return;
      }
      const data = await res.json();
      if (!cancelled) {
        setMaestros({
          persons: (data.persons ?? []).map((m: any) => ({ id: m.id, label: labelOf(m) })),
          categories: (data.categories ?? []).map((m: any) => ({ id: m.id, label: labelOf(m) })),
          resultLines: (data.resultLines ?? []).map((m: any) => ({ id: m.id, label: labelOf(m) })),
          accounts: (data.accounts ?? []).map((m: any) => ({ id: m.id, label: labelOf(m) })),
          periods: data.periods ?? [],
        });
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
    setSuccess(false);
    setSubmitting(true);

    const token = await getFinanzasAccessToken();
    const res = await fetch('/api/finanzas/obligaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        concept,
        amount,
        currency: 'ARS',
        dueDate,
        expectedPaymentDate: expectedPaymentDate || undefined,
        priority,
        isEstimated,
        personId,
        categoryId,
        resultLineId,
        plannedAccountId,
        periodId: maestros?.periods[0]?.id,
      }),
    });
    setSubmitting(false);

    if (res.ok) {
      setSuccess(true);
      setConcept('');
      setAmount('');
      setDueDate('');
      setExpectedPaymentDate('');
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.message || 'No se pudo crear la obligación.');
    }
  }

  if (status === 'loading') {
    return <div className="p-8 text-center text-textMuted">Cargando formulario…</div>;
  }
  if (status === 'error' || !maestros) {
    return <div className="p-8 text-center text-cupOrange">No se pudo cargar el formulario.</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-textLight">Nueva obligación</h1>
        <p className="mt-1 text-sm text-textMuted">Cargá un compromiso de pago</p>
      </header>

      {success && (
        <p className="mb-4 rounded-lg bg-cupGreen/10 px-4 py-3 text-sm text-cupGreen">
          Obligación creada. Miralá en la agenda.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {field(
          'Concepto',
          <input
            className={inputClass}
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            required
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          {field(
            'Monto',
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          )}
          {field(
            'Vencimiento',
            <input
              className={inputClass}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field(
            'Pago esperado (opcional)',
            <input
              className={inputClass}
              type="date"
              value={expectedPaymentDate}
              onChange={(e) => setExpectedPaymentDate(e.target.value)}
            />
          )}
          {field(
            'Prioridad',
            <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>

        {field(
          'Persona / proveedor',
          <select
            className={inputClass}
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            required
          >
            <option value="">Elegí…</option>
            {maestros.persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        )}

        {field(
          'Categoría',
          <select
            className={inputClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">Elegí…</option>
            {maestros.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        )}

        {field(
          'Línea de resultado',
          <select
            className={inputClass}
            value={resultLineId}
            onChange={(e) => setResultLineId(e.target.value)}
            required
          >
            <option value="">Elegí…</option>
            {maestros.resultLines.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        )}

        {field(
          'Cuenta prevista',
          <select
            className={inputClass}
            value={plannedAccountId}
            onChange={(e) => setPlannedAccountId(e.target.value)}
            required
          >
            <option value="">Elegí…</option>
            {maestros.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-2 text-sm text-textMuted">
          <input
            type="checkbox"
            checked={isEstimated}
            onChange={(e) => setIsEstimated(e.target.checked)}
          />
          Importe estimado
        </label>

        {error && <p className="text-sm text-cupOrange">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent py-2.5 font-semibold text-white transition-colors hover:bg-accentHover disabled:opacity-50"
        >
          {submitting ? 'Guardando…' : 'Guardar obligación'}
        </button>
      </form>
    </div>
  );
}
