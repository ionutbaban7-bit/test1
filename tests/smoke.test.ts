// Smoke test-uri pe module pure — verificam ca fundatia nu e fisurata.
import { describe, it, expect } from 'vitest';
import { hash01, resolveCircleRect, circleHitsRect, clamp } from '../src/engine/math';

describe('math', () => {
  it('hash01 e deterministic si in [0,1)', () => {
    const a = hash01(42.5);
    const b = hash01(42.5);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });

  it('clamp limiteaza valori', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-2, 0, 3)).toBe(0);
    expect(clamp(1, 0, 3)).toBe(1);
  });

  it('cerc vs dreptunghi: impinge corect in afara', () => {
    const rect = { x: 0, y: 0, w: 10, h: 10 };
    expect(circleHitsRect(14, 5, 1, rect)).toBe(false);
    expect(circleHitsRect(10.5, 5, 1, rect)).toBe(true);
    const push = resolveCircleRect(10.5, 5, 1, rect);
    // dupa aplicarea impingerii, nu se mai intersecteaza
    expect(circleHitsRect(10.5 + push.x, 5 + push.z, 1, rect)).toBe(false);
  });
});
