// ============================================================
// BACKEND AGENT (A6) — „SatQuests”: misiunile rurale M6–M11.
// State machine data-driven, fără Three.js în logică (doar tipuri).
// Entitățile (Ped/Vehicle) sunt create/șterse prin callbacks (ctx),
// ca modulul să rămână testabil și agenții să nu se calce pe picioare.
// ============================================================

import type { Ped } from './combat';
import type { Vehicle } from './vehicle';

export interface QuestPedOpts {
  baba?: boolean;
  scarfColor?: number;
  hat?: boolean;
  hatColor?: number;
  basket?: boolean;
}

export interface QuestMarker {
  setVisible(v: boolean): void;
  setPos(x: number, z: number): void;
  dispose(): void;
}

export interface SatQuestCtx {
  player(): { x: number; z: number; mode: 'foot' | 'car'; speed: number };
  enterPressed(): boolean;
  firePressed(): boolean;
  spawnPed(x: number, z: number, shirt: number, opts?: QuestPedOpts): Ped;
  /** Ped gestionat manual de quest (nu intră în AI-ul de pietoni). */
  spawnManagedPed(x: number, z: number, shirt: number, opts?: QuestPedOpts): Ped;
  spawnCar(defId: string, x: number, z: number, yaw: number): Vehicle;
  removePed(p: Ped): void;
  removeCar(v: Vehicle): void;
  /** Găsește un vehicul parcat (static) dintr-un anumit fel, lângă un punct. */
  findParked(defId: string, nearX: number, nearZ: number, r: number): Vehicle | null;
  addMarker(x: number, z: number, color: number): QuestMarker;
  say(text: string, ms?: number): void;
  money(n: number): void;
  bonk(): void;
  hurt(): void;
}

export type QuestId = 'none' | 'm6' | 'm7' | 'm8' | 'm9' | 'm10' | 'm11';

// --- poziții fixe din sat (centru de date; se mută în JSON când crește) ---
export const QPOS = {
  giver: { x: 30, z: -112 }, // baba cu borcanele (lângă primărie)
  receiver: { x: 104, z: 128 }, // baba de la biserică
  farmer: { x: -130, z: 2 }, // omul cu pălărie
  tractorHome: { x: -120, z: -5 },
  cartHome: { x: 124, z: -5 },
  mayor: { x: 34, z: -110 }, // primarul
  butoi: { x: 48, z: 28 }, // butoiul cu țuică la Micuțu
  fieldStart: { x: 104, z: -70 }, // marginea câmpului cu fân
  barZone: { x: 40, z: 36 }, // ascunzătoarea la cârciumă
  copSpawn: { x: 60, z: -75 },
} as const;

const STACKS: [number, number][] = [
  [94, -60],
  [132, -30],
  [106, -52],
];
const GEESE: [number, number][] = [
  [168, -100],
  [164, -96],
];

// --- logica PURĂ (testabilă în Node) ---
/** Borcanele se sparg dacă alergi prea tare sau te ia gâsca pe sus. */
export function jarsShouldBreak(speedAbs: number, nearGoose: boolean): boolean {
  return speedAbs > 3.4 || nearGoose;
}

/** Oboseala calului: crește când tragi de căruță, scade la pauză. */
export function cartFatigue(fatigue: number, throttle: number, speedAbs: number, dt: number): number {
  let f = fatigue;
  if (throttle > 0.05 && speedAbs > 0.2) f += dt;
  else f -= dt * 2;
  return Math.max(0, Math.min(30, f));
}

/** Calul oprit complet peste pragul de oboseală. */
export function horseRefuses(fatigue: number): boolean {
  return fatigue >= 22;
}
export const HORSE_RESTART_AT = 14;

export interface FrameResult {
  consumeEnter: boolean;
  consumeFire: boolean;
  speedLimit: number | null;
}

// ============================================================
export class SatQuests {
  quest: QuestId = 'none';
  drunk = 0; // 0..3 — efectul „lași fierbinți”
  private phase = '';
  private t = 0;
  private t2 = 0;
  private cd = 0;
  private ready = false;

  private staticPeds: Ped[] = [];
  private copPed: Ped | null = null;
  private copBike: Vehicle | null = null;

