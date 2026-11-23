import { commandContext, resolveActor } from './auth';
import type { FinanzasContainer } from './container';
import { json } from './http';

export type LibroDiarioLine = {
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

/**
 * Libro diario: aplanado de todos los asientos (entrada + líneas) con el nombre
 * legible de cada cuenta contable. Solo lectura, requiere VIEW_BALANCES.
 */
export async function handleLibro(container: FinanzasContainer, token: string | null): Promise<Response> {
  try {
    const userId = await resolveActor(container.supabase, token);
    if (!userId) return json(401, { error: 'UNAUTHENTICATED' });

    const ctx = commandContext(userId, crypto.randomUUID());
    const result = await container.reports.libroDiario(ctx);
    if (!result.ok) {
      const status = result.error.code === 'PERMISSION_DENIED' ? 403 : 500;
      return json(status, { error: result.error.code });
    }

    const accounts = await container.masters.findAll('LEDGER_ACCOUNT');
    const accountName = new Map(
      accounts.filter((m) => m.entityType === 'LEDGER_ACCOUNT').map((m) => [m.code, m.name])
    );

    const lines: LibroDiarioLine[] = [];
    for (const entry of result.value.entries) {
      for (const line of entry.lines) {
        lines.push({
          entryId: entry.id,
          entryDate: entry.entryDate,
          description: entry.description,
          sourceDocumentType: entry.sourceDocumentType,
          status: entry.status,
          reversesEntryId: entry.reversesEntryId ?? null,
          reversedAt: entry.reversedAt ?? null,
          ledgerAccountId: line.ledgerAccountId,
          accountName: accountName.get(line.ledgerAccountId) ?? line.ledgerAccountId,
          debit: line.debit,
          credit: line.credit,
        });
      }
    }

    return json(200, { lines });
  } catch (e) {
    return json(500, { error: 'INTERNAL', message: String((e as Error)?.message ?? e) });
  }
}
