// BUCUREȘTI VICE — nucleul jocului (Faza 0 → Ziua 3).
// Orchestrator: bucla de joc, modul pe jos / la volan, misiunile demo, HUD,
// doua lumi (orasul + satul „La Cruce”), ciclu zi/noapte si radioul.
// NOTA: exceptie acceptata la regula „<=400 linii/modul” (vezi docs/03 §5) —
// orchestratorul de bootstrap se subtiaza pe masura ce continutul devine JSON.

import * as THREE from 'three';
import { Renderer } from './engine/renderer';
import { Input } from './engine/input';
import { Hud } from './engine/hud';
import { Sfx, Radio, STATIONS } from './engine/audio';
import { buildWorld, WORLD_LIMIT, WorldData } from './game/world';
import { buildSatelliteWorld, SAT_LIMIT } from './game/worldSatellite';
import { CAR_DEFS, Vehicle } from './game/vehicle';
import { Ped, updatePeds } from './game/combat';
import { MISSIONS, M1_CAR_MARKER, M1_END_MARKER, M2_MARKER, FIGHT_SPAWN } from './game/missions';
import { resolveCircleRect, clamp } from './engine/math';

interface SaveData {
  lei: number;
  m1: boolean;
  m2: boolean;
}

const SAVE_KEY = 'bv_save_v1';

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as SaveData;
      return { lei: d.lei ?? 0, m1: !!d.m1, m2: !!d.m2 };
    }
  } catch {
    /* local storage indisponibil — pornim curat */
  }
  return { lei: 0, m1: false, m2: false };
}

const app = document.getElementById('app') as HTMLElement;
const renderer = new Renderer(app);
const input = new Input(renderer.three.domElement);
const hud = new Hud();
const sfx = new Sfx();
const radio = new Radio(sfx);

const cam = renderer.camera;
cam.rotation.order = 'YXZ';

// ===== cele doua lumi =====
const worldCity = buildWorld();
const worldSat = buildSatelliteWorld();
renderer.scene.add(worldCity.group);
renderer.scene.add(worldSat.group);
worldSat.group.visible = false;

type WorldId = 'oras' | 'sat';
let worldId: WorldId = 'oras';
let worldData: WorldData = worldCity.data;

const getLimit = (): number => (worldId === 'oras' ? WORLD_LIMIT : SAT_LIMIT);

// ===== vehicule / pietoni =====
let cars: Vehicle[] = [];
let peds: Ped[] = [];
let thugs: Ped[] = [];
let fightActive = false;
let thugTotal = 0;
let thugKills = 0;

function clearEntities(): void {
  for (const v of [...cars]) renderer.scene.remove(v.group);
  for (const p of [...peds, ...thugs]) renderer.scene.remove(p.mesh);
  cars = [];
  peds = [];
  thugs = [];
}

const SHIRTS = [0xc8402c, 0x3f7ab3, 0xd9b334, 0x3f9d5a, 0xd98a3a, 0xa86ba8, 0xcfd6dd, 0x22262c];
const SAT_SHIRTS = [0x6a4a8a, 0x4a6a4a, 0x8a3a3a, 0x8a8a3a, 0x6a5a4a, 0x4a5a7a, 0x7a5a3a, 0x3a4a6a];
const SCARVES = [0xc8402c, 0xd9b334, 0x3f7ab3, 0x8a4a8a, 0xffffff, 0x4a8a3a];

function randomWalkPoint(): { x: number; z: number } {
  const z0 = worldData.walkZones[Math.floor(Math.random() * worldData.walkZones.length)];
  return { x: z0.x + Math.random() * z0.w, z: z0.y + Math.random() * z0.h };
}

function rebuildEntities(): void {
  clearEntities();
  const data = worldData;
  // masinile lumii curente
  cars = data.spawnPoints.map((s) => new Vehicle(CAR_DEFS[s.defId], s.x, s.z, s.yaw));
  for (const c of cars) renderer.scene.add(c.group);

  if (worldId === 'sat') {
    // satenii (babe cu batic + oameni)
    const sat = worldSat.data;
    for (const v of sat.villagerSpawns) {
      const shirt = v.shirt || SAT_SHIRTS[Math.floor(Math.random() * SAT_SHIRTS.length)];
      peds.push(new Ped(renderer.scene, v.x, v.z, false, shirt, {
        baba: v.kind === 'baba',
        scarfColor: v.kind === 'baba' ? v.scarf || SCARVES[Math.floor(Math.random() * SCARVES.length)] : undefined,
      }));
    }
  } else {
    for (let i = 0; i < 14; i++) {
      const p = randomWalkPoint();
      peds.push(new Ped(renderer.scene, p.x, p.z, false, SHIRTS[i % SHIRTS.length]));
    }
    if (fightActive) spawnThugPeds();
  }
}

