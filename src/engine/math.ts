// Utilitare mici de matematică / coliziuni — fără dependențe, testabile.

export interface Rect {
  x: number; // coltul minim (est)
  y: number; // coltul minim (map north-south, devine Z in lumea 3D)
  w: number;
  h: number;
}

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Hash deterministic 0..1 dintr-un numar (folosit la generarea orasului cu seed). */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const dist2 = (ax: number, az: number, bx: number, bz: number): number => {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
};

/** Test cerc (centru cx,cz, raza r) vs dreptunghi (plan x,z). */
export function circleHitsRect(
  cx: number,
  cz: number,
  r: number,
  rect: Rect,
): boolean {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const nz = clamp(cz, rect.y, rect.y + rect.h);
  return dist2(cx, cz, nx, nz) < r * r;
}

/**
 * Impinge un cerc in afara unui dreptunghi.
 * Returneaza vectorul {x,z} cu care trebuie mutat centrul ca sa nu se mai suprapuna.
 */
export function resolveCircleRect(
  cx: number,
  cz: number,
  r: number,
  rect: Rect,
): { x: number; z: number } {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const nz = clamp(cz, rect.y, rect.y + rect.h);
  let dx = cx - nx;
  let dz = cz - nz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return { x: 0, z: 0 };
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    const push = r - d;
    return { x: (dx / d) * push, z: (dz / d) * push };
  }
  // centrul e in interiorul dreptunghiului: iesim pe cea mai apropiata latura
  const left = cx - rect.x;
  const right = rect.x + rect.w - cx;
  const top = cz - rect.y;
  const bottom = rect.y + rect.h - cz;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: -(left + r), z: 0 };
  if (m === right) return { x: right + r, z: 0 };
  if (m === top) return { z: -(top + r), x: 0 };
  return { z: bottom + r, x: 0 };
}
