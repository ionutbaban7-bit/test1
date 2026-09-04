// ============================================================
// BACKEND (A23) — M12 „Coletul lui Costel” + M13 „Faleza nebună”.
// Același pattern ca SatQuests/CityQuests: state machine data-driven,
// fără Three.js în logică; entitățile trec prin ctx callbacks.
// M12: ladă cu „saramură” de la Titi (Pescărușul Șchiop) → Căpitanu'
//      Spiridon la Port. M13: cursă pe faleză contra 2 pescari.
// ============================================================

import type { Ped } from './combat';
import type { Vehicle } from './vehicle';
import type { QuestMarker } from './satQuests';
import { racePlace } from './cityRace';
import { M12_PESC, M12_PORT } from './missions';
import { MARE_POS } from './worldMare';

export interface MareQuestCtx {
  player(): { x: number; z: number; mode: 'foot' | 'car' };
  enterPressed(): boolean;
  spawnManagedPed(x: number, z: number, shirt: number, opts?: { hat?: boolean; hatColor?: number; basket?: boolean }): Ped;
  spawnManagedCar(defId: string, x: number, z: number, yaw: number, color?: number): Vehicle;
  removePed(p: Ped): void;
  removeCar(v: Vehicle): void;
  addMarker(x: number, z: number, color: number): QuestMarker;
  playerCar(): Vehicle | null;
  say(text: string, ms?: number): void;
  money(n: number): void;
}

export interface MareFrameResult {
  consumeEnter: boolean;
  speedLimit: number | null;
  done12: boolean;
  done13: boolean;
}

/** Poziția în cursa pe faleză (1–3), după modelul din oraș. */
export function falezaPlace(rivalXs: number[], playerX: number): number {
  return racePlace(rivalXs, playerX);
}

// vitezele de croazieră ale pescarilor (mai blânde decât rivalii din oraș)
const RIVAL_CRUISE = 21;
const RIVAL_SPECS: { defId: string; color: number; z: number }[] = [
  { defId: 'logan', color: 0x8a5aa8, z: 104 }, // „Bibanu' de la Port”
  { defId: 'aro', color: 0x3f7ab3, z: 96 }, // „Sărmăluța”
];

export class MareQuests {
  quest: 'm12' | 'm13' | null = null;
  phase: 'idle' | 'wait' | 'carry' | 'raceWait' | 'count' | 'run' | 'done' = 'idle';
  lastPlace = 0;

  private titi: Ped | null = null;
  private capitan: Ped | null = null;
  private rivals: { veh: Vehicle; speed: number; active: boolean }[] = [];
  private markers: QuestMarker[] = [];
  private t = 0;
  private countShown = 0;

  private removePedFn: ((p: Ped) => void) | null = null;
  private removeCarFn: ((v: Vehicle) => void) | null = null;
  private playerCarFn: (() => Vehicle | null) | null = null;

  reset(): void {
    this.disposeActors();
    for (const m of this.markers) m.dispose();
    this.markers = [];
    this.quest = null;
    this.phase = 'idle';
  }

  private disposeActors(): void {
    if (this.titi) {
      this.removePedFn?.(this.titi);
      this.titi = null;
    }
    if (this.capitan) {
      this.removePedFn?.(this.capitan);
      this.capitan = null;
    }
    for (const r of this.rivals) {
      if (this.playerCarFn?.() !== r.veh) this.removeCarFn?.(r.veh);
      else r.veh.static = false;
    }
    this.rivals = [];
  }

  frame(ctx: MareQuestCtx, dt: number, wanted: 'm12' | 'm13' | null): MareFrameResult {
    const res: MareFrameResult = { consumeEnter: false, speedLimit: null, done12: false, done13: false };
    this.removePedFn = ctx.removePed;
    this.removeCarFn = ctx.removeCar;
    this.playerCarFn = ctx.playerCar;
    if (wanted !== this.quest) {
      if (this.quest) this.disposeActors();
      for (const m of this.markers) m.dispose();
      this.markers = [];
      this.quest = wanted;
      this.phase = wanted === null ? 'idle' : 'wait';
      if (wanted === null) return res;
    }
    if (this.quest === 'm12') this.frameM12(ctx, dt, res);
    else if (this.quest === 'm13') this.frameM13(ctx, dt, res);
    return res;
  }

