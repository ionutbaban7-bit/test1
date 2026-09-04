// ============================================================
// (A14) — Cursa „Noaptea Unirii” (NFS Underground vibe).
// Traseu: Bulevardul Unirii, cu o „gâgâ” în dreptul statuii din Piața Unirii.
// 3 rivali AI: urmează waypoint-urile, au viteze proprii și „rubber-band”
// subtil (dacă rămân în spate, accelerează puțin; dacă fug în față, încetinesc).
// ============================================================

import type { Vehicle } from './vehicle';

export const RACE_START = { x: -296, z: -192 };
export const RACE_FINISH_X = 334;
export const RACE_CP_X = [-200, -90, 20, 130, 240];

const ROUTE: { x: number; z: number }[] = [
  { x: -262, z: -192 },
  { x: -150, z: -192 },
  { x: -58, z: -192 },
  { x: 0, z: -217 }, // ocolește statuia din Piața Unirii
  { x: 60, z: -192 },
  { x: 150, z: -192 },
  { x: 240, z: -192 },
  { x: 316, z: -192 },
];

/** Locul jucătorului: 1 + câți rivali au trecut linia înaintea lui. */
export function racePlace(rivalXs: number[], playerX: number): number {
  return 1 + rivalXs.filter((x) => x > playerX).length;
}

export interface RaceCtx {
  player(): { x: number; z: number; mode: 'foot' | 'car' };
  playerVehicle(): Vehicle | null;
  spawnRival(defId: string, color: number, x: number, z: number): Vehicle;
  removeVehicle(v: Vehicle): void;
  banner(text: string, ms?: number): void;
  money(n: number): void;
  policeClear(): void;
}

interface Rival {
  veh: Vehicle;
  speed: number;
  cruise: number;
  wpIdx: number;
  active: boolean;
}

const RIVAL_SPECS: { defId: string; color: number }[] = [
  { defId: 'logan', color: 0xb33a2c },
  { defId: 'dacia', color: 0x3f7ab3 },
  { defId: 'serie3', color: 0xd8a13a },
];

export class CityRace {
  state: 'idle' | 'count' | 'run' | 'done' = 'idle';
  private t = 0;
  private rivals: Rival[] = [];
  private cpIdx = 0;

  get active(): boolean {
    return this.state !== 'idle';
  }

  start(ctx: RaceCtx): void {
    if (this.state !== 'idle') return;
    const p = ctx.player();
    if (p.mode !== 'car') return;
    ctx.policeClear();
    // concurenții pleacă din spatele liniei, pe benzile lor
    const xs = [-330, -338, -346];
    const zs = [-188, -196, -192];
    this.rivals = RIVAL_SPECS.map((spec, i) => {
      const veh = ctx.spawnRival(spec.defId, spec.color, xs[i], zs[i]);
      return {
        veh,
        speed: 0,
        cruise: veh.def.top * 0.8,
        wpIdx: 0,
        active: true,
      };
    });
    this.cpIdx = 0;
    this.t = 3.2;
    this.state = 'count';
    ctx.banner('🏁 Cursa „Noaptea Unirii”\n3 rivali te așteaptă la linie. Accelerează la GO!', 2600);
  }

  cancel(ctx: RaceCtx): void {
    for (const r of this.rivals) {
      if (ctx.playerVehicle() !== r.veh) ctx.removeVehicle(r.veh);
    }
    this.rivals = [];
    this.state = 'idle';
  }

  update(dt: number, ctx: RaceCtx): void {
    if (this.state === 'idle') return;
    const p = ctx.player();

    if (this.state === 'count') {
      this.t -= dt;
      const sec = Math.ceil(this.t);
      if (sec >= 1 && sec <= 3) {
        ctx.banner(`${sec}...`, 600);
      }
      if (this.t <= 0) {
        this.state = 'run';
        ctx.banner('🚦 GO! 🏁', 1200);
      }
      return;
    }

    if (this.state === 'run' || this.state === 'done') {
      const pv = ctx.playerVehicle();
      for (const r of this.rivals) {
        if (!r.active) continue;
        if (r.veh === pv) {
          // ai furat mașina rivalului în timpul cursei — ești tu șoferul acum 😄
          r.active = false;
          ctx.banner('Ai furat mașina rivalului! Acum conduci Dacia lui albastră! 😄', 2200);
          continue;
        }
        const diff = p.x - r.veh.x;
        let cruise = r.cruise;
        if (diff > 100) cruise *= 1.12;
        else if (diff < -140) cruise *= 0.92;
        r.speed += (cruise - r.speed) * Math.min(1, dt * 0.9);
        r.veh.x += r.speed * dt;
        const wp = ROUTE[r.wpIdx];
        if (wp && Math.abs(r.veh.x - wp.x) < 6) {
          r.veh.z += (wp.z - r.veh.z) * Math.min(1, dt * 2);
          if (r.wpIdx < ROUTE.length - 1) r.wpIdx++;
        } else if (wp && wp.x > r.veh.x + 1) {
          r.veh.z += (wp.z - r.veh.z) * Math.min(1, dt * 1.2);
        }
        r.veh.group.position.set(r.veh.x, 0, r.veh.z);
        r.veh.group.rotation.y = Math.PI / 2;
      }

      while (this.cpIdx < RACE_CP_X.length && p.x > RACE_CP_X[this.cpIdx]) {
        this.cpIdx++;
      }

      if (this.state === 'run' && p.x > RACE_FINISH_X) {
        const place = racePlace(
          this.rivals.filter((r) => r.active).map((r) => r.veh.x),
          p.x,
        );
        const prize = place === 1 ? 400 : place === 2 ? 200 : 100;
        ctx.money(prize);
        ctx.banner(
          place === 1
            ? `🏆 LOCUL 1! Bulevardul e al tău! +${prize} LEI`
            : `🏁 Locul ${place}. +${prize} LEI (mai antrenează-te la mici)`,
          4200,
        );
        this.state = 'done';
        ctx.policeClear();
      }

      for (const r of this.rivals) {
        if (r.active && r.veh.x > 380) {
          if (ctx.playerVehicle() !== r.veh) ctx.removeVehicle(r.veh);
          r.active = false;
        }
      }
      if (this.rivals.every((r) => !r.active) && this.state === 'done') {
        this.state = 'idle';
      }
      if (this.state === 'run' && this.rivals.every((r) => !r.active)) {
        ctx.banner('Rivalii au terminat fără tine… Mai încearcă!', 2600);
        this.state = 'idle';
      }
    }
  }
}
