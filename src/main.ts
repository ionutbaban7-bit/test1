// BUCUREȘTI VICE — fundație tehnică (Faza 0, Ziua 1).
// Orchestrator: bucla de joc, modul pe jos / la volan, misiunile demo, HUD.
// NOTĂ: singura excepție de la regula „≤400 linii/modul” (vezi docs/03 §5) —
// e orchestratorul de bootstrap; misiunile se externalizează în JSON din Ziua 7.

import * as THREE from 'three';
import { Renderer } from './engine/renderer';
import { Input } from './engine/input';
import { Hud } from './engine/hud';
import { Sfx, Radio } from './engine/audio';
import { buildWorld, WORLD_LIMIT } from './game/world';
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

const world = buildWorld(renderer.scene);
const cars: Vehicle[] = world.spawnPoints.map(
  (s) => new Vehicle(CAR_DEFS[s.defId], s.x, s.z, s.yaw),
);
for (const c of cars) {
  renderer.scene.add(c.group);
  c.static = true;
}

const save = loadSave();
let lei = save.lei;
let m1Done = save.m1;
let m2Done = save.m2;
let fightActive = false;
let thugTotal = 0;
let thugKills = 0;

// --- jucatorul ---
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
  x: -70,
  z: -130,
  yaw: 0.9,
  pitch: -0.06,
  hp: 100,
  mode: 'foot',
  car: null,
  lastHurt: -99,
  shootCd: 0,
  walkT: 0,
};

// --- pietoni + baietii rai ---
const SHIRTS = [0xc8402c, 0x3f7ab3, 0xd9b334, 0x3f9d5a, 0xd98a3a, 0xa86ba8, 0xcfd6dd, 0x22262c];
function randomWalkPoint(): { x: number; z: number } {
  const z0 = world.walkZones[Math.floor(Math.random() * world.walkZones.length)];
  return { x: z0.x + Math.random() * z0.w, z: z0.y + Math.random() * z0.h };
}
const peds: Ped[] = [];
for (let i = 0; i < 14; i++) {
  const p = randomWalkPoint();
  peds.push(new Ped(renderer.scene, p.x, p.z, false, SHIRTS[i % SHIRTS.length]));
}
const thugs: Ped[] = [];
function spawnThugs(): void {
  for (const pt of FIGHT_SPAWN) {
    thugs.push(new Ped(renderer.scene, pt.x, pt.z, true, 0x8a2c26));
  }
  thugTotal = thugs.length;
  thugKills = 0;
  fightActive = true;
  hud.banner('Obor e sub asediu!\nBăieții răi vor rețeta de mici — curăță-i pe toți! (click = foc)');
}
function resetThugs(): void {
  for (const t of thugs) {
    t.hp = 100;
    t.state = 'thug';
    t.mesh.visible = true;
    t.mesh.rotation.set(0, 0, 0);
    t.mesh.position.y = 0;
  }
}

// --- marcajele de misiune ---
function makeMarker(x: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.4, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.08, z);
  renderer.scene.add(m);
  return m;
}
const markerCar = makeMarker(M1_CAR_MARKER.x, M1_CAR_MARKER.z);
const markerEnd = makeMarker(M1_END_MARKER.x, M1_END_MARKER.z);
const markerObor = makeMarker(M2_MARKER.x, M2_MARKER.z);
markerCar.visible = !m1Done;
markerEnd.visible = false;
markerObor.visible = m1Done && !m2Done;

// --- fumul de la gratar (particule simple) ---
interface Puff {
  mesh: THREE.Mesh;
  life: number;
  max: number;
  vx: number;
  vz: number;
}
const puffs: Puff[] = [];
const puffMatProto = new THREE.MeshLambertMaterial({ color: 0xcfcfc9, transparent: true });
let grillAcc = 0;
for (let i = 0; i < 3; i++) {
  const g = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 5), puffMatProto.clone());
  g.visible = false;
  renderer.scene.add(g);
  puffs.push({ mesh: g, life: 0, max: 1, vx: 0, vz: 0 });
}
function emitGrillSmoke(dt: number): void {
  if (world.grillPoints.length === 0) return;
  grillAcc += dt;
  const every = 0.4;
  if (grillAcc < every) return;
  grillAcc -= every;
  const src = world.grillPoints[Math.floor(Math.random() * world.grillPoints.length)];
  const puff = puffs.find((p) => p.life <= 0);
  if (!puff) return;
  puff.life = puff.max = 1.4 + Math.random() * 0.6;
  puff.mesh.position.set(src.x + (Math.random() - 0.5), 0.7, src.z + (Math.random() - 0.5));
  puff.mesh.scale.setScalar(0.4 + Math.random() * 0.4);
  puff.mesh.visible = true;
  puff.vx = (Math.random() - 0.5) * 0.5;
  puff.vz = (Math.random() - 0.5) * 0.5;
}