  // m6
  private jarTimer = 0;
  // m7
  private m7Idx = 0;
  // m8
  private tractor: Vehicle | null = null;
  // m9
  private m9Fat = 0;
  private m9Cart: Vehicle | null = null;
  private m9Warned = false;
  // m10
  private m10Rounds = 0;
  // m11
  private m11Punches = 0;
  private mayor: Ped | null = null;

  private markers: QuestMarker[] = [];
  private endMarker: QuestMarker | null = null;

  private removePedFn: ((p: Ped) => void) | null = null;
  private removeCarFn: ((v: Vehicle) => void) | null = null;

  private near(x: number, z: number, tx: number, tz: number, r: number): boolean {
    return (x - tx) ** 2 + (z - tz) ** 2 < r * r;
  }

  private clearMarkers(): void {
    for (const m of this.markers) m.dispose();
    this.markers = [];
    this.endMarker = null;
  }

  private setQuest(id: QuestId, phase: string): void {
    this.quest = id;
    this.phase = phase;
    this.t = 0;
    this.t2 = 0;
    this.cd = 0;
  }

  private startM6(ctx: SatQuestCtx): void {
    this.setQuest('m6', 'carry');
    this.jarTimer = 110;
    const m = ctx.addMarker(QPOS.receiver.x, QPOS.receiver.z, 0xd9f0a0);
    this.endMarker = m;
    this.markers.push(m);
    ctx.say('Baba: „Ia plasa cu borcane și du-o la mătușa de la biserică! Dar să nu fugi, că se sparg!"', 3400);
  }

  private startM8(ctx: SatQuestCtx): void {
    const tr = ctx.findParked('tractor', QPOS.tractorHome.x, QPOS.tractorHome.z, 10);
    if (tr) {
      this.tractor = tr;
      this.setQuest('m8', 'walk');
      ctx.say('Nea Păun: „Ăsta-i tractorul meu de muncă! Îl iau la cârciumă — prinde-mă dacă poți!"', 3200);
    } else {
      ctx.say('Nea Păun: „Tractorul? L-a împrumutat careva înaintea ta… vezi-ți de treabă!"', 2600);
    }
  }

  /** Resetează tot (la ieșirea din sat). */
  reset(): void {
    this.cancelQuest();
    for (const p of this.staticPeds) this.removePedFn?.(p);
    this.staticPeds = [];
    this.clearMarkers();
    this.ready = false;
    this.drunk = 0;
  }

  /** Personajele fixe ale satului (create o dată la intrarea în sat). */
  private setup(ctx: SatQuestCtx): void {
    this.removePedFn = ctx.removePed;
    this.removeCarFn = ctx.removeCar;
    this.staticPeds.push(ctx.spawnPed(QPOS.giver.x, QPOS.giver.z, 0x6a4a8a, { baba: true, scarfColor: 0xc8402c, basket: true }));
    this.staticPeds.push(ctx.spawnPed(QPOS.receiver.x, QPOS.receiver.z, 0x3a3a3a, { baba: true, scarfColor: 0xffffff }));
    this.staticPeds.push(ctx.spawnPed(QPOS.farmer.x, QPOS.farmer.z, 0x6a5a4a, { hat: true, hatColor: 0x8a6a3a }));
    // primarul e „gestionat”: stă fix, să poți să-l „corecționezi” liniștit
    const mayor = ctx.spawnManagedPed(QPOS.mayor.x, QPOS.mayor.z, 0x7a2a3a, { hat: true, hatColor: 0x2a2a2a });
    this.mayor = mayor;
    this.staticPeds.push(mayor);
    this.ready = true;
  }

  private cancelQuest(): void {
    if (this.copPed) {
      this.removePedFn?.(this.copPed);
      this.copPed = null;
    }
    if (this.copBike) {
      this.removeCarFn?.(this.copBike);
      this.copBike = null;
    }
    this.clearMarkers();
    this.quest = 'none';
    this.phase = '';
    this.tractor = null;
    this.m9Cart = null;
    this.m9Fat = 0;
    this.m9Warned = false;
    this.m7Idx = 0;
    this.m10Rounds = 0;
    this.m11Punches = 0;
  }