function spawnThugPeds(): void {
  for (const pt of FIGHT_SPAWN) {
    const t = new Ped(renderer.scene, pt.x, pt.z, true, 0x8a2c26);
    thugs.push(t);
  }
  thugTotal = thugs.length;
  thugKills = 0;
  fightActive = true;
  hud.banner('Obor e sub asediu!\nBăieții răi vor rețeta de mici — curăță-i pe toți! (click = foc)');
}

function resetThugPeds(): void {
  for (const t of thugs) {
    t.hp = 100;
    t.state = 'thug';
    t.mesh.visible = true;
    t.mesh.rotation.set(0, 0, 0);
    t.mesh.position.y = 0;
  }
}

// ===== jucatorul =====
interface PlayerState {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  hp: number;
  mode: 'foot' | 'car';
  car: Vehicle | null;
  lastHurt: number;
  shootCd: number;
  walkT: number;
}
const player: PlayerState = {
  x: -70, z: -130, yaw: 0.9, pitch: -0.06,
  hp: 100, mode: 'foot', car: null, lastHurt: -99, shootCd: 0, walkT: 0,
};

const SPAWN: Record<WorldId, { x: number; z: number; yaw: number }> = {
  oras: { x: -70, z: -130, yaw: 0.9 },
  sat: { x: 0, z: -196, yaw: Math.PI },
};

function placePlayer(id: WorldId): void {
  const s = SPAWN[id];
  player.x = s.x;
  player.z = s.z;
  player.yaw = s.yaw;
  player.mode = 'foot';
  if (player.car) {
    player.car.speed = 0;
    player.car.static = true;
    player.car = null;
    sfx.engine(0, false, 'car');
  }
}

// ===== marcaje de misiune / puncte de interes =====
interface Marker {
  mesh: THREE.Mesh;
  world: WorldId;
  label: string;
  msg: string;
  visible: boolean;
}
const markers: Marker[] = [];

function makeMarker(x: number, z: number, color: number, world: WorldId, label: string, msg: string): Marker {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.45, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.09, z);
  m.visible = false;
  renderer.scene.add(m);
  const mk: Marker = { mesh: m, world, label, msg, visible: true };
  markers.push(mk);
  return mk;
}

makeMarker(M1_CAR_MARKER.x, M1_CAR_MARKER.z, 0xffe066, 'oras', 'Mașina ta (Dacia Bătrâna)', '');
makeMarker(M1_END_MARKER.x, M1_END_MARKER.z, 0xffe066, 'oras', 'Capătul Bulevardului', '');
makeMarker(M2_MARKER.x, M2_MARKER.z, 0xffb066, 'oras', 'Obor — tarabele cu mici', '');
makeMarker(worldSat.data.barPos.x + 6, worldSat.data.barPos.z, 0xffd75e, 'sat', 'Cârciuma „La Micuțu’', 'Aici se bea țuică fiartă, „lași fierbinți”! Misiunile cu rachiu vin în Zilele următoare. 🥃');
makeMarker(worldSat.data.primariaPos.x, worldSat.data.primariaPos.z + 9, 0x7ab3d8, 'sat', 'Primăria', 'Primarul e acasă? Pentru acum doar salută baba de pe bancă. 🚩');
makeMarker(worldSat.data.churchPos.x - 8, worldSat.data.churchPos.z, 0xd8d0b8, 'sat', 'Biserica din deal', 'Liniște... și găște. Nu deranja găștele. 🦢');

