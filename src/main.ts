// BUCUREȘTI VICE — nucleul jocului (Faza 0 → Ziua 3).
// Orchestrator: bucla de joc, modul pe jos / la volan, misiunile demo, HUD,
// doua lumi (orasul + satul „La Cruce”), ciclu zi/noapte si radioul.
// NOTA: exceptie acceptata la regula „<=400 linii/modul” (vezi docs/03 §5) —
// orchestratorul de bootstrap se subtiaza pe masura ce continutul devine JSON.

import * as THREE from 'three';
import { Renderer } from './engine/renderer';
import { Input } from './engine/input';
import { Hud } from './engine/hud';
import { ObjectiveArrow } from './engine/objectiveArrow';
import { Sfx, Radio, STATIONS } from './engine/audio';
import { buildWorld, WORLD_LIMIT, WorldData, CITY_GRID } from './game/world';
import { buildSatelliteWorld, SAT_LIMIT } from './game/worldSatellite';
import { buildMareWorld, MARE_LIMIT, MARE_POS } from './game/worldMare';
import { CAR_DEFS, Vehicle } from './game/vehicle';
import { Ped, updatePeds } from './game/combat';
import {
  MISSIONS, M1_CAR_MARKER, M1_END_MARKER, M2_MARKER, FIGHT_SPAWN,
  M4_APPROACH, M5_SPOT, M5_GATE_MARKER, M12_PESC, M13_START,
} from './game/missions';
import { collideAgainstRects } from './game/physics';
import { SatQuests, QuestMarker, FrameResult, SatQuestCtx } from './game/satQuests';
import { buildGridGraph } from './game/pathfind';
import { PoliceManager, PoliceCtx } from './game/police';
import { CityRace, RaceCtx, RACE_START } from './game/cityRace';
import { CityQuests, CityQuestCtx, CityFrameResult } from './game/cityQuests';
import { MareQuests, MareQuestCtx, MareFrameResult } from './game/mareQuests';
import { clamp } from './engine/math';

interface SaveData {
  lei: number;
  m1: boolean;
  m2: boolean;
  m3: boolean;
  m4: boolean;
  m5: boolean;
  m12: boolean;
  m13: boolean;
  place: number;
}

const SAVE_KEY = 'bv_save_v1';

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as SaveData;
      return {
        lei: d.lei ?? 0,
        m1: !!d.m1,
        m2: !!d.m2,
        m3: !!d.m3,
        m4: !!d.m4,
        m5: !!d.m5,
        m12: !!d.m12,
        m13: !!d.m13,
        place: d.place ?? 4,
      };
    }
  } catch {
    /* local storage indisponibil — pornim curat */
  }
  return { lei: 0, m1: false, m2: false, m3: false, m4: false, m5: false, m12: false, m13: false, place: 4 };
}

const app = document.getElementById('app') as HTMLElement;
const renderer = new Renderer(app);
const input = new Input(renderer.three.domElement);
const hud = new Hud();
const arrow = new ObjectiveArrow();
const sfx = new Sfx();
const radio = new Radio(sfx);

const cam = renderer.camera;
cam.rotation.order = 'YXZ';

// ===== cele trei lumi =====
const worldCity = buildWorld();
const worldSat = buildSatelliteWorld();
const worldMare = buildMareWorld();
renderer.scene.add(worldCity.group);
renderer.scene.add(worldSat.group);
renderer.scene.add(worldMare.group);
worldSat.group.visible = false;
worldMare.group.visible = false;

type WorldId = 'oras' | 'sat' | 'mare';
let worldId: WorldId = 'oras';
let worldData: WorldData = worldCity.data;

