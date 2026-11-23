import { useCallback, useEffect, useState } from 'react';
import { getFinanzasAccessToken } from '../presentation/client';

type Line = {
  entryId: string;
  entryDate: string;
  description: string;
  sourceDocumentType: string;
  status: string;
  reversesEntryId: string | null;
  reversedAt: string | null;
  ledgerAccountId: string;
  accountName: string;
  debit: { amount: string; currency: string };
  credit: { amount: string; currency: string };
};

const DOC_LABELS: Record<string, string> = {
  commission_record: 'Comisión',
  commission_payment: 'Pago de comisión',
  commission_payment_reversal: 'Reversión pago comisión',
  income_record: 'Ingreso',
  payment: 'Pago',
  transfer: 'Transferencia',
  obligation: 'Obligación',
  external_settlement: 'Fondo externo',
  journal_entry_reversal: 'Reversión',
  investment: 'Inversión',
  depreciation: 'Depreciación',
  daily_closing: 'Cierre diario',
  reconciliation: 'Conciliación',
};

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(amount: string, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n === 0) return '';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
}

export function LibroDiario() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [lines, setLines] = useState<Line[]>([]);

  const load = useCallback(async () => {
    const token = await getFinanzasAccessToken();
    if (!token) {
      setStatus('error');
      return;
    }
    const res = await fetch('/api/finanzas/libro', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setStatus('error');
      return;
    }
    const data: { lines: Line[] } = await res.json();
    setLines(data.lines ?? []);
    setStatus('ready');
  }, []);

  useEffect(() => {
    load().catch(() => setStatus('error'));
  }, [load]);

  if (status === 'loading') {
    return <div className="p-8 text-center text-finMuted">Cargando libro diario…</div>;
  }
  if (status === 'error') {
    return <div className="p-8 text-center text-finDanger">No se pudo cargar el libro diario.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-finText">Libro diario</h1>
        <p className="mt-1 text-base text-finMuted">Todos los asientos contables (solo lectura). · <a href="/finanzas/ayuda" className="text-finAccent underline">Ver ayuda</a></p>
      </header>

      {lines.length === 0 ? (
        <p className="text-finMuted">Todavía no hay registros.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-finBorder bg-finSurface">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-finBorder text-finMuted">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Descripción</th>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold">Cuenta</th>
                <th className="px-3 py-2 text-right font-semibold">Debe</th>
                <th className="px-3 py-2 text-right font-semibold">Haber</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const isReversal = line.reversesEntryId != null;
                const wasReversed = line.reversedAt != null;
                return (
                  <tr key={`${line.entryId}-${i}`} className="border-b border-finBorder/60 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-finText">{formatDate(line.entryDate)}</td>
                    <td className="px-3 py-2 text-finText">{line.description}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-finMuted">{DOC_LABELS[line.sourceDocumentType] ?? line.sourceDocumentType}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-finText">
                      <span className="text-finMuted">{line.ledgerAccountId}</span> · {line.accountName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-finText">{formatMoney(line.debit.amount, line.debit.currency)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-finText">{formatMoney(line.credit.amount, line.credit.currency)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {isReversal ? (
                        <span className="rounded bg-finDanger/10 px-2 py-0.5 text-xs font-semibold text-finDanger">Reversión</span>
                      ) : wasReversed ? (
                        <span className="rounded bg-finBorder/60 px-2 py-0.5 text-xs font-semibold text-finMuted">Revertido</span>
                      ) : (
                        <span className="rounded bg-finPositive/10 px-2 py-0.5 text-xs font-semibold text-finPositive">Confirmado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
