// Testing Agent (A9) — teste pe logica PURĂ a misiunilor satului.
// Fără Three.js: doar regulile de spargere a borcanelor și oboseala calului.
import { describe, it, expect } from 'vitest';
import { jarsShouldBreak, cartFatigue, horseRefuses } from '../src/game/satQuests';

describe('jarsShouldBreak (M6 — borcanele babei)', () => {
  it('mers normal, fără gâște: borcanele rezistă (caz fericit)', () => {
    expect(jarsShouldBreak(2.8, false)).toBe(false);
  });
  it('fuga sparge borcanele', () => {
    expect(jarsShouldBreak(4.6, false)).toBe(true);
  });
  it('gâștele sperie și sparg borcanele', () => {
    expect(jarsShouldBreak(1.2, true)).toBe(true);
  });
  it('viteză la limită, fără gâște: ține (caz limită)', () => {
    expect(jarsShouldBreak(3.4, false)).toBe(false);
    expect(jarsShouldBreak(3.41, false)).toBe(true);
  });
});

describe('cartFatigue (M9 — căruța cu fân)', () => {
  it('oboseala crește când calul trage (caz fericit)', () => {
    expect(cartFatigue(10, 1, 4, 1)).toBe(11);
  });
  it('oboseala scade la pauză', () => {
    expect(cartFatigue(10, 0, 0, 1)).toBe(8);
  });
  it('nu depășește 30 (caz limită)', () => {
    expect(cartFatigue(29.8, 1, 4, 1)).toBe(30);
    expect(cartFatigue(30, 1, 4, 1)).toBe(30);
  });
  it('nu scade sub 0', () => {
    expect(cartFatigue(1, 0, 0, 1)).toBe(0);
  });
});

describe('horseRefuses (calul oprit)', () => {
  it('sub 22: calul mai trage', () => {
    expect(horseRefuses(21.9)).toBe(false);
  });
  it('la 22: refuză (caz limită)', () => {
    expect(horseRefuses(22)).toBe(true);
  });
  it('peste 22: refuză', () => {
    expect(horseRefuses(27)).toBe(true);
  });
});