const WORLD_ORDER: WorldId[] = ['oras', 'sat', 'mare'];
const getLimit = (): number =>
  worldId === 'oras' ? WORLD_LIMIT : worldId === 'sat' ? SAT_LIMIT : MARE_LIMIT;

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
const MARE_SHIRTS = [0xd98a3a, 0x3f9d5a, 0xe86a6a, 0x5aa8d9, 0xd9b334, 0xa86ba8, 0xe8e2d2, 0xcfd6dd];
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
  if (worldId === 'mare') {
    // vacanță: turiști pe faleză, la plajă și la port
    for (let i = 0; i < 12; i++) {
      const p = randomWalkPoint();
      peds.push(
        new Ped(renderer.scene, p.x, p.z, false, MARE_SHIRTS[i % MARE_SHIRTS.length], {
          hat: i % 4 === 0,
          hatColor: i % 2 === 0 ? 0xe8e0c8 : 0xcf4a2c,
        }),
      );
    }
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
  mare: MARE_POS.autogara,
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
const markerRace = makeMarker(RACE_START.x, RACE_START.z, 0xff6666, 'oras', 'Cursa „Noaptea Unirii”', 'Apasă E când ești cu o mașină ca s-o pornești! 🏁');
const markerM4 = makeMarker(M4_APPROACH.x, M4_APPROACH.z, 0xdf6ae8, 'oras', 'Palatul — selfie interzis', '„Palatul nu se pozează” e doar o sugestie. Vino la marcaj și apasă E: grupul „Bucureștiul Subteran” are nevoie de tine. 🤳');
const markerM5 = makeMarker(M5_SPOT.x, M5_SPOT.z, 0xd8a43a, 'oras', 'Nea Costel — „Datoria”', '„Băiete, datoria nu doarme.” Nea Costel te așteaptă la fântâna din Centrul Vechi, lângă Loganul lui albastru.');
const markerM5Gate = makeMarker(M5_GATE_MARKER.x, M5_GATE_MARKER.z, 0x44c8ff, 'oras', 'Autogara de Est', 'Biletul la mare nu așteaptă. Scapă de Dobre și ajunge la autogară!');
// --- marcaje Constanța ---
const markerM12 = makeMarker(M12_PESC.x, M12_PESC.z + 16, 0xffd75e, 'mare', 'Pescărușul Șchiop', 'Titi își usucă șorțul în bătaia vântului și se uită lung la tine: „Ăsta e omu\' lu\' Costel?” (E)');
const markerM13Start = makeMarker(M13_START.x, M13_START.z, 0xff6666, 'mare', 'Start „Faleza nebună”', 'Cursă între pescari pe Faleza Cazinoului: apasă E cu o mașină la linia roșie. Primul la Port ia tot peștele! 🐟');
const markerCazino = makeMarker(56, 128, 0xe8e2d2, 'mare', 'Cazinoul „Alb cu Turnulețe”', 'Parodie Art Nouveau, 1910: aici au pierdut averi domnii, acum pierzi tu timp frumos. Clădirea nu se pozează. …Glumeam, pozeaz-o cât vrei.');

const markersCityCar = markers[0];
const markersCityEnd = markers[1];
const markersCityObor = markers[2];
const visited = new Set<string>();
const raceAvailable = (): boolean =>
  worldId === 'oras' && m1Done && m2Done && race.state === 'idle' &&
  (!m3Done || (m3Done && m4Done && m5Done));
function refreshMarkers(): void {
  markersCityCar.visible = worldId === 'oras' && !m1Done && player.mode === 'foot';
  markersCityEnd.visible = worldId === 'oras' && !m1Done && player.mode === 'car';
  markersCityObor.visible = worldId === 'oras' && m1Done && !m2Done;
  markerRace.visible = raceAvailable();
  markerM4.visible = worldId === 'oras' && m3Done && !m4Done && cq.quest !== 'm4';
  markerM5.visible = worldId === 'oras' && m4Done && !m5Done && (cq.quest !== 'm5' || cq.phase === 'wait');
  markerM5Gate.visible = worldId === 'oras' && m4Done && !m5Done && cq.raidActive;
  markerM12.visible = worldId === 'mare' && !m12Done && (mq.quest !== 'm12' || mq.phase === 'wait');
  markerM13Start.visible =
    worldId === 'mare' && m12Done && (mq.quest !== 'm13' || mq.phase === 'wait');
  markerCazino.visible = worldId === 'mare';
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
let m3Done = save.m3;
let m4Done = save.m4;
let m5Done = save.m5;
let m12Done = save.m12;
let m13Done = save.m13;
let m3Place = save.place;
let m3RaceCounted = false;

function persist(): void {
  const data: SaveData = {
    lei, m1: m1Done, m2: m2Done, m3: m3Done, m4: m4Done, m5: m5Done,
    m12: m12Done, m13: m13Done, place: m3Place,
  };
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

// ===== coliziuni (Integration A5: delega în modulul pur de fizică) =====
let crashCd = 0;
function collideCircle(x: number, z: number, r: number, speedRef: { v: number } | null): { x: number; z: number } {
  const rects = [...worldData.obstacles];
  for (const c of cars) {
    if (c.static) rects.push(c.obstacleRect());
  }
  const res = collideAgainstRects(x, z, r, rects, getLimit());
  if (speedRef && res.touched) {
    const before = Math.abs(speedRef.v);
    speedRef.v *= 0.45;
    if (before > 8 && crashCd <= 0) {
      crashCd = 0.45;
      sfx.crash();
    }
    if (before > 16) hud.damageFlash();
  }
  return { x: res.x, z: res.z };
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
    const title = SAT_QUEST_TITLES[qs.quest] ?? 'Satul „La Cruce” — misiuni rurale';
    hud.setMission(title);
    const obj = qs.objective(questCtx());
    hud.setObjective(
      obj ??
        'Plimbă-te pe ulițe și vorbește cu lumea (E): baba cu borcane, Nea Păun cu tractorul, primarul, butoiul lui Micuțu, câmpul cu fân sau căruța.',
    );
    return;
  }
  if (worldId === 'mare') {
    if (!m12Done) {
      hud.setMission(MISSIONS[5].name);
      hud.setObjective(
        mq.objective() ??
          'Mergi la Pescărușul Șchiop (marcajul galben, pe faleză) și apasă E lângă Titi. Miroase a scrumbie și a bani.',
      );
    } else if (!m13Done) {
      hud.setMission(MISSIONS[6].name);
      hud.setObjective(
        mq.objective() ??
          'Urcă în orice mașină și du-te la linia ROȘIE din vestul falezei: cursa „Faleza nebună” (E la linie).',
      );
    } else {
      hud.setMission('✅ Episodul „La mare!” — bifat');
      hud.setObjective('Cursa pe faleză rămâne deschisă (marcajul roșu). J = înapoi la oraș / sat. Cazinoul nu se pozează… glumă.');
    }
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
  } else if (!m3Done) {
    hud.setMission(MISSIONS[2].name);
    hud.setObjective(player.mode === 'car'
      ? 'Du-te la linia ROȘIE din capătul vestic al Bulevardului: cursa „Noaptea Unirii” te așteaptă (E la linie).'
      : 'Urcă în orice mașină și du-te la linia ROȘIE din capătul vestic al Bulevardului: 3 rivali, o noapte, un bulevard.');
  } else if (!m4Done) {
    hud.setMission(MISSIONS[3].name);
    hud.setObjective(
      cq.objective() ??
        (player.mode === 'car'
          ? 'Parcare pe lângă esplanada Palatului (marcajul mov) și continuă pe jos — selfie-ul cere discreție.'
          : 'Mergi la marcajul mov de lângă Palat și apasă E: grupul „Bucureștiul Subteran” cere un selfie interzis.'),
    );
  } else if (!m5Done) {
    hud.setMission(MISSIONS[4].name);
    hud.setObjective(
      cq.objective() ??
        'Nea Costel te așteaptă la fântâna din Centrul Vechi (marcajul auriu), lângă Loganul lui albastru. Apasă E când ești lângă el.',
    );
  } else {
    hud.setMission('✅ Capitolul 1 complet — „O zi în Centru”');
    hud.setObjective('Datoria: ACHITATĂ. Biletul la mare: în buzunar. 🎟️ J = sat / CONSTANȚA (episodul 2!), cursa rămâne deschisă pe Bulevard.');
  }
}

// ===== comutarea lumilor =====
function setWorld(id: WorldId): void {
  if (worldId === id) return;
  placePlayer(id);
  worldCity.group.visible = id === 'oras';
  worldSat.group.visible = id === 'sat';
  worldMare.group.visible = id === 'mare';
  worldId = id;
  worldData = id === 'oras' ? worldCity.data : id === 'sat' ? worldSat.data : worldMare.data;
  if (id === 'oras' && fightActive && thugs.length === 0) spawnThugPeds();
  rebuildEntities();
  qs.reset(); // curăță questurile și personajele satului (se recreează la nevoie)
  cq.reset(); // curăță questurile orașului (M4/M5 — garda, Nea Costel, marcaje)
  mq.reset(); // curăță questurile mării (M12/M13 — Titi, Căpitanu', rivali)
  police.clear(); // poliția nu te urmărește în alt județ
  race.cancel(raceCtx); // cursa se oprește la graniță
  refreshMarkers();
  hud.banner(
    id === 'oras'
      ? '🌆 București — Centru'
      : id === 'sat'
        ? '🚜 Satul „La Cruce” (lângă Brașov)\nBabe cu batic, cârciumă și câmpuri.'
        : '🌊 Constanța — „La mare!”\nFaleza cu Cazinou, plajă, Pescărușul Șchiop și Portul cu containere.',
    4200,
  );
}

// ===== questurile satului (modul SatQuests) =====
const SAT_QUEST_TITLES: Record<string, string> = {
  m6: 'M6 · Borcanele babei (compot de gutui)',
  m7: 'M7 · Coasa, furca și gâștele',
  m8: 'M8 · Furtul tractorului (Nea Păun)',
  m9: 'M9 · Căruța cu fân a lui Micuțu',
  m10: 'M10 · Țuică fiartă — „lași fierbinți”',
  m11: 'M11 · Primarul & Polițistu\' cu bicicleta',
};

function makeQuestMarker(x: number, z: number, color: number, world: WorldId = 'sat'): QuestMarker {
  const mk = makeMarker(x, z, color, world, '', '');
  mk.visible = false;
  return {
    setVisible: (v: boolean) => {
      mk.visible = v;
      mk.mesh.visible = v && worldId === world;
    },
    setPos: (px: number, pz: number) => mk.mesh.position.set(px, 0.09, pz),
    dispose: () => {
      const i = markers.indexOf(mk);
      if (i >= 0) markers.splice(i, 1);
      renderer.scene.remove(mk.mesh);
    },
  };
}

const qs = new SatQuests();
function questCtx(): SatQuestCtx {
  return {
    player: () => ({
      x: player.x,
      z: player.z,
      mode: player.mode,
      speed: player.mode === 'car' && player.car ? Math.abs(player.car.speed) : 0,
    }),
    enterPressed: () => input.pressed('enter'),
    firePressed: () => input.pressed('fire'),
    spawnPed: (x, z, shirt, opts) => {
      const ped = new Ped(renderer.scene, x, z, false, shirt, opts);
      peds.push(ped);
      return ped;
    },
    spawnManagedPed: (x, z, shirt, opts) => new Ped(renderer.scene, x, z, false, shirt, opts),
    spawnCar: (defId, x, z, yaw) => {
      const v = new Vehicle(CAR_DEFS[defId], x, z, yaw);
      cars.push(v);
      renderer.scene.add(v.group);
      return v;
    },
    removePed: (ped) => {
      renderer.scene.remove(ped.mesh);
      const i = peds.indexOf(ped);
      if (i >= 0) peds.splice(i, 1);
    },
    removeCar: (v) => {
      renderer.scene.remove(v.group);
      const i = cars.indexOf(v);
      if (i >= 0) cars.splice(i, 1);
    },
    findParked: (defId, nx, nz, r) =>
      cars.find(
        (c) => c.static && c.def.id === defId && (c.x - nx) ** 2 + (c.z - nz) ** 2 < r * r,
      ) ?? null,
    addMarker: (x, z, color) => makeQuestMarker(x, z, color),
    say: (text, ms) => hud.banner(text, ms ?? 3200),
    money: (n) => {
      lei = Math.max(0, lei + n);
      hud.setMoney(lei);
      persist();
    },
    bonk: () => sfx.clang(),
    hurt: () => {
      player.hp = Math.max(1, player.hp - 25);
      player.lastHurt = elapsed;
      hud.damageFlash();
      sfx.hurt();
    },
  };
}

// ===== poliția (oraș) + cursa „Noaptea Unirii” =====
const police = new PoliceManager(buildGridGraph(CITY_GRID, CITY_GRID));
const policeCtx: PoliceCtx = {
  player: () => ({
    x: player.mode === 'car' && player.car ? player.car.x : player.x,
    z: player.mode === 'car' && player.car ? player.car.z : player.z,
    mode: player.mode,
  }),
  playerVehicle: () => (player.mode === 'car' ? player.car : null),
  spawnCar: (defId, x, z, yaw) => {
    const v = new Vehicle(CAR_DEFS[defId], x, z, yaw);
    v.static = false;
    cars.push(v);
    renderer.scene.add(v.group);
    return v;
  },
  removeCar: (v) => {
    renderer.scene.remove(v.group);
    const i = cars.indexOf(v);
    if (i >= 0) cars.splice(i, 1);
  },
  collideVehicle: (v) => {
    const spdRef = { v: v.speed };
    const r = Math.max(v.halfLen(), v.halfWid()) * 0.8;
    const col = collideCircle(v.x, v.z, r, spdRef);
    v.x = col.x;
    v.z = col.z;
    v.speed = spdRef.v;
  },
  say: (text, ms) => hud.banner(text, ms ?? 3000),
  fine: (n) => {
    lei = Math.max(0, lei - n);
    hud.setMoney(lei);
    persist();
    cq.noteCaught(); // prinderea contează la rating (M4/M5)
  },
};

const race = new CityRace();
const raceCtx: RaceCtx = {
  player: () => ({
    x: player.mode === 'car' && player.car ? player.car.x : player.x,
    z: player.mode === 'car' && player.car ? player.car.z : player.z,
    mode: player.mode,
  }),
  playerVehicle: () => (player.mode === 'car' ? player.car : null),
  spawnRival: (defId, color, x, z) => {
    const def = { ...CAR_DEFS[defId], color };
    const v = new Vehicle(def, x, z, Math.PI / 2);
    v.static = false;
    cars.push(v);
    renderer.scene.add(v.group);
    return v;
  },
  removeVehicle: (v) => {
    renderer.scene.remove(v.group);
    const i = cars.indexOf(v);
    if (i >= 0) cars.splice(i, 1);
  },
  banner: (text, ms) => hud.banner(text, ms ?? 3000),
  money: (n) => {
    lei += n;
    hud.setMoney(lei);
    persist();
  },
  policeClear: () => police.clear(),
};

// ===== questurile orașului (M4 „Selfie la Palat” + M5 „Datoria”) =====
const cq = new CityQuests();
const cqCtx: CityQuestCtx = {
  player: () => ({
    x: player.mode === 'car' && player.car ? player.car.x : player.x,
    z: player.mode === 'car' && player.car ? player.car.z : player.z,
    mode: player.mode,
  }),
  enterPressed: () => input.pressed('enter'),
  spawnManagedPed: (x, z, shirt, opts) => new Ped(renderer.scene, x, z, false, shirt, opts),
  spawnManagedCar: (defId, x, z, yaw, color) => {
    const def = color !== undefined ? { ...CAR_DEFS[defId], color } : CAR_DEFS[defId];
    const v = new Vehicle(def, x, z, yaw);
    v.static = true;
    cars.push(v);
    renderer.scene.add(v.group);
    return v;
  },
  removePed: (ped) => {
    renderer.scene.remove(ped.mesh);
  },
  removeCar: (v) => {
    renderer.scene.remove(v.group);
    const i = cars.indexOf(v);
    if (i >= 0) cars.splice(i, 1);
  },
  addMarker: (x, z, color) => makeQuestMarker(x, z, color, 'oras'),
  playerCar: () => (player.mode === 'car' ? player.car : null),
  say: (text, ms) => hud.banner(text, ms ?? 3600),
  money: (n) => {
    lei = Math.max(0, lei + n);
    hud.setMoney(lei);
    persist();
  },
  teleport: (x, z) => {
    player.x = x;
    player.z = z;
    if (player.mode === 'car' && player.car) {
      player.car.x = x;
      player.car.z = z;
      player.car.group.position.set(x, 0, z);
    }
  },
  report: (x, z, level) => police.report(x, z, level),
  heat: () => police.heat,
  ratingInfo: () => ({ m3Place }),
};

// ===== questurile mării (M12 „Coletul lui Costel” + M13 „Faleza nebună”) =====
const mq = new MareQuests();
const mqCtx: MareQuestCtx = {
  player: () => ({
    x: player.mode === 'car' && player.car ? player.car.x : player.x,
    z: player.mode === 'car' && player.car ? player.car.z : player.z,
    mode: player.mode,
  }),
  enterPressed: () => input.pressed('enter'),
  spawnManagedPed: (x, z, shirt, opts) => new Ped(renderer.scene, x, z, false, shirt, opts),
  spawnManagedCar: (defId, x, z, yaw, color) => {
    const def = color !== undefined ? { ...CAR_DEFS[defId], color } : CAR_DEFS[defId];
    const v = new Vehicle(def, x, z, yaw);
    cars.push(v);
    renderer.scene.add(v.group);
    return v;
  },
  removePed: (ped) => {
    renderer.scene.remove(ped.mesh);
  },
  removeCar: (v) => {
    renderer.scene.remove(v.group);
    const i = cars.indexOf(v);
    if (i >= 0) cars.splice(i, 1);
  },
  addMarker: (x, z, color) => makeQuestMarker(x, z, color, 'mare'),
  playerCar: () => (player.mode === 'car' ? player.car : null),
  say: (text, ms) => hud.banner(text, ms ?? 3600),
  money: (n) => {
    lei = Math.max(0, lei + n);
    hud.setMoney(lei);
    persist();
  },
};

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

  // --- questurile satului (înainte de comenzile one-shot, ca să poată consuma E/click) ---
  let qsFrame: FrameResult | null = null;
  if (worldId === 'sat') qsFrame = qs.frame(questCtx(), dt);
  // --- questurile mării (M12/M13) ---
  let mqFrame: MareFrameResult | null = null;
  if (worldId === 'mare') {
    mqFrame = mq.frame(mqCtx, dt, m12Done ? 'm13' : 'm12');
    if (mqFrame.done12 && !m12Done) {
      m12Done = true;
      persist();
      refreshMarkers();
      hud.banner('M12 bifat! Căpitanu\' Spiridon ți-a dat de înțeles că mai e o cursă… pe faleză. (marcajul roșu)', 4200);
    }
    if (mqFrame.done13 && !m13Done) {
      m13Done = true;
      persist();
      refreshMarkers();
      hud.banner('M13 bifat! „Faleza nebună” a rămas în gura pescarilor. Constanța e a ta. 🌊', 4200);
    }
  }

  // --- questurile orașului (M4/M5), tot înaintea comenzilor one-shot ---
  let cqFrame: CityFrameResult | null = null;
  const cqWanted: 'm4' | 'm5' | null =
    worldId === 'oras' ? (m3Done && !m4Done ? 'm4' : m4Done && !m5Done ? 'm5' : null) : null;
  if (worldId === 'oras') {
    cqFrame = cq.frame(cqCtx, dt, cqWanted);
    if (cqFrame.done4) {
      m4Done = true;
      m3RaceCounted = false;
      persist();
      simHour = 23.1; // M5 se joacă noaptea (GDD)
      hud.banner('🌙 23:00 — datoria nu doarme.\nNea Costel ți-a lăsat mesaj la Centrul Vechi (marcajul auriu).', 3400);
      refreshMarkers();
    }
    if (cqFrame.done5) {
      m5Done = true;
      police.clear();
      persist();
      simHour = 0.4;
      hud.banner('🌅 Răsare soarele peste Autogara de Est.\nCapitolul 1 e gata — țara te așteaptă la mare.', 6000);
      refreshMarkers();
    }
  }
  const cEnter =
    (qsFrame?.consumeEnter ?? false) ||
    (cqFrame?.consumeEnter ?? false) ||
    (mqFrame?.consumeEnter ?? false);

  // --- comenzi one-shot ---
  if (input.pressed('enter') && !cEnter) {
    const nearRaceStart =
      raceAvailable() &&
      Math.hypot(player.x - RACE_START.x, player.z - RACE_START.z) < 7;
    if (nearRaceStart) {
      if (player.mode === 'car') {
        race.start(raceCtx);
      } else {
        hud.banner('🏁 Cursa „Noaptea Unirii”: urcă într-o mașină și revino la linia de start!', 2800);
      }
    } else if (player.mode === 'foot') {
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
        if (worldId === 'sat' && qs.blocksCarEnter()) {
          hud.banner('Borcanele! Nu urca cu ele în mașină — se sparg toate!', 2400);
          sfx.clink();
        } else {
          best.static = false;
          player.mode = 'car';
          player.car = best;
          sfx.pickup();
          hud.crosshair(false);
          // furtul nu trece neobservat în oraș (după tutorialul M1)
          if (worldId === 'oras' && m1Done && race.state === 'idle') {
            police.report(best.x, best.z, 1);
          }
        }
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
    const next = WORLD_ORDER[(WORLD_ORDER.indexOf(worldId) + 1) % WORLD_ORDER.length];
    if (next === 'mare' && !m5Done) {
      hud.banner('🎟️ La mare ai nevoie de bilet! Termină M5 „Datoria”: Nea Costel → fuga de Dobre → Autogara de Est.', 3800);
    } else {
      setWorld(next);
    }
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
    // beat-ul de la țuică te împiedică să sprintezi
    const wantSprint = input.isDown('sprint');
    const canSprint = qs.drunk < 0.5;
    const sprint = wantSprint && canSprint ? 1.55 : 1;
    if (fwd !== 0 || strafe !== 0) {
      const sy = Math.sin(player.yaw);
      const cy = Math.cos(player.yaw);
      let fx = -sy * fwd + cy * strafe;
      let fz = -cy * fwd - sy * strafe;
      const fl = Math.hypot(fx, fz) || 1;
      fx /= fl;
      fz /= fl;
      let sp = 4.6 * sprint;
      const lim = qsFrame?.speedLimit ?? mqFrame?.speedLimit ?? null;
      if (lim !== null && lim !== undefined) {
        sp = Math.min(sp, lim);
      }
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
    // efectul „lași fierbinți”: lumea se leagănă frumos
    if (worldId === 'sat' && qs.drunk > 0) {
      const d = qs.drunk;
      cam.rotation.y += Math.sin(time * 4.2) * 0.035 * d;
      cam.rotation.x += Math.cos(time * 3.4) * 0.03 * d;
      cam.position.x += Math.sin(time * 2.6) * 0.12 * d;
      cam.position.z += Math.cos(time * 2.1) * 0.12 * d;
    }

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
    // calul obosit refuză să mai meargă (misiunea căruței)
    if (worldId === 'sat' && qs.horseStopped() && c.def.id === 'cart') {
      c.speed = 0;
    }
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

  // --- poliția + cursa (doar în oraș) / cursa pe faleză (la mare) ---
  if (worldId === 'oras') {
    police.update(dt, policeCtx);
    race.update(dt, raceCtx);
    // primul finiș al cursei = misiunea M3 bifată → M4 se deblochează
    if (race.state === 'done' && race.lastPlace > 0 && !m3Done && !m3RaceCounted) {
      m3Done = true;
      m3Place = race.lastPlace;
      m3RaceCounted = true;
      persist();
      refreshMarkers();
      hud.banner('M3 „Noaptea Unirii” bifată! 🏁\nAcum: selfie interzis la Palat (marcajul mov) — grupul „Bucureștiul Subteran” așteaptă.', 4600);
    }
    if (race.state === 'idle') m3RaceCounted = false;
    hud.setRacePos(race.state === 'run' ? race.livePlace(effX) : null);
  } else if (worldId === 'mare') {
    hud.setRacePos(mq.phase === 'run' ? mq.livePlace(effX) : null);
  } else {
    hud.setRacePos(null);
  }

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

  // --- săgeata de obiectiv (Frontend A2): primul marcaj vizibil, nevizitat ---
  let target: Marker | null = null;
  for (const mk of markers) {
    if (mk.world === worldId && mk.mesh.visible && (!mk.msg || !visited.has(mk.label))) {
      target = mk;
      break;
    }
  }
  if (target) {
    const d = Math.hypot(player.x - target.mesh.position.x, player.z - target.mesh.position.z);
    arrow.update(cam, target.mesh.position.x, target.mesh.position.z, d);
  } else {
    arrow.hide();
  }

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
  hud.setHeat(worldId === 'oras' ? police.heat : 0);
  hud.setHp(player.hp / 100);
  hud.setSpeed(player.mode === 'car' ? Math.abs(player.car?.speed ?? 0) * 3.6 : 0);
  hud.tick(dt);

  if (!introShown && elapsed > 0.6) {
    introShown = true;
    hud.banner(
      'BUCUREȘTI VICE\nmici, mașini & gloanțe\n--- M1–M5 + satul „La Cruce” ---\n\nW/A/S/D mers & condus · E intri/ieși din mașină / vorbești / selfie · Shift fugi\nMouse = privit · Click stânga = foc · Space = drift\nH claxon · M radio on/off · N postul următor · T sare timpul\nJ = schimbi lumea (oraș → sat → mare*) · R = resetezi mașina\n*marea se deblochează cu biletul din M5 „Datoria”',
      16000,
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