const markersCityCar = markers[0];
const markersCityEnd = markers[1];
const markersCityObor = markers[2];
const visited = new Set<string>();
function refreshMarkers(): void {
  markersCityCar.visible = worldId === 'oras' && !m1Done && player.mode === 'foot';
  markersCityEnd.visible = worldId === 'oras' && !m1Done && player.mode === 'car';
  markersCityObor.visible = worldId === 'oras' && m1Done && !m2Done;
  for (const mk of markers) mk.mesh.visible = mk.visible && mk.world === worldId;
}
function checkPoi(): void {
  if (player.mode !== 'foot') return;
  for (const mk of markers) {
    if (!mk.mesh.visible || !mk.msg || visited.has(mk.label)) continue;
    const d = Math.hypot(player.x - mk.mesh.position.x, player.z - mk.mesh.position.z);
    if (d < 6) {
      visited.add(mk.label);
      hud.banner(mk.label + '\n' + mk.msg, 4500);
    }
  }
}

// ===== save / misiuni =====
const save = loadSave();
let lei = save.lei;
let m1Done = save.m1;
let m2Done = save.m2;

function persist(): void {
  const data: SaveData = { lei, m1: m1Done, m2: m2Done };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* fara salvare */
  }
}

// ===== ciclul zi/noapte =====
const DAY_LEN = 64; // secunde pentru o zi intreaga (scurt, pentru demo)
let simHour = 9.4;
let cyclePaused = false;

// ===== fumul de la gratar =====
interface Puff { mesh: THREE.Mesh; life: number; max: number; vx: number; vz: number; }
const puffs: Puff[] = [];
let grillAcc = 0;
for (let i = 0; i < 3; i++) {
  const g = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 5), new THREE.MeshLambertMaterial({ color: 0xcfcfc9, transparent: true }));
  g.visible = false;
  renderer.scene.add(g);
  puffs.push({ mesh: g, life: 0, max: 1, vx: 0, vz: 0 });
}
function emitGrillSmoke(dt: number): void {
  const pts = worldCity.data.grillPoints;
  if (pts.length === 0) return;
  grillAcc += dt;
  if (grillAcc < 0.4) return;
  grillAcc -= 0.4;
  const src = pts[Math.floor(Math.random() * pts.length)];
  const puff = puffs.find((p) => p.life <= 0);
  if (!puff) return;
  puff.life = puff.max = 1.4 + Math.random() * 0.6;
  puff.mesh.position.set(src.x + (Math.random() - 0.5), 0.7, src.z + (Math.random() - 0.5));
  puff.mesh.scale.setScalar(0.4 + Math.random() * 0.4);
  puff.mesh.visible = true;
  puff.vx = (Math.random() - 0.5) * 0.5;
  puff.vz = (Math.random() - 0.5) * 0.5;
}

// ===== coliziuni =====
let crashCd = 0;
function collideCircle(x: number, z: number, r: number, speedRef: { v: number } | null): { x: number; z: number } {
  const rects = [...worldData.obstacles];
  for (const c of cars) {
    if (c.static) rects.push(c.obstacleRect());
  }
  let px = x;
  let pz = z;
  for (const rect of rects) {
    const push = resolveCircleRect(px, pz, r, rect);
    if (push.x !== 0 || push.z !== 0) {
      px += push.x;
      pz += push.z;
    }
  }
  const L = getLimit();
  px = clamp(px, -L, L);
  pz = clamp(pz, -L, L);
  if (speedRef) {
    const before = Math.abs(speedRef.v);
    speedRef.v *= 0.45;
    if (before > 8 && crashCd <= 0) {
      crashCd = 0.45;
      sfx.crash();
    }
    if (before > 16) hud.damageFlash();
  }
  return { x: px, z: pz };
}

// ===== foc de arma (doar la Obor) =====
function shootRay(): void {
  const origin = new THREE.Vector3();
  cam.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  for (const t of thugs) {
    if (t.state === 'dead') continue;
    const pc = new THREE.Vector3(t.x, 1.05, t.z);
    const to = pc.clone().sub(origin);
    const distAlong = to.dot(dir);
    if (distAlong < 0.5 || distAlong > 80) continue;
    const closest = origin.clone().add(dir.clone().multiplyScalar(distAlong));
    if (closest.distanceTo(pc) < 0.75) {
      const killed = t.hit(34);
      hud.hitmark();
      sfx.hit();
      if (killed) {
        thugKills++;
        hud.banner(`+1 golan rezolvat (${thugKills}/${thugTotal})`, 1200);
        if (thugKills >= thugTotal) {
          fightActive = false;
          m2Done = true;
          lei += MISSIONS[1].reward;
          hud.banner(`Obor e din nou liber! Mici pentru toată lumea!\n+${MISSIONS[1].reward} LEI`);
          persist();
        }
      }
      return;
    }
  }
}

