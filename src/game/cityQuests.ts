// ============================================================
// BACKEND (A17) — M4 „Selfie la Palat” + M5 „Datoria” (final de capitol).
// State machine data-driven, fără Three.js în logică (doar tipuri) —
// același pattern ca SatQuests: entitățile se creează prin ctx callbacks.
// GDD: M4 = stealth-lite + alarmă + evadare cu Șpagă 3 (2 rute: discret ori fuga);
//       M5 = urmărire nocturnă + întâlnirea cu Nea Costel → trimis la mare.
// ============================================================

import type { Ped } from './combat';
import type { Vehicle } from './vehicle';
import type { QuestMarker } from './satQuests';
import { M4_APPROACH, M4_SPOT, M4_GARAGE, M5_SPOT, M5_GATE } from './missions';

export interface CityQuestCtx {
  player(): { x: number; z: number; mode: 'foot' | 'car' };
  enterPressed(): boolean;
  spawnManagedPed(x: number, z: number, shirt: number, opts?: { hat?: boolean; hatColor?: number }): Ped;
  spawnManagedCar(defId: string, x: number, z: number, yaw: number, color?: number): Vehicle;
  removePed(p: Ped): void;
  removeCar(v: Vehicle): void;
  addMarker(x: number, z: number, color: number): QuestMarker;
  /** Vehiculul condus acum de jucător (sau null) — ca să nu ștergem mașina de sub el. */
  playerCar(): Vehicle | null;
  say(text: string, ms?: number): void;
  money(n: number): void;
  teleport(x: number, z: number): void;
  report(x: number, z: number, level: number): void;
  heat(): number;
  ratingInfo(): { m3Place: number };
}

export interface CityFrameResult {
  consumeEnter: boolean;
  done4: boolean;
  done5: boolean;
}

// --- logică pură, testabilă (Testing A19) ---

/** Conul de vedere al Jandarmului: distanță + unghi față de direcția lui. */
export function guardSees(gx: number, gz: number, gyaw: number, px: number, pz: number): boolean {
  const dx = px - gx;
  const dz = pz - gz;
  const d = Math.hypot(dx, dz);
  if (d < 2.6) return true; // prea aproape — te vede și prin ceafă
  if (d > 16) return false;
  const toPlayer = Math.atan2(dx, dz);
  let diff = toPlayer - gyaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < 1.05; // ~60° în fiecare parte
}

/** Patrulare liniară: întoarce noua poziție + direcție (dir = -1 spre stânga). */
export function guardStep(x: number, dir: -1 | 1, minX: number, maxX: number, speed: number, dt: number): { x: number; dir: -1 | 1 } {
  let nx = x + dir * speed * dt;
  let nd = dir;
  if (nx <= minX) {
    nx = minX;
    nd = 1;
  } else if (nx >= maxX) {
    nx = maxX;
    nd = -1;
  }
  return { x: nx, dir: nd };
}

/** Ratingul de final de capitol: 3 portofele = impecabil. */
export function ratingWallets(m3Place: number, m4Caught: boolean, m5Caught: boolean): number {
  let r = 3;
  if (m3Place > 1) r--;
  if (m4Caught) r--;
  if (m5Caught) r--;
  return Math.max(1, r);
}

export const RATING_TEXT: Record<number, string> = {
  3: '👜👜👜 Șmecher de București — garda nu ți-a văzut nici umbra.',
  2: '👜👜 Șmecher pe jumătate — ai scăpat, dar ai transpirat.',
  1: '👜 Mai ai de furat… și de fugit. Mult.',
};

// --- constanțe de scenă ---
const GUARD_Z = -288.6;
const GUARD_MIN_X = -356;
const GUARD_MAX_X = -244;
const GUARD_SPEED = 2.4;
const POSE_TIME = 2.2;
const M4_SPOT_R = 2.6;
const M5_TALK_MS = 3600;

export class CityQuests {
  quest: 'm4' | 'm5' | null = null;
  phase: 'idle' | 'wait' | 'walk' | 'ready' | 'pose' | 'escape' | 'talk' | 'raid' = 'idle';
  /** Pentru main: e raid M5 în toi? */
  raidActive = false;

  private guard: Ped | null = null;
  private guardDir: -1 | 1 = -1;
  private costel: Ped | null = null;
  private costelCar: Vehicle | null = null;
  private spotMk: QuestMarker | null = null;
  private garageMk: QuestMarker | null = null;
  private markers: QuestMarker[] = [];
  private m4Caught = false;
  private m5Caught = false;
  private poseT = 0;
  private poseOX = 0;
  private poseOZ = 0;
  private talkI = 0;
  private talkT = 0;
  private repressT = 0;
  private hintT = 0;