  private reviveMayor(): void {
    const m = this.mayor;
    if (!m) return;
    m.hp = 100;
    m.state = 'wander';
    m.mesh.visible = true;
    m.mesh.rotation.set(0, 0, 0);
    m.mesh.position.y = 0;
    m.deadTimer = 0;
    m.x = QPOS.mayor.x;
    m.z = QPOS.mayor.z;
    m.sync();
  }

  private removeCop(ctx: SatQuestCtx): void {
    if (this.copPed) {
      ctx.removePed(this.copPed);
      this.copPed = null;
    }
    if (this.copBike) {
      ctx.removeCar(this.copBike);
      this.copBike = null;
    }
  }

  /** Când ești cu borcanele, nu ai voie în mașini. */
  blocksCarEnter(): boolean {
    return this.quest === 'm6';
  }

  /** Căruța e oprită de calul obosit (main taie viteza la 0 după update). */
  horseStopped(): boolean {
    return this.quest === 'm9' && horseRefuses(this.m9Fat);
  }

  /** Frame principal; se apelează din main DOAR când suntem în sat. */
  frame(ctx: SatQuestCtx, dt: number): FrameResult {
    const res: FrameResult = { consumeEnter: false, consumeFire: false, speedLimit: null };
    if (!this.ready) {
      this.setup(ctx);
    }
    const p = ctx.player();

    if (this.drunk > 0) {
      this.drunk = Math.max(0, this.drunk - dt * (3 / 45));
    }

    // ---------- pornirea misiunilor (când nu e alta activă) ----------
    if (this.quest === 'none') {
      if (ctx.enterPressed() && p.mode === 'foot') {
        const talkR = 8; // generos: personajele se plimbă agale
        if (this.near(p.x, p.z, QPOS.giver.x, QPOS.giver.z, talkR)) {
          this.startM6(ctx);
          res.consumeEnter = true;
        } else if (this.near(p.x, p.z, QPOS.farmer.x, QPOS.farmer.z, talkR)) {
          this.startM8(ctx);
          res.consumeEnter = true;
        } else if (this.near(p.x, p.z, QPOS.mayor.x, QPOS.mayor.z, talkR)) {
          this.setQuest('m11', 'beat');
          this.m11Punches = 0;
          ctx.say('Primarul: „Am pus taxă pe fân! Și pe mici! Și pe aer!"\nGogu: „Stai să-ți explic eu democrația..."', 3400);
          res.consumeEnter = true;
        } else if (this.near(p.x, p.z, QPOS.butoi.x, QPOS.butoi.z, 3.6)) {
          this.setQuest('m10', 'round');
          this.m10Rounds = 0;
          this.t2 = 0.01;
          ctx.say('La Micuțu\': „Hai noroc! Țuică fiartă, trei rânduri, ca la carte!"', 2600);
          res.consumeEnter = true;
        } else if (this.near(p.x, p.z, QPOS.fieldStart.x, QPOS.fieldStart.z, 4.5)) {
          this.setQuest('m7', 'goto');
          this.m7Idx = 0;
          const m = ctx.addMarker(STACKS[0][0], STACKS[0][1], 0xa8e06a);
          this.endMarker = m;
          this.markers.push(m);
          ctx.say('Ia coasa! Apropie-te de fiecare claie și apasă E la momentul potrivit.', 2600);
          res.consumeEnter = true;
        } else if (this.near(p.x, p.z, QPOS.cartHome.x, QPOS.cartHome.z, 4.0)) {
          const ct = ctx.findParked('cart', QPOS.cartHome.x, QPOS.cartHome.z, 8);
          if (ct) {
            this.m9Cart = ct;
            this.m9Fat = 0;
            this.m9Warned = false;
            this.setQuest('m9', 'ride');
            const m = ctx.addMarker(QPOS.barZone.x, QPOS.barZone.z - 20, 0xd9b334);
            this.endMarker = m;
            this.markers.push(m);
            ctx.say('Ia căruța cu fân până la cârciuma lui Micuțu! Dar ai grijă la cal — nu-l chinui.', 3000);
            res.consumeEnter = true;
          }
        }
      }
      return res;
    }

    // ---------- quest activ ----------
    this.t += dt;
    this.cd = Math.max(0, this.cd - dt);

    if (this.quest === 'm6') {
      res.speedLimit = 2.9;
      this.jarTimer -= dt;
      const nearGoose = GEESE.some(([gx, gz]) => this.near(p.x, p.z, gx, gz, 3.6));
      if (this.jarTimer <= 0 || jarsShouldBreak(p.speed, nearGoose)) {
        ctx.say(nearGoose
          ? 'O gâscă a dat buzna în tine! Borcanele s-au spart: -50 LEI. Baba mai are o ladă…'
          : 'Ai umblat prea mult cu borcanele. Baba: „Măi, le-ai plimbat degeaba!" -50 LEI.', 3000);
        ctx.money(-50);
        this.cancelQuest();
        return res;
      }
      if (p.mode === 'foot' && this.near(p.x, p.z, QPOS.receiver.x, QPOS.receiver.z, 8)) {
        ctx.say('Mătușa: „Vai, ce băiat bun! Ia 120 de lei și un borcan de compot de gutui pentru drum."', 3200);
        ctx.money(120);
        this.endMarker?.setVisible(false);
        this.cancelQuest();
        return res;
      }
    }

    if (this.quest === 'm7') {
      const [sx, sz] = STACKS[this.m7Idx];
      this.endMarker?.setPos(sx, sz);
      if (this.phase === 'goto') {
        if (this.near(p.x, p.z, sx, sz, 4.4)) {
          this.phase = 'swing';
          this.t2 = 1.2;
          ctx.say('Ia coasa… și ACUM! (apasă E când vezi „ACUM")', 1500);
        }
      } else if (this.phase === 'swing') {
        this.t2 -= dt;
        const on = this.t2 <= 0 && this.t2 > -2.0;
        if (on && ctx.enterPressed()) {
          this.m7Idx++;
          ctx.bonk();
          if (this.m7Idx >= STACKS.length) {
            ctx.say('Clăile sunt cosite! +200 LEI de la Nea Păun („pentru muncă cinstită").', 3000);
            ctx.money(200);
            this.cancelQuest();
          } else {
            this.phase = 'goto';
            ctx.say(`Claia ${this.m7Idx} gata! Mai sunt ${STACKS.length - this.m7Idx}.`, 1500);
          }
        } else if (this.t2 <= -2.0) {
          this.phase = 'goto';
          ctx.say('Ai tăiat doar iarba. Mai încearcă o dată!', 1300);
        }
      }
      const nearG = GEESE.some(([gx, gz]) => this.near(p.x, p.z, gx, gz, 4));
      if (nearG) ctx.say('Gâștele s-au speriat de coasă și au fugit în balta lor.', 1500);
    }

    if (this.quest === 'm8' && this.tractor) {
      const tr = this.tractor;
      const farmer = this.staticPeds.find((pp) => pp.hat);
      if (this.phase === 'walk') {
        if (farmer) {
          // îl direcționăm prin AI-ul normal de pietoni (wanderTarget)
          farmer.wanderTarget = { x: tr.x, z: tr.z };
          const d = Math.hypot(tr.x - farmer.x, tr.z - farmer.z);
          if (d < 1.7) {
            this.phase = 'drive';
            tr.static = false;
            ctx.say('Nea Păun a pornit cu tractorul! Prinde-l și oprește-l cu E.', 3000);
          }
        } else {
          this.phase = 'drive';
          tr.static = false;
        }
      } else if (this.phase === 'drive') {
        tr.x += 8.0 * dt;
        tr.yaw = Math.PI / 2;
        tr.group.position.set(tr.x, 0, tr.z);
        tr.group.rotation.y = tr.yaw;
        if (tr.x >= 112) {
          ctx.say('Nea Păun a scăpat până la cârciumă și a pus mâna pe țuică. Mai încearcă!', 2800);
          tr.resetToHome();
          tr.static = true;
          this.cancelQuest();
          return res;
        }
        if (this.near(p.x, p.z, tr.x, tr.z, 3.6) && ctx.enterPressed()) {
          // oprit — indiferent dacă ești pe jos sau într-un alt vehicul
          tr.static = true;
          this.phase = 'caught';
          ctx.say('L-ai prins! Pălăria i-a zburat în șanț. +250 LEI „de păstrat tăcerea".\nTractorul e al tău (împrumutat pe viață).', 3600);
          ctx.money(250);
          if (farmer) {
            farmer.x = tr.x - 6;
            farmer.z = QPOS.farmer.z;
            farmer.sync();
          }
          this.t2 = 2.5;
          res.consumeEnter = true;
        }
      } else if (this.phase === 'caught') {
        this.t2 -= dt;
        if (farmer) farmer.wanderTarget = { x: QPOS.farmer.x, z: QPOS.farmer.z };
        if (this.t2 <= 0) {
          this.cancelQuest();
        }
      }
    }

    if (this.quest === 'm9' && this.m9Cart) {
      const spd = p.mode === 'car' ? p.speed : 0;
      const throttle = p.mode === 'car' && spd > 0.2 ? 1 : 0;
      this.m9Fat = cartFatigue(this.m9Fat, throttle, spd, dt);
      if (horseRefuses(this.m9Fat)) {
        if (!this.m9Warned) {
          ctx.say('Calul a obosit! S-a oprit și se uită la tine lung. Dă-i pauză 5 secunde…', 3000);
          this.m9Warned = true;
        }
      } else {
        this.m9Warned = false;
      }
      if (p.mode === 'car' && this.near(p.x, p.z, QPOS.barZone.x, QPOS.barZone.z - 20, 8)) {
        ctx.say('Fânul a ajuns la cârciumă! +200 LEI și covrigi calzi de la Micuțu.', 3200);
        ctx.money(200);
        this.endMarker?.setVisible(false);
        this.cancelQuest();
      }
    }

    if (this.quest === 'm10') {
      this.t2 -= dt;
      const on = this.t2 <= 0 && this.t2 > -2.4;
      if (on && ctx.enterPressed()) {
        this.m10Rounds++;
        ctx.bonk();
        if (this.m10Rounds >= 3) {
          this.drunk = 3;
          ctx.money(50);
          ctx.say('Micuțu\': „Lași fierbinți!" (+50 LEI)\nCapul tău: „De ce fierbe podeaua?"', 3200);
          this.cancelQuest();
        } else {
          this.t2 = 2.8;
          ctx.say(`Rândul ${this.m10Rounds}/3 — „Hai noroc, Gogu!"`, 1500);
        }
        res.consumeEnter = true;
      } else if (this.t2 <= -2.4) {
        ctx.say('Hai, nu te prosti — dă-i drumul! (apasă E)', 1400);
        this.t2 = 1.6;
      }
    }

    if (this.quest === 'm11') {
      const mm = this.mayor;
      if (this.phase === 'beat' && mm) {
        if (ctx.firePressed() && this.cd <= 0 && this.near(p.x, p.z, mm.x, mm.z, 3.0)) {
          this.cd = 0.55;
          ctx.bonk();
          this.m11Punches++;
          const died = mm.hit(34);
          if (died) {
            this.phase = 'escapeWait';
            this.t2 = 1.2;
            ctx.say('Primarul: „Bine, bine… ridic taxa pe fân!"\n(Dar polițistul satului a văzut tot. Fugi!)', 3400);
          } else {
            ctx.say(`Pumnul de la bloc! (${this.m11Punches}/3)`, 900);
          }
          res.consumeFire = true;
        }
      } else if (this.phase === 'escapeWait') {
        this.t2 -= dt;
        if (this.t2 <= 0) {
          this.phase = 'chase';
          this.copPed = ctx.spawnManagedPed(QPOS.copSpawn.x, QPOS.copSpawn.z, 0x2a4a8a, { hat: true, hatColor: 0xe8e8e8 });
          this.copBike = ctx.spawnCar('bicicleta', QPOS.copSpawn.x, QPOS.copSpawn.z, Math.PI);
          this.t = 0;
          ctx.say('Polițistu\' (pe bicicleta Poliției): „Stai acolo, Parfum!"\nAscunde-te la cârciumă până se răcește treaba!', 3400);
        }
      } else if (this.phase === 'chase' && this.copPed) {
        const cop = this.copPed;
        const dx = p.x - cop.x;
        const dz = p.z - cop.z;
        const d = Math.hypot(dx, dz) || 1;
        const sp = 7.6;
        cop.x += (dx / d) * sp * dt;
        cop.z += (dz / d) * sp * dt;
        cop.yaw = Math.atan2(dx, dz);
        cop.sync();
        const b = this.copBike;
        if (b) {
          b.x = cop.x;
          b.z = cop.z;
          b.yaw = cop.yaw;
          b.group.position.set(cop.x, 0, cop.z);
          b.group.rotation.y = cop.yaw;
        }
        if (d < 2.4) {
          ctx.say('Te-a prins! 100 LEI amendă „pentru tulburarea liniștii cu pumni democrați".', 3200);
          ctx.money(-100);
          ctx.hurt();
          this.reviveMayor();
          this.removeCop(ctx);
          this.cancelQuest();
          return res;
        }
        if (this.near(p.x, p.z, QPOS.barZone.x, QPOS.barZone.z, 9)) {
          ctx.say('Micuțu\': „Pe aici, mă! În spatele butoiului!" Polițistul a dat târcoale și a plecat. +150 LEI.', 3400);
          ctx.money(150);
          this.reviveMayor();
          this.removeCop(ctx);
          this.cancelQuest();
          return res;
        }
        if (this.t > 55) {
          ctx.say('Polițistu\' s-a plictisit: „Hai, du-te, dar mâine îți verific cauciucurile!"', 2800);
          this.reviveMayor();
          this.removeCop(ctx);
          this.cancelQuest();
        }
      }
    }

    return res;
  }

