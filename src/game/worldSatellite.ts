// SATUL „La Cruce” — lumea rurala de langa Brasov: drumuri de pamant, case cu
// garduri, crasma lui Micutu, primaria cu drapel, biserica, campuri cu fan,
// animale. Determinista (seed fix), data-driven, acelasi stil ca orasul.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash01, Rect } from '../engine/math';
import { BuiltWorld, SpawnPoint, WorldData } from './world';

export interface VillagerSpawn {
  x: number;
  z: number;
  kind: 'baba' | 'om';
  shirt: number;
  scarf: number; // culoarea baticului (0 = fara / caciula la oameni)
}

export interface SatWorldData extends WorldData {
  villagerSpawns: VillagerSpawn[];
  barPos: { x: number; z: number };
  primariaPos: { x: number; z: number };
  churchPos: { x: number; z: number };
}

export const SAT_LIMIT = 240;

const mat = (c: number): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color: c });

// drumurile: grila de 80 m, satele vechi nu-s pe bulevard
const ROADS = [-160, -80, 0, 80, 160];

export function buildSatelliteWorld(): BuiltWorld<SatWorldData> {
  const group = new THREE.Group();
  const obstacles: Rect[] = [];
  const spawnPoints: SpawnPoint[] = [];
  const villagerSpawns: VillagerSpawn[] = [];
  const walkZones: Rect[] = [];

  // pamantul satului
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(540, 540), mat(0x6d8a4e));
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const addPlane = (w: number, d: number, x: number, z: number, c: number, y: number): void => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(c));
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, y, z);
    group.add(p);
  };

  const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, c: number): void => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    group.add(m);
  };

  const addObs = (cx: number, cz: number, w: number, h: number): void => {
    obstacles.push({ x: cx - w / 2, y: cz - h / 2, w, h });
  };

  const fenceRect = (x: number, z: number, w: number, h: number): void => {
    addBox(w, 0.9, h, x + w / 2, 0.45, z + h / 2, 0x8a6a42);
    addObs(x + w / 2, z + h / 2, w, h);
  };

  const addTree = (x: number, z: number, h: number, c: number, r: number): void => {
    const t = new THREE.Mesh(treeGeo(h), mat(c));
    t.position.set(x, 0, z);
    group.add(t);
    addObs(x, z, r, r);
  };

  const addHaystack = (hx: number, hz: number, s: number): void => {
    const c = 0xd9b73f;
    addBox(3.0 * s, 0.7, 3.0 * s, hx, 0.35, hz, c);
    addBox(2.2 * s, 0.6, 2.2 * s, hx, 1.0, hz, 0xc9a72f);
    addBox(1.4 * s, 0.5, 1.4 * s, hx, 1.6, hz, 0xd9b73f);
    addObs(hx, hz, 3.4 * s, 3.4 * s);
  };

  // drumuri de pamant: orizontale + verticale + urme de caruta
  for (const r of ROADS) {
    addPlane(460, 15, 0, r, 0x8a7a5a, 0.01); // orizontale
    addPlane(15, 460, r, 0, 0x8a7a5a, 0.01); // verticale
  }
  for (let i = 0; i < 3; i++) addPlane(400, 0.4, 0, -5 + i * 5, 0x6e5f44, 0.015);

  // zonele de umblat: fasiile de drum
  for (const r of ROADS) {
    walkZones.push({ x: r - 6, y: -225, w: 12, h: 450 });
    walkZones.push({ x: -225, y: r - 6, w: 450, h: 12 });
  }
  walkZones.push({ x: -70, y: -70, w: 140, h: 140 }); // razoarele dintre case

  // celulele dintre drumuri (4×4)
  for (let i = 0; i < ROADS.length - 1; i++) {
    for (let j = 0; j < ROADS.length - 1; j++) {
      const z0 = ROADS[i] + 8;
      const z1 = ROADS[i + 1] - 8;
      const x0 = ROADS[j] + 8;
      const x1 = ROADS[j + 1] - 8;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const key = i * 4 + j;
      const h = hash01(key * 13.7 + 3);

      if (key === 10) {
        // ✅ curtea crasmei „La Micutu’” (celula est, mijloc)
        addPlane(x1 - x0, z1 - z0, cx, cz, 0x9a8f72, 0.015);
        const bx = cx - 10;
        const bz = cz;
        // crasma
        addBox(12, 3.0, 9, bx, 1.5, bz, 0xd9c9a8);
        addBox(13.6, 0.9, 10.4, bx, 3.45, bz, 0x7a4a32); // acoperis (plat, cu tigla)
        addBox(12, 0.5, 1.4, bx, 1.0, bz + 5.1, 0x5d4328); // prispa din fata
        addObs(bx - 6.2, bz - 4.5, 12.4, 9);
        // butoiul cu tuica + masa cu scaune
        addBox(1.3, 1.6, 1.3, cx + 8, 0.8, cz - 12, 0x6a4a2a);
        addBox(0.5, 0.7, 0.5, cx + 8, 1.9, cz - 12, 0x4a3a24);
        addBox(2.6, 0.1, 1.6, cx + 16, 1.05, cz - 4, 0x6a4a2a);
        addBox(0.5, 0.7, 0.5, cx + 14.2, 0.35, cz - 4, 0x7a5a3a);
        addBox(0.5, 0.7, 0.5, cx + 17.8, 0.35, cz - 4, 0x7a5a3a);
        addObs(cx + 14.7, cz - 3.5, 4.4, 1.2);
        // gardul curtii (cu poarta in gardul est)
        fenceRect(cx - 16, cz - 16, 32, 1);
        fenceRect(cx - 16, cz + 16, 32, 1);
        fenceRect(cx - 16, cz - 16, 1, 14);
        fenceRect(cx - 16, cz + 2, 1, 14);
        fenceRect(cx + 15, cz - 16, 1, 14);
        fenceRect(cx + 15, cz + 2, 1, 14);
        // sateni la crasma
        villagerSpawns.push({ x: cx + 10, z: cz - 14, kind: 'om', shirt: 0x5a3a24, scarf: 0 });
        villagerSpawns.push({ x: cx - 8, z: cz + 12, kind: 'om', shirt: 0x3a4a6a, scarf: 0 });
        villagerSpawns.push({ x: cx + 6, z: cz + 10, kind: 'baba', shirt: 0x7a3a5a, scarf: 0xc8402c });
      } else if (key === 2) {
        // ✅ primaria cu drapel (celula nord-est)
        addPlane(x1 - x0 - 6, z1 - z0 - 6, cx, cz, 0x8a9a6a, 0.015);
        addBox(11, 5.2, 9, cx, 2.6, cz, 0xe8dcc8);
        addBox(12.4, 1.0, 10.4, cx, 5.7, cz, 0x7a4a32);
        addObs(cx - 5.5, cz - 4.5, 11, 9);
        const fx = cx + 9;
        const fz = cz - 8;
        addBox(0.16, 6.6, 0.16, fx, 3.3, fz, 0x8a8a8a); // stalp
        addBox(0.05, 1.1, 0.9, fx, 6.5, fz - 0.55, 0x2a4a8a); // albastru
        addBox(0.05, 1.1, 0.9, fx, 5.4, fz - 0.55, 0xd9b334); // galben
        addBox(0.05, 1.1, 0.9, fx, 4.3, fz - 0.55, 0xb33a2c); // rosu
        addObs(fx - 0.4, fz - 1.2, 1.2, 2.6);
        // bancuta cu batranica
        addBox(2.4, 0.1, 0.7, cx - 10, 0.5, cz + 8, 0x7a5a3a);
        addBox(0.5, 0.55, 0.5, cx - 9.4, 0.27, cz + 8, 0x7a5a3a);
        addBox(0.5, 0.55, 0.5, cx - 10.6, 0.27, cz + 8, 0x7a5a3a);
        villagerSpawns.push({ x: cx - 10, z: cz + 8, kind: 'baba', shirt: 0x6a4a8a, scarf: 0xd9b334 });
        // cainele primariei + cusca
        addBox(2.0, 1.3, 1.5, cx - 14, 0.65, cz - 6, 0x7a5a3a);
        addObs(cx - 14, cz - 6, 2.2, 1.7);
        dog(group, cx - 14.8, cz - 5.2, 0x6a4a2a);
      } else if (key === 15) {
        // ✅ biserica de lemn (celula sud-est)
        addPlane(x1 - x0 - 6, z1 - z0 - 6, cx, cz, 0x8a9a6a, 0.015);
        addBox(8, 4.6, 11, cx, 2.3, cz, 0xd9d0b8);
        addBox(9.4, 1.3, 12.4, cx, 5.5, cz, 0x4a3a2a);
        addBox(2.6, 6.4, 2.6, cx + 6, 3.9, cz, 0xd9d0b8); // turla
        addBox(3.2, 1.5, 3.2, cx + 6, 7.6, cz, 0x4a3a2a);
        addBox(0.35, 1.0, 0.35, cx + 6, 8.8, cz, 0xd9b334); // cruce
        addObs(cx - 4, cz - 5.5, 8, 11);
        villagerSpawns.push({ x: cx - 12, z: cz + 4, kind: 'baba', shirt: 0x3a3a3a, scarf: 0xffffff });
      } else if (key === 7) {
        // ✅ „locul cu fanul” — unde se da cu coasa (celula est, sud)
        addPlane(x1 - x0, z1 - z0, cx, cz, 0x9aa84a, 0.01);
        for (let k = 0; k < 6; k++) {
          addHaystack(x0 + 10 + hash01(key * 3 + k) * (x1 - x0 - 20), z0 + 10 + hash01(key * 5 + k * 2) * (z1 - z0 - 20), 1 + hash01(key + k) * 0.7);
        }
        villagerSpawns.push({ x: cx - 10, z: cz - 4, kind: 'om', shirt: 0x7a6a4a, scarf: 0 });
        villagerSpawns.push({ x: cx + 12, z: cz + 6, kind: 'om', shirt: 0x4a5a3a, scarf: 0 });
      } else if (h < 0.5) {
        // ✅ casa taranului cu curte si gard
        const px = x0 + 10 + hash01(key * 3.1) * (x1 - x0 - 20);
        const pz = z0 + 10 + hash01(key * 5.7) * (z1 - z0 - 20);
        const cw = 8 + hash01(key * 7.3) * 3;
        const cd = 7 + hash01(key * 9.1) * 2;
        addBox(cw, 2.7, cd, px, 1.35, pz, hash01(key) > 0.5 ? 0xd9c9a8 : 0xc9e0d8);
        addBox(cw + 1.3, 0.8, cd + 1.3, px, 3.15, pz, hash01(key + 1) > 0.5 ? 0x7a4a32 : 0x8a6a4a);
        addObs(px, pz, cw, cd);
        // cotet + fan pe el
        addBox(2.2, 1.5, 2.2, px + cw / 2 + 3, 0.75, pz + 3, 0x9a8a6a);
        addBox(2.6, 0.5, 2.6, px + cw / 2 + 3, 1.8, pz + 3, 0xd9b73f);
        addObs(px + cw / 2 + 3, pz + 3, 2.6, 2.6);
        // gardul curtii
        const gw = cw + 8;
        const gd = cd + 8;
        const gx = px - gw / 2;
        const gz = pz - gd / 2;
        fenceRect(gx, gz, gw, 1);
        fenceRect(gx, gz + gd + 1, gw, 1);
        fenceRect(gx, gz, 1, gd + 2);
        fenceRect(gx + gw + 1, gz, 1, gd + 2);
      } else {
        // ✅ camp arat (brazde) cu fan adunat la margine
        for (let row = 0; row < 6; row++) {
          const w = (x1 - x0) / 6;
          addPlane(w - 0.5, z1 - z0 - 2, x0 + w * row + w / 2, cz, row % 2 === 0 ? 0x74522e : 0x82603a, 0.012);
        }
        for (let k = 0; k < 2; k++) {
          addHaystack(x0 + 6 + hash01(key * 3 + k) * (x1 - x0 - 12), z0 + 12 + hash01(key * 5 + k * 2) * (z1 - z0 - 24), 0.8 + hash01(key + k) * 0.5);
        }
      }
    }
  }

  // campuri mari in afara gardului de case (margini)
  for (let k = 0; k < 8; k++) {
    const hx = -210 + hash01(k * 7.7) * 420;
    const hz = k % 2 === 0 ? -226 : 226;
    addHaystack(hx, hz, 0.8 + hash01(k * 3) * 0.6);
  }

  // copaci de hotar + salcami pe langa drumuri
  for (let t = 0; t < 80; t++) {
    const ang = hash01(t * 7.7) * Math.PI * 2;
    const rr = 215 + hash01(t * 3.3) * 40;
    addTree(Math.cos(ang) * rr, Math.sin(ang) * rr, 3 + hash01(t) * 2.4, 0x3f6a35, 1.8);
  }
  for (let t = 0; t < 40; t++) {
    const along = -215 + t * 11;
    const side = (t % 2 === 0 ? 1 : -1) * 11;
    if (Math.abs(along) > 215) continue;
    addTree(along, side, 2.6 + hash01(t * 11) * 1.6, 0x4a7a40, 1.6);
  }
  for (let t = 0; t < 18; t++) {
    const tx = -180 + hash01(t * 5.1) * 360;
    const tz = -180 + hash01(t * 9.7) * 360;
    const nearRoadX = ROADS.some((r) => Math.abs(tx - r) < 13);
    const nearRoadZ = ROADS.some((r) => Math.abs(tz - r) < 13);
    if (nearRoadX || nearRoadZ) continue;
    addTree(tx, tz, 2.4 + hash01(t * 3) * 1.4, 0x4a7a40, 1.4);
  }

  // animale: porci, gaste, balta cu rate
  pig(group, -86, -40, 0xd8a8a8);
  pig(group, -82, -44, 0xd8a8a8);
  geese(group, 168, -100);
  geese(group, 164, -96);
  dog(group, 178, 96, 0x8a6a3a);
  dog(group, -168, 150, 0x6a4a2a);
  addPlane(30, 22, 222, -188, 0x3f8fb0, 0.012); // balta
  for (let r = 0; r < 7; r++) addBox(0.3, 1.0 + r * 0.12, 0.3, 208 + r * 4.2, 0.5 + r * 0.06, -196, 0x4a6a3a);
  addObs(222, -188, 34, 26);

  // 🚜 vehicule de furat prin sat — parcate PE drum (z=0, umerii drumului),
  // departe de intersectii si de garduri (zone garantat libere)
  spawnPoints.push({ x: -120, z: -5, yaw: Math.PI / 2, defId: 'tractor' }); // vest — folosit si de M8
  spawnPoints.push({ x: 124, z: -5, yaw: Math.PI, defId: 'cart' }); // est — folosit de M9
  spawnPoints.push({ x: -96, z: 5, yaw: Math.PI, defId: 'bicicleta' }); // vest (prinde tractorul in M8)
  spawnPoints.push({ x: -24, z: 5, yaw: Math.PI / 2, defId: 'mobra' });
  spawnPoints.push({ x: 60, z: 5, yaw: Math.PI / 2, defId: 'scuter' });

  // cativa sateni in plus, prin sat
  villagerSpawns.push({ x: -40, z: -96, kind: 'baba', shirt: 0x4a6a4a, scarf: 0xd9b334 });
  villagerSpawns.push({ x: 62, z: 26, kind: 'baba', shirt: 0x8a3a3a, scarf: 0x3f7ab3 });
  villagerSpawns.push({ x: -148, z: -32, kind: 'om', shirt: 0x6a5a4a, scarf: 0 });
  villagerSpawns.push({ x: 150, z: 20, kind: 'om', shirt: 0x4a5a7a, scarf: 0 });
  villagerSpawns.push({ x: -24, z: 96, kind: 'baba', shirt: 0x8a8a3a, scarf: 0x8a4a8a });
  villagerSpawns.push({ x: 30, z: -150, kind: 'om', shirt: 0x7a5a3a, scarf: 0 });

  return {
    group,
    data: {
      obstacles,
      spawnPoints,
      villagerSpawns,
      walkZones,
      grillPoints: [],
      thugPoints: [],
      trees: 0,
      barPos: { x: 40, z: 40 },
      primariaPos: { x: 40, z: -120 },
      churchPos: { x: 120, z: 120 },
    },
  };
}

