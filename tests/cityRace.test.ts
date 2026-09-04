// Testing Agent (A15) — cursa „Noaptea Unirii”: calculul locului la finiș.
import { describe, it, expect } from 'vitest';
import { racePlace } from '../src/game/cityRace';

describe('racePlace', () => {
  it('locul 1 când toți rivalii sunt în spate', () => {
    expect(racePlace([20, 30, 40], 50)).toBe(1);
  });
  it('locul 2 când un rival e în față', () => {
    expect(racePlace([20, 30, 60], 50)).toBe(2);
  });
  it('ultimul loc când toți au trecut linia', () => {
    expect(racePlace([55, 60, 70], 50)).toBe(4);
  });
  it('fără rivali: tot locul 1', () => {
    expect(racePlace([], 50)).toBe(1);
  });
});
