// ============================================================
// BACKEND AGENT (A12) — Pathfinding: waypoint-graph + A*.
// Hărțile noastre au drumuri pe grilă ⇒ nodurile = intersecții,
// muchiile = segmente de drum. Modul PUR (fără Three.js) → testabil.
// Recomandare Scout: raport 001 (waypoint graph + A*, reprezentare ≠ algoritm).
// ============================================================

export interface GridPoint {
  x: number;
  z: number;
}

export interface PathGraph {
  nodes: GridPoint[];
  adj: number[][];
}

/** Construiește graful din liniile de drum (grilă): nod = intersecție (x,z). */
export function buildGridGraph(xs: number[], zs: number[]): PathGraph {
  const nX = xs.length;
  const nZ = zs.length;
  const nodes: GridPoint[] = [];
  const adj: number[][] = [];
  const idx = (xi: number, zi: number): number => xi * nZ + zi;
  for (let xi = 0; xi < nX; xi++) {
    for (let zi = 0; zi < nZ; zi++) {
      nodes.push({ x: xs[xi], z: zs[zi] });
      adj.push([]);
    }
  }
  for (let xi = 0; xi < nX; xi++) {
    for (let zi = 0; zi < nZ; zi++) {
      const i = idx(xi, zi);
      if (xi > 0) adj[i].push(idx(xi - 1, zi));
      if (xi < nX - 1) adj[i].push(idx(xi + 1, zi));
      if (zi > 0) adj[i].push(idx(xi, zi - 1));
      if (zi < nZ - 1) adj[i].push(idx(xi, zi + 1));
    }
  }
  return { nodes, adj };
}

/** Indicele nodului cel mai apropiat de o poziție oarecare. */
export function nearestNodeIndex(g: PathGraph, x: number, z: number): number {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < g.nodes.length; i++) {
    const d = (g.nodes[i].x - x) ** 2 + (g.nodes[i].z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

const h2 = (a: GridPoint, b: GridPoint): number => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * A* între poziții oarecare: întoarce lista de NODURI (primul = cel mai apropiat
 * de start, ultimul = cel mai apropiat de țintă). Apelantul adaugă capetele
 * reale dacă vrea. null doar dacă graful e gol (altfel, pe grilă, există mereu drum).
 */
export function findPath(g: PathGraph, sx: number, sz: number, tx: number, tz: number): GridPoint[] | null {
  const n = g.nodes.length;
  if (n === 0) return null;
  const start = nearestNodeIndex(g, sx, sz);
  const goal = nearestNodeIndex(g, tx, tz);
  if (start === goal) return [{ x: g.nodes[start].x, z: g.nodes[start].z }];

  const goalNode = g.nodes[goal];
  const came = new Int32Array(n).fill(-1);
  const gScore = new Float64Array(n).fill(Infinity);
  const fScore = new Float64Array(n).fill(Infinity);
  gScore[start] = 0;
  fScore[start] = h2(g.nodes[start], goalNode);
  const open = new Set<number>([start]);

  while (open.size > 0) {
    let cur = -1;
    let curF = Infinity;
    for (const i of open) {
      if (fScore[i] < curF) {
        curF = fScore[i];
        cur = i;
      }
    }
    if (cur === -1) return null;
    if (cur === goal) break;
    open.delete(cur);
    for (const nb of g.adj[cur]) {
      const w = h2(g.nodes[cur], g.nodes[nb]);
      const tentative = gScore[cur] + w;
      if (tentative < gScore[nb]) {
        came[nb] = cur;
        gScore[nb] = tentative;
        fScore[nb] = tentative + h2(g.nodes[nb], goalNode);
        open.add(nb);
      }
    }
  }

  if (came[goal] === -1) return null;
  const path: GridPoint[] = [];
  let i = goal;
  while (i !== -1) {
    path.push({ x: g.nodes[i].x, z: g.nodes[i].z });
    i = came[i];
  }
  path.reverse();
  return path;
}

/** Diferența unghiulară normalizată în [-PI, PI]. */
export function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Rotește yaw spre țintă cu maxim `maxTurn` rad/s. */
export function turnToward(yaw: number, tx: number, tz: number, x: number, z: number, maxTurn: number, dt: number): number {
  const desired = Math.atan2(tx - x, tz - z);
  const d = angleDiff(yaw, desired);
  const step = maxTurn * dt;
  return yaw + Math.max(-step, Math.min(step, d));
}

/** Urmărește o listă de waypoint-uri: avansează când punctul curent e atins. */
export class PathFollower {
  readonly path: GridPoint[];
  idx = 0;
  private r2: number;

  constructor(path: GridPoint[], radius = 5) {
    this.path = path;
    this.r2 = radius * radius;
  }

  current(): GridPoint | null {
    return this.idx < this.path.length ? this.path[this.idx] : null;
  }

  advance(x: number, z: number): void {
    while (this.idx < this.path.length) {
      const w = this.path[this.idx];
      if ((w.x - x) ** 2 + (w.z - z) ** 2 < this.r2) this.idx++;
      else break;
    }
  }

  done(): boolean {
    return this.idx >= this.path.length;
  }
}