function treeGeo(h: number): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.13, 0.2, 1.7, 6);
  trunk.translate(0, 0.85, 0);
  const crown = new THREE.ConeGeometry(h * 0.38, h * 1.8, 7);
  crown.translate(0, 1.7 + h * 0.9, 0);
  return mergeGeometries([trunk, crown], false);
}

function pig(group: THREE.Group, x: number, z: number, c: number): void {
  const g = new THREE.Group();
  const m = mat(c);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 1.3), m);
  body.position.y = 0.4;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.35), m);
  head.position.set(0, 0.42, 0.75);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.12), mat(0xc88a8a));
  snout.position.set(0, 0.35, 0.95);
  g.add(snout);
  for (const side of [1, -1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 0.15), m);
    leg.position.set(side * 0.28, 0.16, -0.45);
    g.add(leg);
    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 0.15), m);
    leg2.position.set(side * 0.28, 0.16, 0.45);
    g.add(leg2);
  }
  g.position.set(x, 0, z);
  g.rotation.y = hash01(x * 3 + z * 7) * Math.PI * 2;
  group.add(g);
}

function geese(group: THREE.Group, x: number, z: number): void {
  const g = new THREE.Group();
  const m = mat(0xe8e4da);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.44), m);
  body.position.y = 0.22;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.1), m);
  neck.position.set(0, 0.5, 0.22);
  g.add(neck);
  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.13), mat(0xd98a2a));
  beak.position.set(0, 0.52, 0.36);
  g.add(beak);
  g.position.set(x, 0, z);
  g.rotation.y = hash01(x * 7 + z * 3) * Math.PI * 2;
  group.add(g);
}

function dog(group: THREE.Group, x: number, z: number, c: number): void {
  const g = new THREE.Group();
  const m = mat(c);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 1.0), m);
  body.position.y = 0.25;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.28), m);
  head.position.set(0, 0.44, 0.5);
  g.add(head);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.55, 5), m);
  tail.position.set(0, 0.5, -0.62);
  tail.rotation.x = 0.6;
  g.add(tail);
  for (const side of [1, -1]) {
    for (const lz of [0.35, -0.35]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.11), m);
      leg.position.set(side * 0.17, 0.13, lz);
      g.add(leg);
    }
  }
  g.position.set(x, 0, z);
  g.rotation.y = 0.5;
  group.add(g);
}