  /** Resetează tot (schimbarea lumii / misiune nouă). */
  reset(): void {
    this.disposeActors();
    for (const m of this.markers) m.dispose();
    this.markers = [];

    this.spotMk = null;
    this.garageMk = null;
    this.quest = null;
    this.phase = 'idle';
    this.raidActive = false;
  }

  /** Poliția te-a prins (main îi spune când aplică o amendă). */
  noteCaught(): void {
    if (this.quest === 'm4' && (this.phase === 'pose' || this.phase === 'escape')) this.m4Caught = true;
    if (this.quest === 'm5' && this.phase === 'raid') this.m5Caught = true;
  }

  private disposeActors(): void {
    if (this.guard) {
      this.removePedFn?.(this.guard);
      this.guard = null;
    }
    if (this.costel) {
      this.removePedFn?.(this.costel);
      this.costel = null;
    }
    if (this.costelCar) {
      // dacă jucătorul conduce Loganul lui Nea Costel, nu-l ștergem de sub el
      if (this.playerCarFn?.() === this.costelCar) {
        this.costelCar.static = false;
      } else {
        this.removeCarFn?.(this.costelCar);
      }
      this.costelCar = null;
    }
  }

  private removePedFn: ((p: Ped) => void) | null = null;
  private removeCarFn: ((v: Vehicle) => void) | null = null;
  private playerCarFn: (() => Vehicle | null) | null = null;

  frame(ctx: CityQuestCtx, dt: number, wanted: 'm4' | 'm5' | null): CityFrameResult {
    const res: CityFrameResult = { consumeEnter: false, done4: false, done5: false };
    this.removePedFn = ctx.removePed;
    this.removeCarFn = ctx.removeCar;
    this.playerCarFn = ctx.playerCar;
    if (wanted !== this.quest) {
      if (this.quest) this.disposeActors();
      for (const m of this.markers) m.dispose();
      this.markers = [];

      this.spotMk = null;
      this.garageMk = null;
      this.quest = wanted;
      this.phase = wanted === null ? 'idle' : 'wait';
      this.raidActive = false;
      if (wanted === 'm4') this.m4Caught = false; // tentativă nouă la selfie
      if (wanted === 'm5') this.m5Caught = false; // m4Caught rămâne: contează la ratingul M5!
      this.poseT = 0;
      this.talkI = 0;
      this.hintT = 0;
      this.guard = null;
      if (wanted === null) return res;
    }
    if (this.quest === 'm4') this.frameM4(ctx, dt, res);
    else if (this.quest === 'm5') this.frameM5(ctx, dt, res);
    return res;
  }

  // ================= M4 · „Selfie la Palat” =================
  private addMk(ctx: CityQuestCtx, x: number, z: number, color: number): QuestMarker {
    const m = ctx.addMarker(x, z, color);
    this.markers.push(m);
    return m;
  }

