// Testing Agent (A19) — M4 „Selfie la Palat” + M5 „Datoria”: logica pură.
import { describe, it, expect } from 'vitest';
import { guardSees, guardStep, ratingWallets, RATING_TEXT } from '../src/game/cityQuests';

describe('guardSees (conul Jandarmului Florică)', () => {
  // garda la (-300,-288), orientată spre est (yaw = +π/2)
  const YAW_E = Math.PI / 2;
  it('vede în față, în rază', () => {
    expect(guardSees(-300, -288, YAW_E, -290, -288)).toBe(true); // 10 m în față
  });
  it('nu vede în spate (dincolo de con)', () => {
    expect(guardSees(-300, -288, YAW_E, -310, -288)).toBe(false); // 10 m în spate
  });
  it('nu vede prea departe (peste 16 m)', () => {
    expect(guardSees(-300, -288, YAW_E, -270, -288)).toBe(false); // 30 m
  });
  it('te vede dacă ești lipit de el, chiar și lateral', () => {
    expect(guardSees(-300, -288, YAW_E, -300.5, -290)).toBe(true);
  });
});

describe('guardStep (patrulare liniară)', () => {
  it('merge spre stânga până la capăt', () => {
    const r = guardStep(-356, -1, -356, -244, 2.4, 1);
    expect(r.x).toBe(-356); // clamp la min
    expect(r.dir).toBe(1); // se întoarce
  });
  it('se întoarce și la capătul drept', () => {
    const r = guardStep(-243, 1, -356, -244, 2.4, 1);
    expect(r.x).toBe(-244);
    expect(r.dir).toBe(-1);
  });
  it('avansează normal între capete', () => {
    const r = guardStep(-300, 1, -356, -244, 2.4, 1);
    expect(r.x).toBeCloseTo(-297.6, 2);
    expect(r.dir).toBe(1);
  });
});

describe('ratingWallets (rating final M5)', () => {
  it('3 portofele: primul loc, fără să fii prins', () => {
    expect(ratingWallets(1, false, false)).toBe(3);
  });
  it('2 portofele: loc 2 la cursă', () => {
    expect(ratingWallets(2, false, false)).toBe(2);
  });
  it('1 portofel: loc 4 + prins la selfie + prins în raid', () => {
    expect(ratingWallets(4, true, true)).toBe(1);
  });
  it('nu scade sub 1 oricât de prins ai fi', () => {
    expect(ratingWallets(4, true, true)).toBeGreaterThanOrEqual(1);
  });
  it('eticheta pentru 3 portofele există', () => {
    expect(RATING_TEXT[3]).toContain('Șmecher');
  });
});
