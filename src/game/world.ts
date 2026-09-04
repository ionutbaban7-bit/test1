// Generatorul orasului — „Bucuresti Centru” (zona Unirii).
// Data-driven, deterministic (hash cu valori fixe): acelasi oras la fiecare incarcare.
// Stil: blocuri comuniste + drumuri pe grila + Bulevardul Unirii lat + repere iconice.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash01, Rect, dist2 } from '../engine/math';

export interface SpawnPoint {
  x: number;
  z: number;
  yaw: number;
  defId: string;
}

export interface WorldData {
  obstacles: Rect[];
  spawnPoints: SpawnPoint[];
  grillPoints: { x: number; z: number }[];
  thugPoints: { x: number; z: number }[];
  walkZones: Rect[];
  trees: number;
}

export interface BuiltWorld<T extends WorldData = WorldData> {
  group: THREE.Group;
  data: T;
}

// --- geometria drumurilor (grila de 96 m, Bulevardul pe y=-192) ---
export const CITY_GRID = [-384, -288, -192, -96, 0, 96, 192, 288, 384];
const ROADS = CITY_GRID;
const BOULEVARD = -192;
const HALF = 10;
const BOULEVARD_HALF = 22;
const ROAD_COLOR = 0x45454d;

// zona pietonala/excluderi in care NU se genereaza blocuri
interface Circle { x: number; z: number; r: number }
const EXCL: Circle[] = [
  { x: -340, z: -333, r: 80 }, // Palatul
  { x: -300, z: -257, r: 64 }, // esplanada
  { x: 0, z: -192, r: 105 }, // Piata Unirii
  { x: 48, z: -72, r: 80 }, // centrul vechi
  { x: 200, z: -246, r: 95 }, // piata Obor
  { x: -168, z: -120, r: 70 }, // parc 1
  { x: 330, z: -34, r: 55 }, // parc 2
];
const PLAZA_RECTS: Rect[] = [
  { x: -376, y: -298, w: 162, h: 82 }, // esplanada Palatului
  { x: 116, y: -296, w: 180, h: 82 }, // piata Obor
];

const BLOCK_COLORS = [0xb3a68c, 0xc0b396, 0xa89c85, 0xcfc3a8, 0xbfb294, 0x9da08c];
const HOUSE_COLORS = [0xd9b8a0, 0xc9a8a0, 0xb9c9cf, 0xd9c57f, 0xd3a08c, 0xa8b9c9];
const TREE_GREENS = [0x3f7a3c, 0x4d8a44, 0x356b33];

const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c });

function merged(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
}

function treeMesh(h: number): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.14, 0.2, 1.6, 6);
  trunk.translate(0, 0.8, 0);
  const crown = new THREE.ConeGeometry(h * 0.34, h * 1.7, 7);
  crown.translate(0, 1.6 + h * 0.85, 0);
  return merged([trunk, crown]);
}

