// Testing Agent (A15) — pathfinding: graful pe grilă, A*, virare, follower.
import { describe, it, expect } from 'vitest';
import {
  buildGridGraph,
  findPath,
  nearestNodeIndex,
  angleDiff,
  turnToward,
  PathFollower,
} from '../src/game/pathfind';

const GRID = buildGridGraph([0, 10, 20], [0, 10, 20]);

describe('buildGridGraph', () => {
  it('3x3 linii => 9 noduri', () => {
    expect(GRID.nodes).toHaveLength(9);
  });
  it('fiecare nod are 2-4 vecini (interior 4, colț 2)', () => {
    expect(GRID.adj[0]).toHaveLength(2); // colț (0,0)
    expect(GRID.adj[4]).toHaveLength(4); // interior (10,10)
    expect(GRID.adj[1]).toHaveLength(3); // margine, nu colț (0,10)
  });
});

describe('nearestNodeIndex', () => {
  it('găsește nodul cel mai apropiat', () => {
    expect(nearestNodeIndex(GRID, 9, 9)).toBe(4); // (10,10)
  });
});

describe('findPath (A*)', () => {
  it('rută dreaptă pe grilă între colțuri: 5 noduri adiacente', () => {
    const path = findPath(GRID, 1, 1, 19, 19);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(5);
    expect(path![0]).toEqual({ x: 0, z: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 20, z: 20 });
    // fiecare pas e o muchie (o singură axă, distanță 10)
    for (let i = 1; i < path!.length; i++) {
      const dx = Math.abs(path![i].x - path![i - 1].x);
      const dz = Math.abs(path![i].z - path![i - 1].z);
      expect((dx === 10 && dz === 0) || (dz === 10 && dx === 0)).toBe(true);
    }
  });
  it('același nod (start≈țintă): drum de un singur punct', () => {
    // ambele puncte au ca cel mai apropiat nod (10,10)
    const path = findPath(GRID, 9.9, 9.9, 10.1, 10.0);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(1);
  });
  it('o singură celulă (1x1) → tot drumul există', () => {
    const g1 = buildGridGraph([0], [0]);
    expect(findPath(g1, 0, 0, 0, 0)).not.toBeNull();
  });
});

describe('angleDiff', () => {
  it('normalizează diferențe mari', () => {
    expect(Math.abs(angleDiff(0.1, 6.2))).toBeLessThan(1);
  });
  it('diferența de 180° rămâne ~PI', () => {
    expect(Math.abs(angleDiff(0, Math.PI))).toBeCloseTo(Math.PI, 5);
  });
});

describe('turnToward', () => {
  it('se rotește spre țintă cu viteza maximă limitată', () => {
    // ținta e la +90° (est), dar maxTurn e doar 1 rad/s
    const yaw = turnToward(0, 10, 0, 0, 0, 1, 1);
    expect(yaw).toBeCloseTo(1, 5);
  });
  it('nu se mișcă dacă e deja îndreptat spre țintă', () => {
    const yaw = turnToward(0, 0, 10, 0, 0, 1, 1); // ținta e în față (+z)
    expect(Math.abs(yaw)).toBeLessThan(1e-9);
  });
});

describe('PathFollower', () => {
  const path = [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
  ];
  it('avansează când atinge waypoint-ul curent', () => {
    const f = new PathFollower(path, 5);
    expect(f.current()).toEqual({ x: 0, z: 0 });
    f.advance(4, 0); // în raza 5 de (0,0)
    expect(f.current()).toEqual({ x: 10, z: 0 });
    f.advance(12, 0);
    expect(f.done()).toBe(true);
    expect(f.current()).toBeNull();
  });
});
