// CONSTANȚA „La mare” — lumea de litoral: faleza cu promenadă, Cazinoul alb (parodie),
// plaja, Pescărușul Șchiop (restaurant cu pier), Portul cu containere + macara + bac decor.
// Deterministă (hash fix), data-driven, același stil low-poly retro ca orașul și satul.
// NOTĂ (scout 003): barca/bacul = DOAR decor în v1; marea e blocată mașinilor printr-o
// barieră intermitentă de stâlpi (pietonii trec printre ei, mașinile nu).

import * as THREE from 'three';
import * as look from '../engine/look';
import { hash01, Rect } from '../engine/math';
import { BuiltWorld, SpawnPoint, WorldData } from './world';

export const MARE_LIMIT = 420;

export const MARE_POS = {
  /** Autogara (vest) — punctul de intrare în lume. */
  autogara: { x: -330, z: -40, yaw: Math.PI / 2 },
  /** Pescărușul Șchiop — restaurantul lui Titi (M12). */
  pescarus: { x: -262, z: 64 },
  /** Cazinoul (decor + selfie-spot în viitor). */
  cazino: { x: 90, z: 124 },
  /** Zona de cargo din Port — Căpitanu' Spiridon (M12). */
  port: { x: 352, z: 45 },
  /** Linia de start a cursei M13 „Faleza nebună” (vest). */
  raceStart: { x: -352, z: 100 },
  /** Finish-ul cursei (la intrarea în Port). */
  raceFinishX: 332,
};

const FALEZA_Z = 100; // drumul de pe faleză (cursa)
const TOMIS_Z = -40; // bulevardul Tomis
const SEA_Z = 160; // linia țărmului (spre +z = marea)

const mat = (c: number, o?: look.MatOpts): THREE.MeshStandardMaterial => look.mat(c, o);

