// ============================================================
// BACKEND AGENT (A13) — Poliția: sistemul „Nivel de Șpagă” (heat 0–5).
// Urmărire pe drumuri cu waypoint-graph + A* (vezi pathfind.ts).
// Reguli GDD §3.2: mașina vede jucătorul pe rază, îl urmărește la
// ultima poziție văzută, heat-ul scade dacă scapi; prinderea = amendă.
// ============================================================

import type { Vehicle } from './vehicle';
import { PathGraph, PathFollower, findPath, angleDiff } from './pathfind';

export interface PoliceCtx {
  player(): { x: number; z: number; mode: 'foot' | 'car' };
  playerVehicle(): Vehicle | null;
  spawnCar(defId: string, x: number, z: number, yaw: number): Vehicle;
  removeCar(v: Vehicle): void;
  /** Rulează coliziunea lumii pe vehicul (clădiri + mașini parcate). */
  collideVehicle(v: Vehicle): void;
  say(text: string, ms?: number): void;
  fine(n: number): void;
}

interface CopUnit {
  veh: Vehicle;
  follower: PathFollower | null;
  repath: number;
  noSeenT: number;
  stopT: number;
  leaving: boolean;
  lastX: number;
  lastZ: number;
}

const SIGHT = 55; // raza de „vedere” a polițistului
const CRUISE_FRAC = 0.62; // viteza de croazieră (fracțiune din viteza maximă)

// --- logică pură „Șpagă”, testabilă (Testing A19) ---
export const HEAT_CAP = 5;
export const FINE_MULT = 150; // amendă = Șpagă × FINE_MULT LEI
export const reportHeatLevel = (heat: number, level: number): number =>
  Math.min(HEAT_CAP, Math.max(0, heat) + Math.max(0, level));
export const decayHeat = (heat: number): number => Math.max(0, heat - 1);
export const fineAmount = (heat: number): number => heat * FINE_MULT;

const pickHash = (n: number): number => {
  const x = Math.sin(n * 91.7 + 13.3) * 43758.5453;
  return x - Math.floor(x);
};

export class PoliceManager {
  heat = 0;
  private cops: CopUnit[] = [];
  private lastSeen = { x: 0, z: 0 };
  private spawnT = 0;
  private caughtCd = 0;
  private ctx: PoliceCtx | null = null;

  constructor(private graph: PathGraph) {}

  /** Un martor a sunat la „112” (furt, scandal...). level = cât de grav. */
  report(x: number, z: number, level: number): void {
    if (this.caughtCd > 0) return; // după o prindere, martorii tac o vreme
    this.heat = reportHeatLevel(this.heat, level);
    this.lastSeen = { x, z };
    this.spawnT = Math.max(this.spawnT, 1.0);
  }

  /** Curăță tot (schimbarea lumii / început de cursă). */
  clear(): void {
    if (this.ctx) {
      for (const c of this.cops) this.ctx.removeCar(c.veh);
    }
    this.cops = [];
    this.heat = 0;
    this.spawnT = 0;
  }