  // ---------- M12 · „Coletul lui Costel” ----------
  private frameM12(ctx: MareQuestCtx, dt: number, res: MareFrameResult): void {
    const p = ctx.player();
    if (this.phase === 'wait') {
      if (!this.titi) {
        // Titi stă în curtea terasei (nu în peretele sălii 🙂)
        this.titi = ctx.spawnManagedPed(M12_PESC.x - 6, M12_PESC.z + 12, 0xffffff, { hat: true, hatColor: 0xe8e8e8 });
        this.titi.yaw = Math.PI;
        this.titi.sync();
      }
      if (!this.capitan) {
        this.capitan = ctx.spawnManagedPed(M12_PORT.x + 8, M12_PORT.z - 5, 0x2a4a6a, { hat: true, hatColor: 0x1a2a4a });
        this.capitan.yaw = -Math.PI / 2;
        this.capitan.sync();
      }
      if (p.mode === 'foot' && Math.hypot(p.x - (M12_PESC.x - 6), p.z - (M12_PESC.z + 12)) < 3.6 && ctx.enterPressed()) {
        res.consumeEnter = true;
        this.phase = 'carry';
        const m = this.addMk(ctx, M12_PORT.x, M12_PORT.z, 0x44c8ff);
        m.setVisible(true);
        ctx.say(
          'Titi (șorțul miroase a scrumbie): „Lada asta e pentru Căpitanu\' Spiridon, la Port. E… saramură. NU întreba de la cine.”\nDă-i-o la marcajul albastru. Și nu o scăpa: șalăul ăla valorează cât tractorul tău.',
          4600,
        );
      }
      return;
    }
    if (this.phase === 'carry') {
      if (p.mode === 'foot') res.speedLimit = 3.2; // lada e grea — nu fugi cu saramura
      if (Math.hypot(p.x - M12_PORT.x, p.z - M12_PORT.z) < 7) {
        ctx.money(250);
        ctx.say(
          'Căpitanu\' Spiridon (arată cu mustața spre larg): „Saramura lu\' Costel… perfectă. Semnat.\n+250 LEI. Și zi-i lui Costel: peste-un ceas, cursa pe faleză. Câștigătorul ia tot peștele!”',
          5200,
        );
        for (const m of this.markers) m.dispose();
        this.markers = [];
        this.disposeActors();
        this.quest = null;
        this.phase = 'idle';
        res.done12 = true;
        return;
      }
      void dt;
    }
  }