export function buildMareWorld(): BuiltWorld<WorldData> {
  const group = new THREE.Group();
  const obstacles: Rect[] = [];
  const spawnPoints: SpawnPoint[] = [];
  const walkZones: Rect[] = [];
  let trees = 0;

  const addPlane = (w: number, d: number, x: number, z: number, c: number, y: number): void => {
    // marea: suprafata lucioasa (reflexii de la soare); plaja: textura fina de nisip
    const isSea = c === 0x1f5f95 || c === 0x2a6fa8 || c === 0x3a82b8;
    const m = isSea
      ? look.mat(c, { roughness: 0.22, metalness: 0.35 })
      : c === 0xe8dcb0
        ? look.ground(c, 'sand', w, d, 18)
        : mat(c);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
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

  // --- marea (nord) + țărmul ---
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 620), look.ground(0xd9cf9f, 'sand', 900, 620));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -150;
  group.add(ground); // pământul litoralului
  addPlane(880, 320, 0, SEA_Z + 170, 0x1f5f95, 0.008); // marea adâncă
  addPlane(880, 90, 0, SEA_Z + 45, 0x2a6fa8, 0.012); // marea aproape de țărm
  for (let k = 0; k < 6; k++) addPlane(880, 2.6, 0, SEA_Z + 18 + k * 13, 0x3a82b8, 0.016); // valuri
  // spuma la țărm
  for (let x = -430; x < 440; x += 26) addBox(18, 0.08, 1.4, x, 0.03, SEA_Z + 3, 0xdfeef2);
  // plaja
  addPlane(880, 46, 0, SEA_Z - 23, 0xe8dcb0, 0.02);
  // parapet vizual pe faleză (nu blochează mersul — doar decor)
  for (let x = -430; x < 440; x += 8) addBox(4.6, 0.5, 0.5, x, 0.25, FALEZA_Z + 14.6, 0xd8d8d8);

  // --- drumurile: Faleza (z=100), Tomis (z=-40), Mamaia-Sud (z=-200) + verticale ---
  for (const r of [FALEZA_Z, TOMIS_Z, -200]) addPlane(880, r === FALEZA_Z ? 22 : 18, 0, r, 0x45454d, 0.03);
  for (const c of [-300, -150, 0, 150, 300]) addPlane(18, 540, c, -70, 0x45454d, 0.03);
  addPlane(880, 0.6, 0, FALEZA_Z - 10.4, 0xd8d8c0, 0.036); // marcaj faleză

  // zonele de umblat: drumuri + faleza pietonala + plaja
  for (const r of [FALEZA_Z, TOMIS_Z, -200]) {
    walkZones.push({ x: -430, y: r - 8, w: 860, h: 16 });
  }
  for (const c of [-300, -150, 0, 150, 300]) {
    walkZones.push({ x: c - 8, y: -270, w: 16, h: 370 });
  }
  walkZones.push({ x: -430, y: SEA_Z - 46, w: 860, h: 44 }); // plaja
  walkZones.push({ x: -430, y: -330, w: 860, h: 100 }); // spatele orașului

  // bariera anti-mașini la mare: stâlpi cu goluri (mașinile nu încap, pietonii da)
  for (let x = -432; x < 440; x += 10) {
    addBox(7, 1.1, 1.1, x, 0.55, SEA_Z + 4, 0xb9b0a0);
    addObs(x, SEA_Z + 4, 7, 1.1);
  }

  // --- Cazinoul (parodie „Alb cu Turnulețe”) pe faleză, lângă plajă ---
  {
    const cx = MARE_POS.cazino.x;
    const cz = MARE_POS.cazino.z;
    addPlane(74, 60, cx, cz, 0xd9d2c5, 0.025); // platoul cazinoului
    addBox(40, 10, 26, cx, 5, cz, 0xe8e2d2); // corp alb
    addBox(42, 2.4, 28, cx, 11.2, cz, 0xc4bba4); // cornișă
    for (const [dx, dz] of [[-17, -10], [17, -10], [-17, 10], [17, 10]] as const) {
      addBox(6.4, 16, 6.4, cx + dx, 8, cz + dz, 0xefe8d6); // turnuleț
      addBox(7.6, 1.6, 7.6, cx + dx, 17.2, cz + dz, 0xd9a33a); // acoperiș auriu
    }
    addBox(12, 3.2, 2.2, cx, 6.6, cz - 13.6, 0xd9d2c5); // portic
    for (let k = 0; k < 3; k++) addBox(0.8, 6.4, 0.8, cx - 6 + k * 6, 3.2, cz - 14.4, 0xb9b0a0);
    addObs(cx - 20, cz - 13, 40, 26);
    walkZones.push({ x: cx - 36, y: cz - 29, w: 72, h: 58 });
    // pescăruși decor pe acoperiș
    for (const px of [-14, 2, 16]) {
      addBox(0.5, 0.14, 0.9, cx + px, 12.6, cz + 8, 0xffffff);
      addBox(0.14, 0.3, 0.14, cx + px + 0.4, 12.74, cz + 8, 0xffffff);
    }
  }

  // --- Pescărușul Șchiop: restaurant + terasă + pier în larg ---
  {
    const rx = MARE_POS.pescarus.x;
    const rz = MARE_POS.pescarus.z;
    addPlane(64, 40, rx + 8, rz - 8, 0x9a8f72, 0.02); // curtea cu terasă
    addBox(24, 4.2, 14, rx, 2.1, rz, 0xe8dcc8); // sala
    addBox(26, 1.0, 16, rx, 4.7, rz, 0x8a4a32); // acoperiș
    addBox(4, 2.4, 3, rx + 6, 1.2, rz - 9, 0x8a5a3a); // toneta cu pește
    addBox(3.4, 0.3, 3.4, rx + 6, 2.8, rz - 9, 0xe8e2d2); // peștele de pe tonetă
    addBox(0.16, 7, 0.16, rx - 15, 3.5, rz - 6, 0x8a8a8a); // stâlp firmă
    addBox(4.6, 2.6, 0.3, rx - 15, 6.4, rz - 6, 0xc8402c); // firmă
    addObs(rx - 12, rz - 7, 24, 14);
    // pierul de lemn spre mare
    addPlane(8, 56, rx + 6, SEA_Z + 28, 0x9a7a52, 0.03);
    for (let k = 0; k < 6; k++) addBox(1.0, 1.8, 1.0, rx + 1 + k * 2, 0.9, SEA_Z + 8 + k * 9, 0x6a5a3a);
    addBox(0.5, 0.14, 0.9, rx + 7, 1.0, SEA_Z + 56, 0xffffff); // pescăruș pe stâlp
    addObs(rx + 2, SEA_Z + 28, 8, 52); // pierul e solid
    walkZones.push({ x: rx - 30, y: rz - 26, w: 84, h: 44 });
  }

  // --- case dobrogeene + hoteluri mici (compact, data-driven) ---
  const houses: [number, number, number, number, number][] = [
    [-296, 80, 12, 10, 0xd9b8a0], [-240, -120, 14, 12, 0xd3a08c], [-150, -120, 12, 10, 0xc9b9cf],
    [-60, -120, 14, 11, 0xd9c57f], [60, -120, 12, 10, 0xa8b9c9], [150, -120, 14, 12, 0xd9b8a0],
    [240, -120, 12, 10, 0xc9a8a0], [330, -120, 14, 11, 0xcfc3a8], [-270, -260, 13, 11, 0xd9c57f],
    [-140, -260, 14, 12, 0xc9b9cf], [30, -260, 12, 10, 0xd9b8a0], [150, -260, 13, 11, 0xa8b9c9],
    [-70, 70, 12, 10, 0xd3a08c], [40, 60, 12, 10, 0xb9c9cf], [190, 70, 13, 11, 0xd9c57f],
    [-190, 10, 13, 11, 0xc9a8a0], [-60, 10, 12, 10, 0xd9b8a0], [110, 10, 12, 10, 0xc9b9cf],
    [230, 10, 13, 11, 0xd3a08c], [330, 10, 12, 10, 0xcfc3a8],
  ];
  for (const [hx, hz, hw, hd, hc] of houses) {
    const wallH = 6 + (hash01(hx * 13.3 + hz) > 0.6 ? 3 : 0);
    addBox(hw, wallH, hd, hx, wallH / 2, hz, hc);
    addBox(hw + 1, 1.4, hd + 1, hx, wallH + 0.7, hz, 0x8a4a32);
    addObs(hx, hz, hw, hd);
    // cotet/grătar în curte
    addBox(1.4, 0.8, 1.4, hx + hw / 2 + 2, 0.4, hz + hd / 2 + 2, 0x6a5a3a);
  }
  // „Hotel Central” (turn 8 etaje lângă Tomis)
  addBox(16, 26, 14, -150, 13, -40, 0xd9d2c5);
  addBox(17, 2, 15, -150, 27, -40, 0xb9b0a0);
  addBox(14, 2.6, 2, -150, 15, -33, 0xc8402c); // firmă „HOTEL”
  addObs(-150, -40, 16, 14);

  // --- Portul (est): chei, containere, macara, bac decor ---
  {
    addPlane(150, 250, 370, -30, 0x9a9894, 0.02); // cheiul
    const cont = [0xc8402c, 0x3f7ab3, 0x3f9d5a, 0xd9b334, 0xd98a3a, 0x8a5aa8];
    const stacks: [number, number][] = [
      [308, -90], [330, -95], [390, -95], [415, -60], [320, -60], [400, -25], [310, -20], [415, 10],
    ];
    for (let s = 0; s < stacks.length; s++) {
      const [sx, sz] = stacks[s];
      const c = cont[s % cont.length];
      addBox(10, 2.8, 2.6, sx, 1.4, sz, c);
      addBox(10, 2.8, 2.6, sx, 4.2, sz + 2.9, c);
      addBox(10, 2.8, 2.6, sx, 7.0, sz, c);
      addObs(sx, sz - 1, 10, 8);
    }
    // macara
    addBox(2.6, 22, 2.6, 350, 11, -130, 0xd9b334);
    addBox(26, 2.2, 2.2, 363, 21, -130, 0xd9b334);
    addBox(2, 2, 2, 375, 20, -130, 0x8a6a3a); // contor
    // bacul „Mihail Kogălniceanu” — decor în larg
    addBox(20, 7, 7, 40, 3.5, SEA_Z + 90, 0x6a5a4a);
    addBox(14, 3, 6, 40, 8.5, SEA_Z + 88, 0xe8e2d2);
    addBox(6, 1.4, 1, 40, 10, SEA_Z + 87, 0x2a4a8a);
    // pescăruși pe macara
    for (const px of [352, 362]) addBox(0.5, 0.14, 0.9, px, 22.4, -129, 0xffffff);
    walkZones.push({ x: 300, y: -160, w: 140, h: 200 });
  }
  // zonă cargo liberă pentru M12 (fără obstacole)
  addPlane(34, 34, MARE_POS.port.x, MARE_POS.port.z, 0xd9d334, 0.05); // marcaj galben pe chei

  // --- palmieri + vegetație ---
  const palm = (px: number, pz: number): void => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 3.2, 6), mat(0x8a6a42));
    trunk.position.y = 1.6;
    g.add(trunk);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const fr = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.5), mat(0x3f8a3a));
      fr.position.set(Math.cos(a) * 1.1, 3.1 + Math.sin(a) * 0.15, Math.sin(a) * 1.1);
      fr.rotation.z = Math.cos(a) * 0.5;
      fr.rotation.x = -Math.sin(a) * 0.5;
      g.add(fr);
    }
    g.position.set(px, 0, pz);
    group.add(g);
    trees++;
  };
  for (let t = 0; t < 26; t++) {
    const tx = -380 + hash01(t * 5.1) * 760;
    const tz = -240 + hash01(t * 9.7) * 280;
    const nearRoadX = [-300, -150, 0, 150, 300].some((r) => Math.abs(tx - r) < 10);
    const nearRoadZ = [FALEZA_Z, TOMIS_Z, -200].some((r) => Math.abs(tz - r) < 10);
    if (nearRoadX || nearRoadZ) continue;
    if (Math.abs(tx - MARE_POS.cazino.x) < 40 && Math.abs(tz - MARE_POS.cazino.z) < 35) continue;
    if (tx > 295) continue; // portul rămâne curat
    palm(tx, tz);
  }
  // palmieri pe faleza pietonală (decor, fără obstacol)
  for (let k = 0; k < 22; k++) {
    const px = -400 + k * 38;
    if (Math.abs(px - MARE_POS.cazino.x) < 44) continue;
    addBox(0.5, 0.35, 0.5, px, 1.6, FALEZA_Z + 16.4, 0x4a8a3a); // tuia mică
  }

  // --- vehicule de furat pe litoral ---
  const carsOn: [number, number, number, string][] = [
    [-262, FALEZA_Z, Math.PI / 2, 'taxi'], [-140, FALEZA_Z, Math.PI / 2, 'dacia'],
    [30, FALEZA_Z, Math.PI / 2, 'logan'], [190, FALEZA_Z, Math.PI / 2, 'aro'],
    [120, FALEZA_Z, -Math.PI / 2, 'duba'], [310, FALEZA_Z, Math.PI / 2, 'serie3'],
    [-262, TOMIS_Z, Math.PI / 2, 'mobra'], [0, TOMIS_Z, Math.PI / 2, 'dacia'],
    [210, TOMIS_Z, Math.PI / 2, 'logan'], [-90, -200, 0, 'scuter'],
    [200, -200, 0, 'taxi'], [-330, -40, Math.PI / 2, 'logan'],
  ];
  for (const [cx2, cz2, cy, defId] of carsOn) spawnPoints.push({ x: cx2, z: cz2, yaw: cy, defId });

  // câine vagabond + pescăruș pe plajă (decor viu)
  dog(group, 60, 140, 0x8a6a3a);
  dog(group, -330, 150, 0xa88a5a);
  gull(group, -80, SEA_Z + 40);
  gull(group, -70, SEA_Z + 44);
  gull(group, 240, SEA_Z + 30);

  return {
    group,
    data: {
      obstacles,
      spawnPoints,
      grillPoints: [],
      thugPoints: [],
      walkZones,
      trees,
    },
  };
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
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 5), m);
  tail.position.set(0, 0.5, -0.6);
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
  g.rotation.y = hash01(x * 7 + z * 3);
  group.add(g);
}

function gull(group: THREE.Group, x: number, z: number): void {
  const g = new THREE.Group();
  const m = mat(0xffffff);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.6), m);
  body.position.y = 0.14;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.2), m);
  head.position.set(0, 0.32, 0.34);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.14), mat(0xd98a2a));
  beak.position.set(0, 0.3, 0.52);
  g.add(beak);
  g.position.set(x, 0, z);
  g.rotation.y = hash01(x * 3 + z * 11) * Math.PI;
  group.add(g);
}