  private frameM4(ctx: CityQuestCtx, dt: number, res: CityFrameResult): void {
    const p = ctx.player();
    if (this.phase === 'wait') {
      if (p.mode === 'foot' && Math.hypot(p.x - M4_APPROACH.x, p.z - M4_APPROACH.z) < 5 && ctx.enterPressed()) {
        res.consumeEnter = true;
        this.phase = 'walk';
        if (this.markers.length === 0) {
          this.spotMk = this.addMk(ctx, M4_SPOT.x, M4_SPOT.z, 0xdf6ae8);
          this.spotMk.setVisible(true);
        }
        if (!this.guard) {
          this.guard = ctx.spawnManagedPed(GUARD_MAX_X, GUARD_Z, 0x4a5a6a, { hat: true, hatColor: 0x2a3a5a });
          this.guard.yaw = -Math.PI / 2; // pornește spre -x
          this.guard.sync();
        }
        this.guardDir = -1;
        ctx.say(
          'Jandarmu\' Florică patrulează esplanada: „Palatul nu se pozează!”\nTu ai nevoie de un selfie pentru grupul „Bucureștiul Subteran”. Așteaptă garda la capăt și apasă E la punctul mov.',
          4200,
        );
      }
      return;
    }
    if (this.guard) {
      const g = this.guard;
      const step = guardStep(g.x, this.guardDir, GUARD_MIN_X, GUARD_MAX_X, GUARD_SPEED, dt);
      g.x = step.x;
      this.guardDir = step.dir;
      g.yaw = this.guardDir === -1 ? -Math.PI / 2 : Math.PI / 2;
      g.sync();
    }
    const atSpot = p.mode === 'foot' && Math.hypot(p.x - M4_SPOT.x, p.z - M4_SPOT.z) < M4_SPOT_R;

    if (this.phase === 'walk' || this.phase === 'ready') {
      if (atSpot) this.phase = 'ready';
      else if (this.phase === 'ready') this.phase = 'walk';
      if (this.phase === 'ready' && ctx.enterPressed()) {
        res.consumeEnter = true;
        this.phase = 'pose';
        this.poseT = POSE_TIME;
        this.poseOX = p.x;
        this.poseOZ = p.z;
      }
    } else if (this.phase === 'pose') {
      const moved = Math.hypot(p.x - this.poseOX, p.z - this.poseOZ);
      const seen = this.guard ? guardSees(this.guard.x, this.guard.z, this.guard.yaw, p.x, p.z) : false;
      if (p.mode !== 'foot' || moved > 0.6) {
        this.phase = 'walk';
        ctx.say('Te-ai mișcat! Poza s-a mișcat și ea… încearcă din nou când garda e la capăt.', 2200);
        return;
      }
      if (seen) {
        this.caught(ctx);
        return;
      }
      this.poseT -= dt;
      if (this.poseT <= 0) {
        this.phase = 'escape';
        this.spotMk?.setVisible(false);
        this.garageMk = this.addMk(ctx, M4_GARAGE.x, M4_GARAGE.z, 0x44c8ff);
        this.garageMk.setVisible(true);
        ctx.say('🤳 CLICK! Selfie-ul e în grup. Dar blițul… „HOPA! ALARMĂ!”\nJandarmu\' Florică fluieră: Dobre a pornit! ȘPAGĂ 3! Fugi la garajul din Piața Unirii!', 4200);
        ctx.report(M4_SPOT.x, M4_SPOT.z, 3);
      }
    } else if (this.phase === 'escape') {
      if (Math.hypot(p.x - M4_GARAGE.x, p.z - M4_GARAGE.z) < M4_GARAGE.r) {
        ctx.money(200);
        ctx.say('Selfie-ul a ajuns în garaj: grupul „Bucureștiul Subteran” a erupt. 📸 +200 LEI\nFlorică mai fluieră și acuma. Dobre a pierdut urma… de data asta.', 4200);
        this.finishM4();
        res.done4 = true;
      } else if (ctx.heat() === 0) {
        this.hintT += dt;
        if (this.hintT > 6) {
          this.hintT = 0;
          ctx.say('Dobre a rămas în urmă… dar poza trebuie ascunsă la garaj (marcajul albastru).', 2400);
        }
      }
    }
  }

  private caught(ctx: CityQuestCtx): void {
    this.m4Caught = true;
    ctx.money(-100);
    ctx.say('Jandarmu\' Florică: „TE-AM PRINS, PARFUM!”\nAmendă 100 LEI, poza ștearsă și tu dat afară din zonă. Mai încearcă… discret.', 3600);
    ctx.teleport(M4_APPROACH.x, M4_APPROACH.z + 8);
    if (this.guard) {
      this.guard.x = GUARD_MAX_X;
      this.guard.z = GUARD_Z;
      this.guard.yaw = Math.PI / 2;
      this.guardDir = -1;
      this.guard.sync();
    }
    this.phase = 'wait';
  }

  private finishM4(): void {
    this.disposeActors();
    for (const m of this.markers) m.dispose();
    this.markers = [];

    this.spotMk = null;
    this.garageMk = null;
    this.quest = null;
    this.phase = 'idle';
    this.raidActive = false;
  }