  update(dt: number, ctx: PoliceCtx): void {
    this.ctx = ctx;
    this.caughtCd = Math.max(0, this.caughtCd - dt);
    if (this.heat > 0 && this.cops.length === 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) this.spawnCop(ctx);
    }
    for (const cop of [...this.cops]) this.updateCop(cop, ctx, dt);
  }

  private spawnCop(ctx: PoliceCtx): void {
    const p = ctx.player();
    // alege un nod de intersecție la 60..140 m de infracțiune (nu pe capul tău)
    const cands: number[] = [];
    for (let i = 0; i < this.graph.nodes.length; i++) {
      const nd = this.graph.nodes[i];
      const d = Math.hypot(nd.x - this.lastSeen.x, nd.z - this.lastSeen.z);
      if (d > 60 && d < 140) cands.push(i);
    }
    if (cands.length === 0) {
      for (let i = 0; i < this.graph.nodes.length; i++) {
        const nd = this.graph.nodes[i];
        if (Math.hypot(nd.x - this.lastSeen.x, nd.z - this.lastSeen.z) > 45) cands.push(i);
      }
    }
    if (cands.length === 0) return;
    const nd = this.graph.nodes[cands[Math.floor(pickHash(this.heat * 7 + this.cops.length) * cands.length)]];
    const veh = ctx.spawnCar('politie', nd.x, nd.z, Math.atan2(this.lastSeen.x - nd.x, this.lastSeen.z - nd.z));
    this.cops.push({
      veh,
      follower: null,
      repath: 0,
      noSeenT: 0,
      stopT: 0,
      leaving: false,
      lastX: this.lastSeen.x,
      lastZ: this.lastSeen.z,
    });
    ctx.say(
      this.heat >= 3
        ? `Poliția a pornit în forță! Nivel de Șpagă: ${this.heat} ${'💰'.repeat(this.heat)}`
        : 'Poliția a fost anunțată. Fii atent la oglinzi…',
      this.heat >= 3 ? 3000 : 2400,
    );
    void p;
  }

  private removeCop(ctx: PoliceCtx, cop: CopUnit): void {
    ctx.removeCar(cop.veh);
    const i = this.cops.indexOf(cop);
    if (i >= 0) this.cops.splice(i, 1);
  }

  private updateCop(cop: CopUnit, ctx: PoliceCtx, dt: number): void {
    const veh = cop.veh;
    const p = ctx.player();
    const dist = Math.hypot(veh.x - p.x, veh.z - p.z);

    // ți-ai băgat mâna-n buzunar și ai furat chiar mașina poliției? :))
    if (ctx.playerVehicle() === veh) {
      ctx.say('Ai furat mașina Poliției! Polițistul a rămas pe jos, fluieră și face semne disperate. 💨');
      this.heat = Math.max(this.heat, 2);
      this.removeCop(ctx, cop);
      return;
    }

    // prindere
    if (!cop.leaving && this.heat > 0 && dist < 3.6 && this.caughtCd <= 0) {
      const amenda = fineAmount(this.heat);
      this.heat = 0;
      ctx.fine(amenda);
      this.caughtCd = 9;
      cop.stopT = 3.2;
      cop.leaving = true;
      ctx.say(`Te-a prins! Amendă: ${amenda} LEI. „Data viitoare fugi mai frumos!"`, 3400);
      return;
    }

    // păzește mașina oprită (stopT) — apoi pleacă
    if (cop.stopT > 0) {
      cop.stopT -= dt;
      veh.speed = 0;
      veh.update(dt, { throttle: 0, brake: false, handbrake: true, steer: 0 });
      if (cop.stopT <= 0) {
        this.heat = 0;
        ctx.say('Poliția a plecat. „Ne mai vedem la șpagă zero…" 🚓', 2400);
        this.removeCop(ctx, cop);
      }
      return;
    }

    // vede jucătorul?
    if (dist < SIGHT && this.heat > 0 && !cop.leaving) {
      cop.noSeenT = 0;
      cop.lastX = p.x;
      cop.lastZ = p.z;
      cop.repath = 0; // urmărește în timp real
    } else {
      cop.noSeenT += dt;
    }

    // a pierdut urma: scade Șpagă, apoi pleacă acasă
    if (cop.noSeenT > 4 && !cop.leaving) {
      this.heat = decayHeat(this.heat);
      cop.noSeenT = 0;
      if (this.heat <= 0) {
        cop.leaving = true;
        cop.stopT = 1.6;
        ctx.say('Poliția a pierdut urma. „De data asta ai scăpat, Parfum…"', 2800);
        return;
      }
    }

    // drumul spre țintă (ultima poziție văzută / jucătorul)
    const targetX = dist < SIGHT && this.heat > 0 ? p.x : cop.lastX;
    const targetZ = dist < SIGHT && this.heat > 0 ? p.z : cop.lastZ;
    cop.repath -= dt;
    if (!cop.follower || cop.follower.done() || cop.repath <= 0) {
      const path = findPath(this.graph, veh.x, veh.z, targetX, targetZ);
      cop.follower = path ? new PathFollower(path, 5) : null;
      cop.repath = 1.4;
    }
    const wp = cop.follower?.current() ?? null;

    if (wp) {
      const dx = wp.x - veh.x;
      const dz = wp.z - veh.z;
      const dWp = Math.hypot(dx, dz);
      if (dWp < 4) {
        cop.follower?.advance(veh.x, veh.z);
      }
      const nextWp = cop.follower?.current();
      if (nextWp) {
        const desired = Math.atan2(nextWp.x - veh.x, nextWp.z - veh.z);
        const aDiff = angleDiff(veh.yaw, desired);
        const steer = Math.max(-1, Math.min(1, aDiff * 1.7));
        const sharp = Math.abs(aDiff) > 0.7;
        const cap = veh.def.top * CRUISE_FRAC;
        let throttle = veh.speed < cap ? 0.85 : 0;
        if (sharp) throttle *= 0.45;
        if (dWp < 9 && veh.speed > 4) throttle = 0;
        veh.update(dt, { throttle, brake: false, handbrake: false, steer });
      }
    } else {
      // am ajuns la ultima poziție văzută: mă uit în jur
      veh.update(dt, { throttle: 0, brake: false, handbrake: true, steer: 0 });
    }

    // coliziune cu lumea; dacă m-am împotmolit, recalculăm drumul
    const before = veh.speed;
    ctx.collideVehicle(veh);
    if (before > 1 && veh.speed < 0.4 && !cop.leaving) {
      cop.repath = 0;
      // dăm puțin cu spatele ca să ne deblocăm
      veh.update(dt * 2, { throttle: -0.3, brake: false, handbrake: false, steer: 0 });
      ctx.collideVehicle(veh);
    }
    // limitează lumea
    const L = 470;
    veh.x = Math.max(-L, Math.min(L, veh.x));
    veh.z = Math.max(-L, Math.min(L, veh.z));
    veh.group.position.set(veh.x, 0, veh.z);
  }
}