  // ---------- M13 · „Faleza nebună” ----------
  private frameM13(ctx: MareQuestCtx, dt: number, res: MareFrameResult): void {
    const p = ctx.player();
    if (this.phase === 'wait') {
      const near = Math.hypot(p.x - MARE_POS.raceStart.x, p.z - MARE_POS.raceStart.z) < 7;
      if (near && ctx.enterPressed()) {
        if (p.mode === 'car') {
          res.consumeEnter = true;
          this.phase = 'count';
          this.t = 3.2;
          this.countShown = 0;
          this.spawnRivals(ctx);
          ctx.say('🏁 „Faleza nebună”: Bibanu\' de la Port și Sărmăluța te așteaptă. Primul la Port ia tot peștele!', 2800);
        } else {
          ctx.say('🏁 Cursa pe faleză: urcă într-o mașină și revino la linia roșie!', 2400);
        }
      }
      return;
    }
    if (this.phase === 'count') {
      this.t -= dt;
      const sec = Math.ceil(this.t);
      if (sec >= 1 && sec <= 3 && sec !== this.countShown) {
        this.countShown = sec;
        ctx.say(`${sec}...`, 700);
      }
      if (this.t <= 0) {
        if (ctx.player().mode !== 'car') {
          this.phase = 'wait';
          ctx.say('Cursa s-a anulat: pescarii nu aleargă pe jos. Urcă într-o mașină și încearcă iar!', 2600);
        } else {
          this.phase = 'run';
          ctx.say('🚦 GO! Spre Port!', 1200);
        }
      }
      return;
    }
    if (this.phase === 'run' || this.phase === 'done') {
      const pv = ctx.playerCar();
      for (const r of this.rivals) {
        if (!r.active) continue;
        if (r.veh === pv) {
          // ai furat mașina pescarului în timpul cursei 😄
          r.active = false;
          ctx.say('Ai furat mașina pescarului! Acum conduci „Saramura Express”! 😄', 2400);
          continue;
        }
        const diff = p.x - r.veh.x;
        let cruise = RIVAL_CRUISE;
        if (diff > 90) cruise *= 1.12;
        else if (diff < -120) cruise *= 0.92;
        r.speed += (cruise - r.speed) * Math.min(1, dt * 0.9);
        r.veh.x += r.speed * dt;
        r.veh.group.position.set(r.veh.x, 0, r.veh.z);
        r.veh.group.rotation.y = Math.PI / 2;
      }
      if (this.phase === 'run' && p.x > MARE_POS.raceFinishX && Math.abs(p.z - MARE_POS.raceStart.z) < 30) {
        const place = falezaPlace(
          this.rivals.filter((r) => r.active).map((r) => r.veh.x),
          p.x,
        );
        this.lastPlace = place;
        const prize = place === 1 ? 300 : place === 2 ? 150 : 100;
        ctx.money(prize);
        ctx.say(
          place === 1
            ? `🏆 LOCUL 1 la „Faleza nebună”! Pescarii aplaudă cu țigara în colț. +${prize} LEI (și tot peștele)`
            : `🏁 Locul ${place}. +${prize} LEI. „Peștele ăla ți-a fost mai iute…”`,
          4600,
        );
        this.phase = 'wait'; // cursa rămâne deschisă pentru reluare
        this.cleanupRivals(ctx);
        res.done13 = true;
        return;
      }
      // rivalii au scăpat departe? cursa se închide doar la finiș (faleza e dreaptă)
    }
  }

  private spawnRivals(ctx: MareQuestCtx): void {
    const specs: { defId: string; color: number; z: number; x: number }[] = [
      { ...RIVAL_SPECS[0], x: MARE_POS.raceStart.x - 24 },
      { ...RIVAL_SPECS[1], x: MARE_POS.raceStart.x - 32 },
    ];
    for (const s of specs) {
      const veh = ctx.spawnManagedCar(s.defId, s.x, s.z, Math.PI / 2, s.color);
      veh.static = false;
      this.rivals.push({ veh, speed: 0, active: true });
    }
  }

  private cleanupRivals(ctx: MareQuestCtx): void {
    for (const r of this.rivals) {
      if (this.playerCarFn?.() !== r.veh) ctx.removeCar(r.veh);
    }
    this.rivals = [];
  }

  /** Poziția live a jucătorului în cursa pe faleză (1–3). */
  livePlace(playerX: number): number {
    return falezaPlace(
      this.rivals.filter((r) => r.active).map((r) => r.veh.x),
      playerX,
    );
  }

  private addMk(ctx: MareQuestCtx, x: number, z: number, color: number): QuestMarker {
    const m = ctx.addMarker(x, z, color);
    this.markers.push(m);
    return m;
  }

  objective(): string | null {
    if (this.quest === 'm12') {
      if (this.phase === 'wait') return 'Titi te cheamă la Pescărușul Șchiop (marcajul galben, pe faleză). Apasă E lângă el.';
      return 'Du lada cu „saramură” la Căpitanu\' Spiridon, la Port (marcajul albastru). Nu fugi pe jos cu ea: e grea și șeful nu iartă.';
    }
    if (this.quest === 'm13') {
      if (this.phase === 'wait') return '„Faleza nebună”: urcă într-o mașină și mergi la linia ROȘIE din vestul falezei (E la linie).';
      if (this.phase === 'count') return `Start în ${Math.max(0, Math.ceil(this.t))}… accelerație la GO!`;
      if (this.phase === 'run' || this.phase === 'done') return 'FUGI pe faleză spre Port (finish-ul e la marcajul albastru)! Bibanu\' și Sărmăluța sunt pe urmele tale!';
      return null;
    }
    return null;
  }
}
