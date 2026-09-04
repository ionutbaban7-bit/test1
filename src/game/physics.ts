// ============================================================
// BACKEND AGENT — livrabil A1: „Sistemul de coliziuni”
// Modul PUR de fizică 2D (planul x/z, „sus” = y ignorat).
// FĂRĂ dependențe de Three.js → testabil în Node (Vitest).
// Documentat cu API specs pentru Frontend/Integration.
// ============================================================

import { Rect, clamp, resolveCircleRect } from '../engine/math';

export type { Rect };

/**
 * API — coliziuni (toate coordonatele în unități de lume, x/z):
 *
 * collideAgainstRects(x, z, r, rects, limit?) → { x, z, touched }
 *   - rezolvă un cerc (raza r) contra unei liste de dreptunghiuri AABB;
 *   - touched = true dacă a fost împins de cel puțin un dreptunghi;
 *   - clamp final la |coord| <= limit (limita lumii).
 * resolveCircleObb(x, z, r, cx, cz, halfW, halfL, angle) → { x, z }
 *   - rezolvă cerc contra unui dreptunghi rotit (mașinile parcate,
 *     unghiul în radiani, halfW = jumătate lățime, halfL = jumătate lungime).
 * circleCircleResolve(ax, az, ar, bx, bz, br) → { x, z }
 *   - împingere pentru cercul A ca să nu se suprapună cu cercul B.
 * rayRect(ox, oz, dx, dz, rect) → t | null
 *   - distanța (parametru t) la care raza atinge dreptunghiul; null dacă nu-l atinge.
 * raycastRects(ox, oz, dx, dz, rects) → { t, rect } | null
 *   - prima atingere dintr-o listă (pentru conuri de vedere / foc hit-scan).
 */

/** Rezolvă un cerc contra unei liste de AABB-uri (lumea + vehiculele statice). */
export function collideAgainstRects(
  x: number,
  z: number,
  r: number,
  rects: Rect[],
  limit = Infinity,
): { x: number; z: number; touched: boolean } {
  let px = x;
  let pz = z;
  let touched = false;
  for (const rect of rects) {
    const push = resolveCircleRect(px, pz, r, rect);
    if (push.x !== 0 || push.z !== 0) {
      px += push.x;
      pz += push.z;
      touched = true;
    }
  }
  px = clamp(px, -limit, limit);
  pz = clamp(pz, -limit, limit);
  return { x: px, z: pz, touched };
}

/**
 * Rezolvă cerc vs dreptunghi ROTIT (mașină parcată cu yaw oarecare).
 * Returnează vectorul cu care trebuie mutat centrul cercului.
 */
export function resolveCircleObb(
  x: number,
  z: number,
  r: number,
  cx: number,
  cz: number,
  halfW: number,
  halfL: number,
  angle: number,
): { x: number; z: number } {
  // 1) aducem centrul cercului în sistemul local al dreptunghiului (rotație -angle)
  const dx = x - cx;
  const dz = z - cz;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const lx = dx * c + dz * s;
  const lz = -dx * s + dz * c;

  // 2) cel mai apropiat punct al dreptunghiului (în local)
  const nx = clamp(lx, -halfW, halfW);
  const nz = clamp(lz, -halfL, halfL);
  const ex = lx - nx;
  const ez = lz - nz;
  const d2 = ex * ex + ez * ez;
  if (d2 >= r * r) return { x: 0, z: 0 };

  let pushLx: number;
  let pushLz: number;
  if (d2 > 1e-12) {
    // centrul e în afara dreptunghiului: împingem pe direcția normalei
    const d = Math.sqrt(d2);
    const push = (r - d) / d;
    pushLx = ex * push;
    pushLz = ez * push;
  } else {
    // centrul e ÎN INTERIOR: ieșim pe cea mai apropiată față (+ raza)
    const penX = halfW - Math.abs(lx);
    const penZ = halfL - Math.abs(lz);
    if (penX <= penZ) {
      pushLx = (lx >= 0 ? 1 : -1) * (penX + r);
      pushLz = 0;
    } else {
      pushLx = 0;
      pushLz = (lz >= 0 ? 1 : -1) * (penZ + r);
    }
  }

  // 3) rotim împingerea înapoi în sistemul lumii
  return {
    x: pushLx * c - pushLz * s,
    z: pushLx * s + pushLz * c,
  };
}

/** Împinge cercul A în afara cercului B (B rămâne fix). */
export function circleCircleResolve(
  ax: number,
  az: number,
  ar: number,
  bx: number,
  bz: number,
  br: number,
): { x: number; z: number } {
  const dx = ax - bx;
  const dz = az - bz;
  const minD = ar + br;
  const d2 = dx * dx + dz * dz;
  if (d2 >= minD * minD) return { x: 0, z: 0 };
  if (d2 > 1e-12) {
    const d = Math.sqrt(d2);
    const push = minD - d;
    return { x: (dx / d) * push, z: (dz / d) * push };
  }
  // cercuri concentrice: impingem arbitrar pe +x
  return { x: minD * 0.5, z: 0 };
}

/**
 * Raza (ox,oz) cu direcția (dx,dz) vs dreptunghi AABB.
 * Returnează t >= 0 la care raza intră în dreptunghi (0 dacă pornește dinăuntru),
 * sau null dacă nu îl atinge.
 */
export function rayRect(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  rect: Rect,
): number | null {
  let tMin = 0;
  let tMax = Infinity;
  const slab = (o: number, d: number, min: number, max: number): boolean => {
    if (Math.abs(d) < 1e-9) return o >= min && o <= max;
    let t1 = (min - o) / d;
    let t2 = (max - o) / d;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    return tMin <= tMax;
  };
  if (!slab(ox, dx, rect.x, rect.x + rect.w)) return null;
  if (!slab(oz, dz, rect.y, rect.y + rect.h)) return null;
  if (tMax < 0) return null;
  return tMin < 0 ? 0 : tMin;
}

/** Prima atingere a razei dintr-o listă de dreptunghiuri (null dacă nu atinge nimic). */
export function raycastRects(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  rects: Rect[],
): { t: number; rect: Rect } | null {
  let best: { t: number; rect: Rect } | null = null;
  for (const rect of rects) {
    const t = rayRect(ox, oz, dx, dz, rect);
    if (t !== null && (best === null || t < best.t)) {
      best = { t, rect };
    }
  }
  return best;
}
