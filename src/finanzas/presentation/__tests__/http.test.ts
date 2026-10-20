import { describe, expect, it } from 'vitest';
import { json } from '../http';

describe('json', () => {
  it('serializa bigint como string', async () => {
    const res = json(200, { totalMinor: 10000n, nested: { n: 5n } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ totalMinor: '10000', nested: { n: '5' } });
  });

  it('serializa valores normales sin tocar', async () => {
    const res = json(200, { a: 1, b: 'x', c: true });
    expect(await res.json()).toEqual({ a: 1, b: 'x', c: true });
  });
});