// --- coliziuni cercuri vs lume (pietoni + masini) ---
let crashCd = 0;
function collideCircle(x: number, z: number, r: number, speedRef: { v: number } | null): { x: number; z: number } {
  const rects = [...world.obstacles];
  for (const c of cars) {
    if (c.static) rects.push(c.obstacleRect());
  }
  let px = x;
  let pz = z;
  let touched = 0;
  for (const rect of rects) {
    const push = resolveCircleRect(px, pz, r, rect);
    if (push.x !== 0 || push.z !== 0) {
      px += push.x;
      pz += push.z;
      touched++;
    }
  }
  px = clamp(px, -WORLD_LIMIT, WORLD_LIMIT);
  pz = clamp(pz, -WORLD_LIMIT, WORLD_LIMIT);
  if (speedRef && touched > 0) {
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

// --- foc de arma: trasatura simpla (hit-scan) spre cei mai apropiati thug ---
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

// --- misiuni: stare UI + salvarea ---
function persist(): void {
  const data: SaveData = { lei, m1: m1Done, m2: m2Done };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* fara salvare */
  }
}

function updateMissionUI(): void {
  hud.setMoney(lei);
  if (!m1Done) {
    hud.setMission(MISSIONS[0].name);
    if (player.mode === 'foot') {
      hud.setObjective('Du-te la mașina galbenă de pe Bulevard (marcajul) și apasă E ca s-o „împrumuți”.');
    } else {
      hud.setObjective('Condu spre EST pe Bulevardul Unirii până la marcajul galben (W = accelerație).');
    }
  } else if (!m2Done) {
    hud.setMission(MISSIONS[1].name);
    if (player.mode === 'foot') {
      hud.setObjective(fightActive
        ? `Curăță Oborul de gălăgie: mai sunt ${Math.max(0, thugTotal - thugKills)} de băieți răi. Click = foc.`
        : 'Mergi pe jos până la tarabele din Obor (marcajul).');
    } else {
      hud.setObjective('Parcare la Obor (marcajul) și continuă pe jos — la mici nu se vine cu mașina.');
    }
  } else {
    hud.setMission('Demo tehnic — liber la plimbare');
    hud.setObjective('Fură mașini, driftează, apasă H (claxon), M (radio). Vezi docs/05-roadmap.md: mâine începem zilele reale de MVP.');
  }
}

// --- bucla principala ---
const clock = new THREE.Clock();
let elapsed = 0;
let time = 0;
let introShown = false;
let camSmooth = new THREE.Vector3(-70, 4, -120);

function update(dt: number): void {
  elapsed += dt;
  crashCd = Math.max(0, crashCd - dt);
  const look = input.look();

  // --- actiuni one-shot ---
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
      player.yaw = c.yaw + Math.PI / 2; // priveste spre masina
      player.car = null;
      sfx.engine(0, false);
      sfx.pickup();
      hud.crosshair(true);
    }
  }
  if (input.pressed('radio')) {
    radio.toggle();
    hud.banner(radio.on ? '📻 Radio Micuțu\' — on' : '📻 Radio Micuțu\' — off', 1300);
  }
  if (input.pressed('honk') && player.mode === 'car' && player.car) {
    player.car.honkCooldown = 0;
    sfx.honk();
  }
  if (input.pressed('reset') && player.mode === 'car' && player.car) {
    player.car.resetToHome();
    sfx.pickup();
  }

  // regenerare viata + atacul golaniilor
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
      sfx.engine(0, false);
    }
    player.x = -70;
    player.z = -130;
    resetThugs();
    hud.banner('Te-ai prăjit... dar țara are nevoie de tine!\nReînviere la Piața Unirii.');
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
      // forward pe sol (ignoram pitch-ul)
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

    // foc
    player.shootCd -= dt;
    if (input.isDown('fire') && player.shootCd <= 0 && fightActive) {
      player.shootCd = 0.16;
      sfx.shot();
      shootRay();
    }

    // camera
    cam.position.set(player.x, 1.62 + Math.sin(player.walkT * 2) * 0.02, player.z);
    cam.rotation.y = player.yaw;
    cam.rotation.x = player.pitch;

    // baietii rai ataca daca esti prea aproape
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
    const steer = input.axis('right', 'left');
    const throttle = input.axis('back', 'forward');
    c.update(dt, {
      throttle,
      brake: input.isDown('handbrake') && throttle === 0,
      handbrake: input.isDown('handbrake'),
      steer,
    });
    const spdRef = { v: c.speed };
    const col = collideCircle(c.x, c.z, Math.max(c.halfLen(), c.halfWid()) * 0.8, spdRef);
    c.x = col.x;
    c.z = col.z;
    c.speed = spdRef.v;
    c.group.position.set(c.x, 0, c.z);
    sfx.engine(Math.abs(c.speed) / CAR_DEFS[c.def.id].top, true);

    // camera urmareste masina
    const sx = Math.sin(c.yaw);
    const cz = Math.cos(c.yaw);
    const desired = new THREE.Vector3(c.x - sx * 7.2, 3.4, c.z - cz * 7.2);
    camSmooth.lerp(desired, 1 - Math.exp(-6 * dt));
    cam.position.copy(camSmooth);
    cam.lookAt(c.x + sx * 6, 1.2, c.z + cz * 6);
    cam.rotation.z = 0;
  }

  // --- misiunea M1 ---
  if (!m1Done) {
    markerCar.visible = player.mode === 'foot';
    markerEnd.visible = player.mode === 'car';
    if (
      player.mode === 'car' &&
      player.x > 305 &&
      Math.abs(player.z + 192) < 40
    ) {
      m1Done = true;
      lei += MISSIONS[0].reward;
      hud.banner(`Bătrâna merge ca unsă! Bulevardul e al tău.\n+${MISSIONS[0].reward} LEI (salvat în localStorage)`);
      markerEnd.visible = false;
      markerObor.visible = true;
      persist();
    }
  }
  // --- misiunea M2: ajungi la Obor pe jos -> incepe bataia ---
  if (m1Done && !m2Done && !fightActive && player.mode === 'foot') {
    if (Math.hypot(player.x - M2_MARKER.x, player.z - M2_MARKER.z) < 5) {
      markerObor.visible = false;
      spawnThugs();
    }
  }
  // pozitia „perceputa" a jucatorului (masina sau pe jos)
  const effX = player.mode === 'car' ? player.car!.x : player.x;
  const effZ = player.mode === 'car' ? player.car!.z : player.z;
  const effSpeed = player.mode === 'car' ? Math.abs(player.car!.speed) : 0;
  if (fightActive) {
    updatePeds(thugs, effX, effZ, effSpeed, dt, time);
  }
  updatePeds(peds, effX, effZ, effSpeed, dt, time);

  // fum de la mici
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

  // puls marcaje
  const pulse = 1 + Math.sin(time * 4) * 0.12;
  for (const m of [markerCar, markerEnd, markerObor]) {
    if (m.visible) m.scale.setScalar(pulse);
  }

  updateMissionUI();
  hud.setHp(player.hp / 100);
  hud.setSpeed(player.mode === 'car' ? Math.abs(player.car?.speed ?? 0) * 3.6 : 0);
  hud.tick(dt);

  if (!introShown && elapsed > 0.6) {
    introShown = true;
    hud.banner(
      'BUCUREȘTI VICE\nmici, mașini & gloanțe\n--- fundație tehnică (Ziua 1) ---\n\nClick în joc, apoi: W/A/S/D mers · E intri/ieși din mașină · Shift fugi\nMouse = privit · Click stânga = foc (la Obor) · M = radio · H = claxon · R = reset',
      11000,
    );
  }
}

function frame(): void {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  time += dt;
  if (elapsed > 0.5) {
    update(dt);
  }
  renderer.render();
  input.endFrame();
}

// pornire
window.addEventListener('pointerdown', () => sfx.unlock());
frame();
hud.crosshair(true);
updateMissionUI();
hud.setMission('');