function updateMissionUI(): void {
  hud.setMoney(lei);
  if (worldId === 'sat') {
    hud.setMission('Satul „La Cruce” — explorare');
    hud.setObjective('Plimbă-te pe ulițe, salută babele, fură tractorul dacă poți.\nMisiunile satului (coasa, borcanele, primarul) vin în Zilele 8+!');
    return;
  }
  if (!m1Done) {
    hud.setMission(MISSIONS[0].name);
    hud.setObjective(player.mode === 'foot'
      ? 'Du-te la mașina galbenă de pe Bulevard (marcajul) și apasă E ca s-o „împrumuți”.'
      : 'Condu spre EST pe Bulevardul Unirii până la marcajul galben (W = accelerație).');
  } else if (!m2Done) {
    hud.setMission(MISSIONS[1].name);
    hud.setObjective(fightActive
      ? `Curăță Oborul de gălăgie: mai sunt ${Math.max(0, thugTotal - thugKills)} de băieți răi. Click = foc.`
      : player.mode === 'foot'
        ? 'Mergi pe jos până la tarabele din Obor (marcajul).'
        : 'Parcare la Obor (marcajul) și continuă pe jos — la mici nu se vine cu mașina.');
  } else {
    hud.setMission('Demo tehnic — liber la plimbare');
    hud.setObjective('Apasă J ca să mergi în satul „La Cruce”! N = schimbi postul de radio, T = sari în timp.');
  }
}

// ===== comutarea lumilor =====
function setWorld(id: WorldId): void {
  if (worldId === id) return;
  placePlayer(id);
  worldCity.group.visible = id === 'oras';
  worldSat.group.visible = id === 'sat';
  worldId = id;
  worldData = id === 'oras' ? worldCity.data : worldSat.data;
  if (id === 'oras' && fightActive && thugs.length === 0) spawnThugPeds();
  rebuildEntities();
  refreshMarkers();
  hud.banner(id === 'oras' ? '🌆 București — Centru' : '🚜 Satul „La Cruce” (lângă Brașov)\nBabe cu batic, cârciumă și câmpuri.', 4000);
}

// ===== radio (posturi funny) =====
function radioBanner(): void {
  const s = radio.station;
  hud.banner(s.id === 'fara' ? '📻 Fără radio — doar motorul' : `📻 ${s.name}\n${s.dj}`, 2600);
}

// ===== bucla principala =====
const clock = new THREE.Clock();
let elapsed = 0;
let time = 0;
let introShown = false;
const camSmooth = new THREE.Vector3(-70, 4, -120);

