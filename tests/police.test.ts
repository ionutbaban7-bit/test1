// Testing Agent (A19) — logica pură „Șpagă” (police.ts).
import { describe, it, expect } from 'vitest';
import { reportHeatLevel, decayHeat, fineAmount, HEAT_CAP, FINE_MULT } from '../src/game/police';

describe('reportHeatLevel', () => {
  it('adună nivelul de Șpagă, plafonat la 5', () => {
    expect(reportHeatLevel(0, 2)).toBe(2);
    expect(reportHeatLevel(3, 3)).toBe(5);
    expect(reportHeatLevel(4, 4)).toBe(HEAT_CAP);
  });
  it('nu scade heat-ul la nivel negativ', () => {
    expect(reportHeatLevel(2, -3)).toBe(2);
  });
  it('nu pornește de la heat negativ', () => {
    expect(reportHeatLevel(-1, 2)).toBe(2);
  });
});

describe('decayHeat', () => {
  it('scade cu 1, dar nu sub 0', () => {
    expect(decayHeat(3)).toBe(2);
    expect(decayHeat(1)).toBe(0);
    expect(decayHeat(0)).toBe(0);
  });
});

describe('fineAmount', () => {
  it('amenda = Șpagă × 150 LEI', () => {
    expect(fineAmount(1)).toBe(FINE_MULT);
    expect(fineAmount(3)).toBe(450);
    expect(fineAmount(5)).toBe(750);
  });
});
