import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleLibro } from '../libro';
import type { FinanzasContainer } from '../container';

function fakeSupabase(userId: string | null): SupabaseClient {
  return {
    auth: {
      async getUser(token: string) {
        if (token === 'valid-token' && userId) {
          return { data: { user: { id: userId } }, error: null };
        }
        return { data: { user: null }, error: { message: 'invalid token' } };
      },
    },
  } as unknown as SupabaseClient;
}

const ledgerAccounts = [
  { id: 'la-1', entityType: 'LEDGER_ACCOUNT', code: '5.1', name: 'Comisiones a barberos' },
  { id: 'la-2', entityType: 'LEDGER_ACCOUNT', code: '2.1.1', name: 'Comisiones a pagar' },
];

const entries = [
  {
    id: 'entry-1',
    periodId: 'period-1',
    entryDate: '2026-11-10',
    postingDate: '2026-11-10T00:00:00.000Z',
    status: 'CONFIRMADO',
    sourceDocumentType: 'commission_record',
    sourceDocumentId: 'r1',
    idempotencyKey: 'e1',
    createdBy: null,
    createdAt: '2026-11-10T00:00:00.000Z',
    description: 'Comision a barbero',
    lines: [
      { ledgerAccountId: '5.1', debit: { amount: '500.00', currency: 'ARS' }, credit: { amount: '0.00', currency: 'ARS' } },
      { ledgerAccountId: '2.1.1', debit: { amount: '0.00', currency: 'ARS' }, credit: { amount: '500.00', currency: 'ARS' } },
    ],
  },
];

function fakeContainer(overrides: Record<string, unknown> = {}): FinanzasContainer {
  return {
    supabase: fakeSupabase('u1'),
    reports: {
      libroDiario: async () => ({ ok: true, value: { entries } }),
    },
    masters: {
      findAll: async (entityType: string) => (entityType === 'LEDGER_ACCOUNT' ? ledgerAccounts : []),
    },
    ...overrides,
  } as unknown as FinanzasContainer;
}

describe('handleLibro', () => {
  it('devuelve 401 sin token', async () => {
    const res = await handleLibro(fakeContainer(), null);
    expect(res.status).toBe(401);
  });

  it('aplana asientos con nombre de cuenta legible', async () => {
    const res = await handleLibro(fakeContainer(), 'valid-token');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lines).toHaveLength(2);
    expect(body.lines[0].accountName).toBe('Comisiones a barberos');
    expect(body.lines[1].accountName).toBe('Comisiones a pagar');
  });

  it('mapea PERMISSION_DENIED a 403', async () => {
    const container = fakeContainer({
      reports: {
        libroDiario: async () => ({
          ok: false,
          error: { code: 'PERMISSION_DENIED', message: 'x', recoverable: false },
        }),
      },
    });
    const res = await handleLibro(container, 'valid-token');
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('PERMISSION_DENIED');
  });
});
