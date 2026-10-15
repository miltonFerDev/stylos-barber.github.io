import { describe, expect, it } from 'vitest';
import { scenarioConfidence } from '../forecast';
import { isDecidable, isEvaluatable } from '../investments';

describe('investments helpers', () => {
  it('isEvaluatable acepta BORRADOR y EVALUADA', () => {
    expect(isEvaluatable('BORRADOR')).toBe(true);
    expect(isEvaluatable('EVALUADA')).toBe(true);
    expect(isEvaluatable('APROBADA')).toBe(false);
    expect(isEvaluatable('RECHAZADA')).toBe(false);
  });

  it('isDecidable solo acepta EVALUADA', () => {
    expect(isDecidable('EVALUADA')).toBe(true);
    expect(isDecidable('BORRADOR')).toBe(false);
    expect(isDecidable('APROBADA')).toBe(false);
  });
});

describe('scenarioConfidence', () => {
  it('mapea escenario a confianza', () => {
    expect(scenarioConfidence('CONSERVADOR')).toBe('ALTA');
    expect(scenarioConfidence('BASE')).toBe('MEDIA');
    expect(scenarioConfidence('OPTIMISTA')).toBe('BAJA');
  });
});
