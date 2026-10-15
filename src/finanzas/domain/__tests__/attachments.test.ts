import { describe, expect, it } from 'vitest';
import { isAllowedMime, isWithinSizeLimit } from '../attachments';

describe('isAllowedMime', () => {
  it.each(['application/pdf', 'image/png', 'image/jpeg'])('acepta %s', mime => {
    expect(isAllowedMime(mime)).toBe(true);
  });

  it('rechaza mime no permitido', () => {
    expect(isAllowedMime('text/html')).toBe(false);
  });
});

describe('isWithinSizeLimit', () => {
  it('acepta tamaño dentro del limite', () => {
    expect(isWithinSizeLimit(1_000_000)).toBe(true);
  });

  it('rechaza tamaño excedido', () => {
    expect(isWithinSizeLimit(11_000_000)).toBe(false);
  });

  it('rechaza tamaño cero', () => {
    expect(isWithinSizeLimit(0)).toBe(false);
  });
});