function update(dt: number): void {
  elapsed += dt;
  crashCd = Math.max(0, crashCd - dt);
  const look = input.look();

  // --- comenzi one-shot ---
  if (input.pressed('enter')) {
    if (player.mode === 'foot') {
      let best: Vehicle | null = null;
      let bd = 3.2 * 3.2;
      for (const c of cars) {
        if (!c.static) continue;
        const d = (c.x - player.x) ** 2 + (c.z - player.z) ** 2;
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      if (best) {
        best.static = false;
        player.mode = 'car';
        player.car = best;
        sfx.pickup();
        hud.crosshair(false);
      }
    } else if (player.car) {
      const c = player.car;
      const right = { x: Math.cos(c.yaw), z: -Math.sin(c.yaw) };
      c.speed = 0;
      c.static = true;
      player.mode = 'foot';
      player.x = c.x + right.x * 2.4;
      player.z = c.z + right.z * 2.4;
      player.yaw = c.yaw + Math.PI / 2;
      player.car = null;
      sfx.engine(0, false, 'car');
      sfx.pickup();
      hud.crosshair(true);
    }
  }
  if (input.pressed('radio')) {
    if (radio.station.id === 'fara') radio.station = STATIONS[0];
    const wasOn = radio.on;
    radio.toggle();
    hud.banner(wasOn ? '📻 Radio oprit — doar motorul.' : `📻 ${radio.station.name}\n${radio.station.dj}`, 2600);
  }
  if (input.pressed('nextStation')) {
    radio.next();
    radioBanner();
  }
  if (input.pressed('honk') && player.mode === 'car' && player.car) {
    player.car.honkCooldown = 0;
    if (player.car.def.kind === 'tractor') sfx.honkOld();
    else if (player.car.def.kind === 'cart') sfx.clang();
    else sfx.honk();
  }
  if (input.pressed('reset') && player.mode === 'car' && player.car) {
    player.car.resetToHome();
    sfx.pickup();
  }
  if (input.pressed('skipTime')) {
    simHour = (simHour + 4) % 24;
    hud.banner(`⏰ Ora ${String(Math.floor(simHour)).padStart(2, '0')}:00 — timpul sare repede când te furișezi.`, 2200);
  }
  if (input.pressed('toggleWorld')) {
    setWorld(worldId === 'oras' ? 'sat' : 'oras');
  }

  // regenerare viata
  if (elapsed - player.lastHurt > 6 && player.hp < 100) {
    player.hp = Math.min(100, player.hp + 7 * dt);
  }
  if (player.hp <= 0) {
    player.hp = 100;
    player.lastHurt = -99;
    player.mode = 'foot';
    if (player.car) {
      player.car.speed = 0;
      player.car.static = true;
      player.car = null;
      sfx.engine(0, false, 'car');
    }
    placePlayer(worldId);
    resetThugPeds();
    hud.banner('Te-ai prăjit... dar țara are nevoie de tine!\nReînviere la punctul de pornire.');
    hud.damageFlash();
  }

  // --- mod: pe jos ---
  if (player.mode === 'foot') {
    player.yaw -= look.dx;
    player.pitch = clamp(player.pitch - look.dy, -1.2, 1.2);
    const fwd = input.axis('back', 'forward');
    const strafe = input.axis('left', 'right');
    const sprint = input.isDown('sprint') ? 1.55 : 1;
    if (fwd !== 0 || strafe !== 0) {
      const sy = Math.sin(player.yaw);
      const cy = Math.cos(player.yaw);
      let fx = -sy * fwd + cy * strafe;
      let fz = -cy * fwd - sy * strafe;
      const fl = Math.hypot(fx, fz) || 1;
      fx /= fl;
      fz /= fl;
      const sp = 4.6 * sprint;
      player.x += fx * sp * dt;
      player.z += fz * sp * dt;
      player.walkT += dt * (sprint > 1 ? 7 : 4.5);
    }
    const col = collideCircle(player.x, player.z, 0.42, null);
    player.x = col.x;
    player.z = col.z;

    player.shootCd -= dt;
    if (input.isDown('fire') && player.shootCd <= 0 && fightActive && thugs.length > 0) {
      player.shootCd = 0.16;
      sfx.shot();
      shootRay();
    }

    cam.position.set(player.x, 1.62 + Math.sin(player.walkT * 2) * 0.02, player.z);
    cam.rotation.y = player.yaw;
    cam.rotation.x = player.pitch;

    for (const t of thugs) {
      if (t.state === 'dead') continue;
      if (Math.hypot(t.x - player.x, t.z - player.z) < 1.5) {
        player.hp -= 16 * dt;
        player.lastHurt = elapsed;
        hud.damageFlash();
      }
    }
  } else {
    // --- mod: la volan ---
    const c = player.car!;
    c.update(dt, {
      throttle: input.axis('back', 'forward'),
      brake: input.isDown('handbrake') && input.axis('back', 'forward') === 0,
      handbrake: input.isDown('handbrake'),
      steer: input.axis('right', 'left'),
    });
    const spdRef = { v: c.speed };
    const col = collideCircle(c.x, c.z, Math.max(c.halfLen(), c.halfWid()) * 0.8, spdRef);
    c.x = col.x;
    c.z = col.z;
    c.speed = spdRef.v;
    c.group.position.set(c.x, 0, c.z);
    sfx.engine(Math.abs(c.speed) / CAR_DEFS[c.def.id].top, Math.abs(c.speed) > 0.4, c.def.kind);

    const sx = Math.sin(c.yaw);
    const cz = Math.cos(c.yaw);
    const desired = new THREE.Vector3(c.x - sx * 7.2, 3.4, c.z - cz * 7.2);
    camSmooth.lerp(desired, 1 - Math.exp(-6 * dt));
    cam.position.copy(camSmooth);
    cam.lookAt(c.x + sx * 6, 1.2, c.z + cz * 6);
    cam.rotation.z = 0;
  }

  // --- misiunea M1 (oras) ---
  if (worldId === 'oras' && !m1Done) {
    if (player.mode === 'car' && player.x > 305 && Math.abs(player.z + 192) < 40) {
      m1Done = true;
      lei += MISSIONS[0].reward;
      hud.banner(`Bătrâna merge ca unsă! Bulevardul e al tău.\n+${MISSIONS[0].reward} LEI (salvat în localStorage)`);
      markersCityEnd.visible = false;
      markersCityObor.visible = true;
      persist();
    }
  }
  // --- misiunea M2: la Obor pe jos -> bataia ---
  if (worldId === 'oras' && m1Done && !m2Done && !fightActive && player.mode === 'foot') {
    if (Math.hypot(player.x - M2_MARKER.x, player.z - M2_MARKER.z) < 5) {
      markersCityObor.visible = false;
      fightActive = true;
      spawnThugPeds();
    }
  }

  // --- pietonii si golani pe lumea curenta ---
  const effX = player.mode === 'car' ? player.car!.x : player.x;
  const effZ = player.mode === 'car' ? player.car!.z : player.z;
  const effSpeed = player.mode === 'car' ? Math.abs(player.car!.speed) : 0;
  if (peds.length) updatePeds(peds, effX, effZ, effSpeed, dt, time);
  if (thugs.length) updatePeds(thugs, effX, effZ, effSpeed, dt, time);

  // --- fum de la mici (doar oras) ---
  if (worldId === 'oras') {
    emitGrillSmoke(dt);
    for (const p of puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.mesh.position.y += 0.9 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.multiplyScalar(1 + dt * 0.7);
      (p.mesh.material as THREE.MeshLambertMaterial).opacity = Math.max(0, p.life / p.max) * 0.5;
      if (p.life <= 0) p.mesh.visible = false;
    }
  } else {
    // in sat nu sunt gratare (inca) — fumul ramane ascuns
    for (const p of puffs) p.mesh.visible = false;
  }

  // --- marcaje: stare + puls + puncte de interes ---
  refreshMarkers();
  const pulse = 1 + Math.sin(time * 4) * 0.12;
  for (const mk of markers) {
    if (mk.mesh.visible) mk.mesh.scale.setScalar(pulse);
  }
  checkPoi();

  // --- zi / noapte ---
  if (!cyclePaused) {
    simHour = (simHour + (dt * 24) / DAY_LEN) % 24;
  }
  const dayFactor = renderer.applyDayNight(simHour);
  if (worldId === 'sat' && dayFactor < 0.25) {
    // la sat, noaptea e mai noapte
  }
  hud.setClock(simHour, Math.floor((simHour % 1) * 60));

  updateMissionUI();
  hud.setHp(player.hp / 100);
  hud.setSpeed(player.mode === 'car' ? Math.abs(player.car?.speed ?? 0) * 3.6 : 0);
  hud.tick(dt);

  if (!introShown && elapsed > 0.6) {
    introShown = true;
    hud.banner(
      'BUCUREȘTI VICE\nmici, mașini & gloanțe\n--- fundație (Ziua 3) ---\n\nW/A/S/D mers & condus · E intri/ieși din mașină · Shift fugi\nMouse = privit · Click stânga = foc · Space = drift\nH claxon · M radio on/off · N postul următor · T sare timpul\nJ = oraș ⇄ satul „La Cruce” · R = resetezi mașina',
      15000,
    );
  }
}

function frame(): void {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  time += dt;
  if (elapsed > 0.5) update(dt);
  renderer.render();
  input.endFrame();
}

// pornire
window.addEventListener('pointerdown', () => sfx.unlock());
frame();
hud.crosshair(true);
refreshMarkers();
rebuildEntities();
updateMissionUI();
hud.setMission('');