  /** Textul obiectivului curent pentru HUD. */
  objective(ctx: SatQuestCtx): string | null {
    const p = ctx.player();
    const hint = (tx: number, tz: number, txt: string, r = 8): string | null =>
      this.near(p.x, p.z, tx, tz, r) ? txt : null;
    switch (this.quest) {
      case 'm6':
        return 'Du plasa cu borcane la mătușa de lângă biserică (marcaj). NU fugi! Ferește-te de gâște!';
      case 'm7':
        return this.phase === 'swing'
          ? 'ACUM! Apasă E cât e timp!'
          : `Mergi la claia ${this.m7Idx + 1} din ${STACKS.length} (marcaj) și apasă E la momentul potrivit.`;
      case 'm8':
        return this.phase === 'drive'
          ? 'Prinde tractorul lui Nea Păun și apasă E lângă el!'
          : this.phase === 'walk'
            ? 'Nea Păun se urcă în tractor… pregătește-te!'
            : 'Tractorul e al tău. Hai să-l probezi!';
      case 'm9':
        return horseRefuses(this.m9Fat)
          ? 'Calul e obosit: oprește-te 5 secunde să-și revină.'
          : `Du căruța cu fân la cârciumă (marcaj). Oboseala calului: ${Math.round((this.m9Fat / 30) * 100)}%`;
      case 'm10':
        return `Mai bea ${3 - this.m10Rounds} rânduri de țuică fiartă (apasă E la momentul potrivit)!`;
      case 'm11':
        return this.phase === 'beat'
          ? `Dă-i o corecție primarului: click lângă el (mai are ${3 - this.m11Punches} pumni de primit)!`
          : this.phase === 'chase'
            ? 'FUGI! Polițistul e pe bicicletă — ascunde-te la cârciumă!'
            : 'Primarul a picat. Acum fuge toată lumea după tine…';
      default: {
        const giver = hint(QPOS.giver.x, QPOS.giver.z, 'Apasă E: Baba are o plasă cu borcane de livrat.');
        if (giver) return giver;
        const farmer = hint(QPOS.farmer.x, QPOS.farmer.z, 'Apasă E: Nea Păun se laudă cu tractorul.');
        if (farmer) return farmer;
        const mayor = hint(QPOS.mayor.x, QPOS.mayor.z, 'Apasă E: Primarul strânge taxă pe fân…');
        if (mayor) return mayor;
        const butoi = hint(QPOS.butoi.x, QPOS.butoi.z, 'Apasă E: țuică fiartă la Micuțu! (grijă: „lași fierbinți")', 5);
        if (butoi) return butoi;
        const field = hint(QPOS.fieldStart.x, QPOS.fieldStart.z, 'Apasă E: dă cu coasa pe câmp (3 clăi, la fix).', 6);
        if (field) return field;
        const cart = hint(QPOS.cartHome.x, QPOS.cartHome.z, 'Apasă E: căruța cu fân așteaptă șofer.', 6);
        if (cart) return cart;
        if (this.drunk > 0) return 'Ești cherchelit de la țuică… „lași fierbinți". Ulițele se leagănă!';
        return null;
      }
    }
  }
}
