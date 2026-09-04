// Testing Agent — livrabil A4: unit tests pentru fizica (src/game/physics.ts).
// Acoperire: caz fericit, caz limita, caz „nu se intersecteaza” pentru fiecare API.
import { describe, it, expect } from 'vitest';
import {
  collideAgainstRects,
  resolveCircleObb,
  circleCircleResolve,
  rayRect,
  raycastRects,
} from '../src/game/physics';
import { resolveCircleRect, circleHitsRect } from '../src/engine/math';

const close = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) < eps;

describe('collideAgainstRects', () => {
  const wall = { x: 0, y: 0, w: 10, h: 10 };

  it('impinge cercul in afara dreptunghiului (caz fericit)', () => {
    const res = collideAgainstRects(10.4, 5, 1, [wall]);
    expect(circleHitsRect(res.x, res.z, 1, wall)).toBe(false);
    expect(close(res.x, 11)).toBe(true); // 10 (margine) + raza 1
    expect(res.touched).toBe(true);
  });

  it('nu misca cercul daca nu se intersecteaza', () => {
    const res = collideAgainstRects(20, 5, 1, [wall]);
    expect(res.x).toBe(20);
    expect(res.z).toBe(5);
    expect(res.touched).toBe(false);
  });

  it('clamp la limita lumii (caz limita)', () => {
    const res = collideAgainstRects(600, 5, 1, [], 470);
    expect(res.x).toBe(470);
  });

  it('rezolva mai multe dreptunghiuri in secventa', () => {
    const rects = [
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: 0, w: 10, h: 10 },
    ];
    const res = collideAgainstRects(10.4, 5, 1, rects);
    expect(circleHitsRect(res.x, res.z, 1, rects[0])).toBe(false);
    expect(circleHitsRect(res.x, res.z, 1, rects[1])).toBe(false);
  });
});

describe('resolveCircleObb', () => {
  it('unghi 0 = identic cu varianta AABB (src/engine/math)', () => {
    // dreptunghi: centru (5,5), halfW 5, halfL 5 = rect-ul din math (0,0,10,10)
    const obb = resolveCircleObb(10.4, 5, 1, 5, 5, 5, 5, 0);
    const aabb = resolveCircleRect(10.4, 5, 1, { x: 0, y: 0, w: 10, h: 10 });
    expect(close(obb.x, aabb.x)).toBe(true);
    expect(close(obb.z, aabb.z)).toBe(true);
  });

  it('centru in interior: iese pe cea mai apropiata fata (caz limita)', () => {
    const push = resolveCircleObb(0, 0, 1, 0, 0, 5, 5, 0);
    // toate fetele la distanta 5: alege X cu semn pozitiv
    expect(close(push.x, 6)).toBe(true);
    expect(close(push.z, 0)).toBe(true);
  });

  it('dreptunghi rotit 90°: impinge pe axa lunga (lungimea acum pe X)', () => {
    // halfW 2 (pe Z dupa rotatie), halfL 5 (pe X dupa rotatie)
    const push = resolveCircleObb(5.4, 0, 1, 0, 0, 2, 5, Math.PI / 2);
    expect(close(push.x, 0.6)).toBe(true);
    expect(close(push.z, 0)).toBe(true);
  });

  it('nu se atinge -> zero push', () => {
    const push = resolveCircleObb(30, 30, 1, 0, 0, 2, 5, 0.7);
    expect(push.x).toBe(0);
    expect(push.z).toBe(0);
  });
});

describe('circleCircleResolve', () => {
  it('impinge A in afara lui B (caz fericit)', () => {
    const push = circleCircleResolve(0, 0, 1, 1.2, 0, 1);
    const dist = Math.hypot(0 + push.x - 1.2, 0 + push.z - 0);
    expect(close(dist, 2)).toBe(true);
    expect(push.x).toBeLessThan(0);
  });

  it('cercuri departe: fara push', () => {
    const push = circleCircleResolve(0, 0, 1, 10, 0, 1);
    expect(push.x).toBe(0);
    expect(push.z).toBe(0);
  });

  it('cercuri concentrice: impinge pe +x (caz limita)', () => {
    const push = circleCircleResolve(0, 0, 1, 0, 0, 1);
    expect(close(push.x, 1)).toBe(true);
  });
});

describe('rayRect', () => {
  const rect = { x: 0, y: 0, w: 10, h: 10 };

  it('raza verticala intra in dreptunghi la t corect', () => {
    const t = rayRect(5, -1, 0, 1, rect);
    expect(t).not.toBeNull();
    expect(close(t as number, 1)).toBe(true);
  });

  it('raza care porneste din interior: t = 0 (caz limita)', () => {
    const t = rayRect(5, 5, 1, 0, rect);
    expect(t).toBe(0);
  });

  it('raza care se indeparteaza: null', () => {
    expect(rayRect(5, 15, 0, 1, rect)).toBeNull();
  });

  it('raza paralela in afara: null', () => {
    expect(rayRect(15, -1, 0, 1, rect)).toBeNull();
  });
});

describe('raycastRects', () => {
  it('intoarce cea mai apropiata atingere', () => {
    const rects = [
      { x: 0, y: 10, w: 5, h: 5 }, // atins la t=10
      { x: 0, y: 0, w: 5, h: 5 }, // atins la t=0? nu: raza vine din z negativ
    ];
    const hit = raycastRects(2.5, -5, 0, 1, rects);
    expect(hit).not.toBeNull();
    expect(hit?.rect).toBe(rects[1]);
    expect(hit?.t).toBeLessThanOrEqual(5);
  });

  it('nimic in cale -> null', () => {
    expect(raycastRects(50, 50, 1, 0, [{ x: 0, y: 0, w: 10, h: 10 }])).toBeNull();
  });
});