  // ================= M5 · „Datoria” =================
  private frameM5(ctx: CityQuestCtx, dt: number, res: CityFrameResult): void {
    const p = ctx.player();
    if (this.phase === 'wait') {
      if (!this.costel) {
        this.costel = ctx.spawnManagedPed(M5_SPOT.x, M5_SPOT.z, 0x3a3a3a, { hat: true, hatColor: 0x111111 });
        this.costel.yaw = 0;
        this.costel.sync();
        this.costelCar = ctx.spawnManagedCar('logan', M5_SPOT.x - 14, M5_SPOT.z + 10, Math.PI / 2, 0x2a4a8a);
      }
      if (p.mode === 'foot' && Math.hypot(p.x - M5_SPOT.x, p.z - M5_SPOT.z) < 3.6 && ctx.enterPressed()) {
        res.consumeEnter = true;
        this.phase = 'talk';
        this.talkI = 0;
        this.talkT = 0;
      }
      return;
    }
    if (this.phase === 'talk') {
      const lines = [
        'Nea Costel (mustața îi zâmbește urât): „Gogu, băiete… mai ai o datorie la mine: 1.000 LEI. Dar am o veste bună: am hotărât s-o transformăm în bilet la mare.”',
        '„Te duci la Constanța, la Pescărușu\' Șchiop. Îi dai coletul și datoria e achitată. Biletul… e la tine în buzunar. Poftă bună la drum.”',
        'Din senin, peste fântână: „PARFUM! Mâinile sus, că ți-am văzut biletul!” Comisarul Dobre a căzut peste Centrul Vechi. FUGI la Autogara de Est!',
      ];
      if (this.talkT <= 0 && this.talkI < lines.length) {
        ctx.say(lines[this.talkI], M5_TALK_MS);
        this.talkI++;
        this.talkT = M5_TALK_MS / 1000 - 0.4;
        if (this.talkI >= lines.length) {
          this.phase = 'raid';
          this.raidActive = true;
          ctx.report(M5_SPOT.x, M5_SPOT.z, 4);
        }
      } else {
        this.talkT -= dt;
      }
      return;
    }
    if (this.phase === 'raid') {
      const pz = ctx.player();
      if (pz.x > M5_GATE.x && Math.abs(pz.z - M5_GATE.z) < M5_GATE.bandZ) {
        this.raidActive = false;
        const rating = ratingWallets(ctx.ratingInfo().m3Place, this.m4Caught, this.m5Caught);
        ctx.money(800);
        ctx.say(
          `🚌 Ai prins autogara! Biletul la mare e valid, datoria către Nea Costel e ACHITATĂ.\n+800 LEI · Rating: ${RATING_TEXT[rating]}\n(Constanța se deblochează în episodul următor — v2)`,
          8000,
        );
        this.disposeActors();
        for (const m of this.markers) m.dispose();
        this.markers = [];

        this.spotMk = null;
        this.garageMk = null;
        this.quest = null;
        this.phase = 'idle';
        res.done5 = true;
        return;
      }
      // Dobre nu renunță: dacă ai scăpat de o echipă, vine alta.
      if (ctx.heat() === 0) {
        this.repressT += dt;
        if (this.repressT > 5) {
          this.repressT = 0;
          ctx.say('Dobre la radio: „Nu-l scăpați! Vrea să plece la mare cu datoria mea de la Mitică!” ȘPAGĂ din nou!', 2600);
          ctx.report(M5_SPOT.x, M5_SPOT.z, 3);
        }
      }
    }
  }

  /** Textul obiectivului curent pentru HUD (orice fază M4/M5). */
  objective(): string | null {
    if (this.quest === 'm4') {
      switch (this.phase) {
        case 'wait':
          return 'Mergi la marcajul mov de lângă Palat și apasă E: selfie de grup, ediția „interzisă”.';
        case 'walk':
          return 'Intră pe esplanadă la punctul mov. Așteaptă garda la capăt, apoi stai pe loc și apasă E la momentul potrivit!';
        case 'ready':
          return 'Garda e departe: ACUM apasă E și nu te mișca 2 secunde!';
        case 'pose':
          return `🤳 POZA SE FACE… ${Math.max(0, this.poseT).toFixed(1)}s — NU TE MIȘCA!`;
        case 'escape':
          return 'FUGI! ȘPAGĂ 3 — Dobre e pe urmele tale. Ascunde selfie-ul la garajul din Piața Unirii (marcajul albastru)!';
        default:
          return null;
      }
    }
    if (this.quest === 'm5') {
      if (this.phase === 'wait') return 'Nea Costel te așteaptă la fântână (marcajul auriu). Apasă E lângă el — datoria nu doarme.';
      if (this.phase === 'talk') return 'Ascultă ce are de zis Nea Costel…';
      if (this.phase === 'raid') return 'FUGI la Autogara de Est (marcajul albastru) — cu mașina, pe jos, cum vrei! Dobre nu glumește.';
      return null;
    }
    return null;
  }
}