export function buildWorld(): BuiltWorld {
  const group = new THREE.Group();
  const obstacles: Rect[] = [];
  const spawnPoints: SpawnPoint[] = [];
  const grillPoints: { x: number; z: number }[] = [];
  const thugPoints: { x: number; z: number }[] = [];
  const walkZones: Rect[] = [];
  let trees = 0;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), mat(0x5b7f4a));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  group.add(ground);

  const addRect = (x: number, z: number, w: number, d: number): void => {
    obstacles.push({ x: x + 0.5, y: z + 0.5, w: w - 1, h: d - 1 });
  };

  const addPlane = (w: number, d: number, x: number, z: number, c: number, y: number): void => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(c));
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, y, z);
    group.add(p);
  };

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    c: number,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };

  // --- asfalt: benzile orizontale + verticale + bulevardul ---
  for (const r of ROADS) {
    if (r !== BOULEVARD) addPlane(860, 20, 0, r, ROAD_COLOR, 0.045);
  }
  for (const c of ROADS) {
    addPlane(20, 860, c, 0, ROAD_COLOR, 0.044);
  }
  addPlane(868, 44, 0, BOULEVARD, ROAD_COLOR, 0.046);
  // marcaje bulevard
  addPlane(850, 0.5, 0, BOULEVARD, 0xd8d8c0, 0.061);
  addPlane(850, 0.5, 0, BOULEVARD - 10.5, 0xc9c9b2, 0.06);
  addPlane(850, 0.5, 0, BOULEVARD + 10.5, 0xc9c9b2, 0.06);

  const hHalf = (cy: number): number => (cy === BOULEVARD ? BOULEVARD_HALF : HALF);

  const inCircle = (x: number, z: number, c: Circle): boolean => dist2(x, z, c.x, c.z) < c.r * c.r;
  const inAnyCircle = (x: number, z: number): boolean => EXCL.some((c) => inCircle(x, z, c));
  const inAnyRect = (x: number, z: number): boolean =>
    PLAZA_RECTS.some((r) => x > r.x && x < r.x + r.w && z > r.y && z < r.y + r.h);
  const parkR = (x: number, z: number): Circle | null => {
    for (const c of EXCL) {
      if ((c.x === -168 && c.z === -120) || (c.x === 330 && c.z === -34)) {
        if (inCircle(x, z, c)) return c;
      }
    }
    return null;
  };

  const onRoad = (x: number, z: number): boolean => {
    for (const v of ROADS) {
      if (Math.abs(x - v) < 13) return true;
      if (Math.abs(z - v) < (v === BOULEVARD ? 24 : 13)) return true;
    }
    return false;
  };

  // --- celule de oras intre drumuri ---
  for (let i = 0; i < ROADS.length - 1; i++) {
    const z0 = ROADS[i] + hHalf(ROADS[i]) + 4;
    const z1 = ROADS[i + 1] - hHalf(ROADS[i + 1]) - 4;
    if (z1 - z0 < 10) continue;
    for (let j = 0; j < ROADS.length - 1; j++) {
      const x0 = ROADS[j] + HALF + 4;
      const x1 = ROADS[j + 1] - HALF - 4;
      if (x1 - x0 < 10) continue;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const key = i * 31 + j * 17 + 5;
      if (inAnyCircle(cx, cz) || inAnyRect(cx, cz)) continue;
      const park = parkR(cx, cz);
      if (park) {
        addPlane(x1 - x0, z1 - z0, cx, cz, 0x5fa04e, 0.012);
        // copaci in parc (evitam drumurile de pe langa)
        for (let t = 0; t < 5; t++) {
          const tx = x0 + 10 + hash01(key * 3 + t * 7) * (x1 - x0 - 20);
          const tz = z0 + 10 + hash01(key * 5 + t * 11) * (z1 - z0 - 20);
          if (!onRoad(tx, tz)) {
            const g = treeMesh(3 + hash01(key + t) * 2);
            const m = new THREE.Mesh(
              g,
              mat(TREE_GREENS[Math.floor(hash01(key + t * 3) * 3)]),
            );
            m.position.set(tx, 0, tz);
            group.add(m);
            trees++;
            addRect(tx - 0.8, tz - 0.8, 1.6, 1.6);
          }
        }
        continue;
      }
      const h = hash01(key);
      if (h < 0.72) {
        // bloc comunist
        const m = 5 + hash01(key + 9) * 6;
        const w = x1 - x0 - m * 2;
        const d = z1 - z0 - m * 2;
        const bx = x0 + m;
        const bz = z0 + m;
        const bh = 15 + hash01(key + 3) * 16;
        addBox(w, bh, d, bx + w / 2, bh / 2, bz + d / 2, BLOCK_COLORS[Math.floor(hash01(key + 1) * BLOCK_COLORS.length)]);
        addRect(bx, bz, w, d);
      } else if (h < 0.9) {
        // casa mica (centrul vechi / cartier)
        const w = 14 + hash01(key + 4) * 10;
        const d = 14 + hash01(key + 6) * 10;
        const bx = x0 + 6 + hash01(key + 7) * (x1 - x0 - w - 12);
        const bz = z0 + 6 + hash01(key + 8) * (z1 - z0 - d - 12);
        const bh = 7 + hash01(key + 11) * 5;
        addBox(w, bh, d, bx + w / 2, bh / 2, bz + d / 2, HOUSE_COLORS[Math.floor(hash01(key + 12) * HOUSE_COLORS.length)]);
        addRect(bx, bz, w, d);
      } else if (h < 0.95) {
        // spatiu verde intre blocuri
        addPlane(x1 - x0 - 14, z1 - z0 - 14, cx, cz, 0x639b52, 0.012);
        for (let t = 0; t < 3; t++) {
          const g = treeMesh(3 + hash01(key * 2 + t) * 2.5);
          const m = new THREE.Mesh(g, mat(TREE_GREENS[Math.floor(hash01(key + t) * 3)]));
          m.position.set(x0 + 18 + hash01(key * 3 + t) * (x1 - x0 - 36), 0, z0 + 18 + hash01(key + t * 5) * (z1 - z0 - 36));
          group.add(m);
          trees++;
          addRect(m.position.x - 0.8, m.position.z - 0.8, 1.6, 1.6);
        }
      } else {
        // curte de parcare
        addPlane(x1 - x0 - 8, z1 - z0 - 8, cx, cz, 0x77776f, 0.013);
      }
    }
  }

  // --- Piața Unirii: sensul giratoriu cu fantani ---
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(96, 28), mat(0xb9b0a0));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.09, BOULEVARD);
  group.add(plaza);
  const plazaInner = new THREE.Mesh(new THREE.CircleGeometry(42, 24), mat(0xc6bdad));
  plazaInner.rotation.x = -Math.PI / 2;
  plazaInner.position.set(0, 0.095, BOULEVARD);
  group.add(plazaInner);
  for (const [fx, fz] of [
    [-42, -150],
    [42, -150],
    [-42, -234],
    [42, -234],
  ] as const) {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(6.5, 16), mat(0x3f9dc4));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(fx, 0.1, fz);
    group.add(pool);
    addBox(1.2, 1.4, 1.2, fx, 1.4, fz, 0xdfe6ea);
    addRect(fx - 7, fz - 7, 14, 14);
  }
  // statuie ecvestra (cal patrat, ca la noi)
  const sx = 0;
  const sz = BOULEVARD;
  addBox(3.6, 2.6, 3.6, sx, 1.3, sz, 0xcfc4ae);
  addRect(sx - 2, sz - 2, 4, 4);
  const horse = new THREE.Group();
  const hm = mat(0x8d8578);
  const addH = (w: number, h: number, d: number, x: number, y: number, z: number): void => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hm);
    b.position.set(x, y, z);
    horse.add(b);
  };
  addH(0.5, 2.2, 0.5, -1.1, 1.1, 1.1);
  addH(0.5, 2.2, 0.5, 1.1, 1.1, 1.1);
  addH(0.5, 2.2, 0.5, -1.1, 1.1, -1.1);
  addH(0.5, 2.2, 0.5, 1.1, 1.1, -1.1);
  addH(3.2, 1.5, 1.4, 0, 2.6, 0);
  addH(1.2, 0.9, 0.9, 0.6, 3.2, -0.7);
  const rider = new THREE.Group();
  rider.position.set(0.2, 3.2, 0.3);
  const rm = mat(0x3b3f45);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 1.6, 8), rm);
  rider.add(cyl);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), mat(0xd8b090));
  head.position.y = 1.1;
  rider.add(head);
  horse.add(rider);
  horse.position.set(sx, 0, sz);
  group.add(horse);

  // --- Bulevardul: copaci pe trotuare (stanga si dreapta) ---
  for (const sideZ of [BOULEVARD - 24.5, BOULEVARD + 24.5]) {
    for (let x = -352; x < 352; x += 26) {
      const skipCrossing = ROADS.some((v) => Math.abs(x - v) < 16);
      const nearPlaza = dist2(x, sideZ, 0, BOULEVARD) < 104 * 104;
      if (skipCrossing || nearPlaza) continue;
      const g = treeMesh(3.4);
      const m = new THREE.Mesh(g, mat(TREE_GREENS[Math.floor(hash01(x + sideZ) * 3)]));
      m.position.set(x, 0, sideZ);
      group.add(m);
      trees++;
      addRect(x - 0.8, sideZ - 0.8, 1.6, 1.6);
    }
  }

  // --- Palatul Parlamentului (versiunea „Divizia Betoane”) ---
  const pz0 = -366;
  const px0 = -376;
  addPlane(162, 82, px0 + 81, pz0 + 41, 0xb9b0a0, 0.09); // esplanada + platforma palat
  walkZones.push({ x: px0 + 2, y: pz0 + 2, w: 158, h: 78 });
  const pc = 0xd9d2bd;
  addBox(72, 18, 66, -340, 9, -333, pc);
  addBox(48, 12, 34, -340, 24, -321, pc);
  addBox(26, 9, 22, -340, 34.5, -314, 0xc4bba4);
  for (const tx of [-356, -324]) {
    addBox(10, 6, 6, tx, 39, -306, pc);
  }
  addRect(px0 + 1, pz0 + 1, 70, 64);
  for (let k = 0; k < 10; k++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 7.5, 8), mat(0xefe8d6));
    col.position.set(-364 + k * 5.4, 3.75, -299.5);
    group.add(col);
  }
  addBox(54, 1.2, 1.8, -340, 7.6, -299.5, 0xc4bba4);
  // steaguri pe esplanada
  for (let k = 0; k < 5; k++) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 7, 6), mat(0x8d8d8d));
    pole.position.set(-352 + k * 26, 3.5, -272);
    group.add(pole);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 0.9), mat(0xc8402c));
    flag.position.set(-352 + k * 26, 7, -272.6);
    group.add(flag);
  }
  addRect(-376, -370, 74, 8); // zid palat lateral (nu se trece prin el)

  // --- Piata Obor (mici & tarabe) ---
  addPlane(180, 82, 206, -255, 0xb9b0a0, 0.091);
  addBox(70, 8, 26, 249, 4, -279, 0x9aa0a8); // hala
  addRect(214, -292, 70, 26);
  for (let i = 0; i < 6; i++) {
    const c = [0xc8402c, 0xd9b334, 0x3f7ab3, 0x3f9d5a, 0xd98a3a, 0xa86ba8][i % 6];
    const sx2 = 133 + (i % 3) * 22;
    const sz2 = -252 - Math.floor(i / 3) * 18;
    addBox(9, 2.6, 7, sx2, 1.3, sz2, c); // taraba
    addBox(9, 0.4, 7, sx2, 0.2, sz2, 0x6a6a60);
    addRect(sx2 - 5, sz2 - 4, 10, 8);
  }
  for (let i = 0; i < 3; i++) {
    const gx = 133 + i * 24;
    addBox(7, 1, 3, gx, 0.5, -219, 0x44444a); // gratarul
    grillPoints.push({ x: gx, z: -219 });
    thugPoints.push({ x: gx - 8 + hash01(i * 7) * 16, z: -230 - hash01(i * 3) * 16 });
  }
  thugPoints.push({ x: 150, z: -245 }, { x: 196, z: -230 });
  walkZones.push({ x: 118, y: -294, w: 176, h: 78 });

  // --- Centrul Vechi: case colorate in jurul unei piete mici ---
  addPlane(76, 76, 48, -72, 0xb9b0a0, 0.09);
  addPlane(24, 24, 48, -72, 0xc6bdad, 0.095);
  addBox(6, 0.8, 6, 48, 0.4, -72, 0x6e6e64); // fantana
  addRect(44, -76, 8, 8);
  const housePts: { x: number; z: number; w: number; d: number; c: number }[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.3;
    const hx = 48 + Math.cos(a) * 37 + hash01(k * 3) * 6;
    const hz = -72 + Math.sin(a) * 37 + hash01(k * 7) * 6;
    const nearRoad =
      ROADS.some((v) => Math.abs(hx - v) < 16) || ROADS.some((v) => Math.abs(hz - v) < 16);
    if (nearRoad) continue;
    housePts.push({
      x: hx,
      z: hz,
      w: 11 + hash01(k) * 6,
      d: 11 + hash01(k * 5) * 6,
      c: HOUSE_COLORS[Math.floor(hash01(k * 9) * HOUSE_COLORS.length)],
    });
  }
  for (const hp of housePts) {
    addBox(hp.w, 7 + hash01(hp.x) * 4, hp.d, hp.x, 4, hp.z, hp.c);
    addRect(hp.x - hp.w / 2, hp.z - hp.d / 2, hp.w, hp.d);
  }
  walkZones.push({ x: 8, y: -106, w: 80, h: 68 });

  // --- Parcuri mari (verdeata + alei) ---
  for (const [pcx, pcz, pr] of [
    [-168, -120, 70],
    [330, -34, 55],
  ] as const) {
    const pg = new THREE.Mesh(new THREE.CircleGeometry(pr, 24), mat(0x63a852));
    pg.rotation.x = -Math.PI / 2;
    pg.position.set(pcx, 0.012, pcz);
    group.add(pg);
    for (let t = 0; t < 16; t++) {
      const ang = hash01(t * 13) * Math.PI * 2;
      const rr = 4 + hash01(t * 29) * (pr - 8);
      const tx = pcx + Math.cos(ang) * rr;
      const tz = pcz + Math.sin(ang) * rr;
      if (onRoad(tx, tz) || Math.abs(tx) > 380 || Math.abs(tz) > 380) continue;
      const g = treeMesh(3.6 + hash01(t) * 2);
      const m = new THREE.Mesh(g, mat(TREE_GREENS[Math.floor(hash01(t * 3) * 3)]));
      m.position.set(tx, 0, tz);
      group.add(m);
      trees++;
      addRect(tx - 0.8, tz - 0.8, 1.6, 1.6);
    }
    walkZones.push({ x: pcx - pr, y: pcz - pr, w: pr * 2, h: pr * 2 });
  }

  // --- trotuare bulevard (zone de mers pentru pietoni) ---
  addPlane(860, 4, 0, BOULEVARD - 24, 0x9d968a, 0.02);
  addPlane(860, 4, 0, BOULEVARD + 24, 0x9d968a, 0.02);
  walkZones.push({ x: -430, y: BOULEVARD - 26, w: 860, h: 4 });
  walkZones.push({ x: -430, y: BOULEVARD + 22, w: 860, h: 4 });

  // --- masini parcate (de furat) ---
  const carSpawns: [number, number, number, string][] = [
    [-120, -178, Math.PI / 2, 'dacia'], // langa jucator
    [140, -206, Math.PI / 2, 'duba'], // langa Obor
    [176, -206, Math.PI / 2, 'logan'],
    [300, -178, Math.PI / 2, 'taxi'], // estul bulevardului
    [96, -300, Math.PI, 'serie3'], // pe strada laterala
    [192, -60, Math.PI, 'aro'], // nord
  ];
  for (const [x, z, yaw, defId] of carSpawns) {
    spawnPoints.push({ x, z, yaw, defId });
  }

  // plimbaretul „Gigel” nu are nevoie, dar pietonii au zone (peste tot pe langa drumuri)
  walkZones.push({ x: -430, y: -166, w: 860, h: 4 }); // in fata cladirilor, nord bulevard
  walkZones.push({ x: -100, y: 20, w: 80, h: 60 }); // langa centrul vechi

  return {
    group,
    data: {
      obstacles,
      spawnPoints,
      grillPoints,
      thugPoints,
      walkZones,
      trees,
    },
  };
}

/** Limita hartii (nu exista viata dincolo de centura). */
export const WORLD_LIMIT = 470;
