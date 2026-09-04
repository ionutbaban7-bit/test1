// Pietoni + luptatori simpli. Fara ragdoll, fara AI complex — doar stari.

import * as THREE from 'three';
import { hash01 } from '../engine/math';

export type PedState = 'wander' | 'flee' | 'thug' | 'dead';

export class Ped {
  readonly mesh: THREE.Group;
  x: number;
  z: number;
  /** Punctul de „acasa” — pietonul nu se rataceste departe de el. */
  readonly originX: number;
  readonly originZ: number;
  yaw = 0;
  state: PedState;
  hp = 100;
  fleeTimer = 0;
  wanderTarget = { x: 0, z: 0 };
  wanderTimer = 0;
  readonly isThug: boolean;
  hitFlash = 0;
  deadTimer = 0;

  private static mat(color: number): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color });
  }

  /** Variante de sat / oras. */
  baba = false;
  scarfColor = 0;
  hat = false;
  hatColor = 0x6b4a2c;
  basket = false;
  hop = 0;

  constructor(
    scene: THREE.Scene,
    x: number,
    z: number,
    isThug: boolean,
    shirt: number,
    opts?: { baba?: boolean; scarfColor?: number; hat?: boolean; hatColor?: number; basket?: boolean },
  ) {
    this.x = x;
    this.z = z;
    this.originX = x;
    this.originZ = z;
    this.isThug = isThug;
    this.baba = !!opts?.baba;
    this.scarfColor = opts?.scarfColor ?? 0;
    this.hat = !!opts?.hat;
    this.hatColor = opts?.hatColor ?? 0x6b4a2c;
    this.basket = !!opts?.basket;
    this.state = isThug ? 'thug' : 'wander';
    this.wanderTarget = { x, z };

    const g = new THREE.Group();
    const skin = Ped.mat(0xd8b090);
    const bodyColor = Ped.mat(shirt);
    const legs = Ped.mat(0x3a4250);

    if (this.baba) {
      // baba cu batic: fusta lunga, tulpan pe cap, sort alb
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 0.78, 8), Ped.mat(0x4a3a4a));
      skirt.position.y = 0.42;
      g.add(skirt);
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.05), Ped.mat(0xe8e4da));
      apron.position.set(0, 0.55, 0.41);
      g.add(apron);
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.4, 0.3), bodyColor);
      torso.position.y = 1.0;
      g.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), skin);
      head.position.y = 1.42;
      g.add(head);
      // baticul (tulpan)
      const kerchief = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.3, 8), Ped.mat(opts?.scarfColor ?? 0xc8402c));
      kerchief.position.y = 1.6;
      g.add(kerchief);
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.08), Ped.mat(opts?.scarfColor ?? 0xc8402c));
      knot.position.set(0, 1.36, 0.14);
      g.add(knot);
      // picioarele (sub fusta, abia se vad)
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.16), legs);
      legL.position.set(-0.12, 0.25, 0);
      g.add(legL);
      const legR = legL.clone();
      legR.position.x = 0.12;
      g.add(legR);
      this.hop = 1.5; // inaltime folosita la lovituri/animatii
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, isThug ? 1.15 : 0.95, 0.34), bodyColor);
      body.position.y = isThug ? 1.05 : 0.92;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), skin);
      head.position.y = isThug ? 1.85 : 1.68;
      g.add(head);
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.18), legs);
      legL.position.set(-0.14, 0.35, 0);
      g.add(legL);
      const legR = legL.clone();
      legR.position.x = 0.14;
      g.add(legR);
      if (this.hat) {
        // palarie de om la tara / cozoroc (culoare din optiune)
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 10), Ped.mat(this.hatColor));
        brim.position.y = 1.82;
        g.add(brim);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.22, 8), Ped.mat(this.hatColor));
        top.position.y = 1.95;
        g.add(top);
      }
      if (isThug) {
        // bandana + bastonul de mici (arma)
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 8), Ped.mat(0xa82c22));
        band.position.y = 1.92;
        g.add(band);
        const club = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.1, 6), Ped.mat(0x6b4a2c));
        club.position.set(0.5, 1.1, 0);
        g.add(club);
      }
      this.hop = isThug ? 1.95 : 1.75;
    }
    // plasa/desaga pe langa corp (borcane, cumparaturi)
    if (this.basket) {
      const net = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.3), Ped.mat(0xc9a05a));
      net.position.set(0.38, this.baba ? 0.95 : 1.0, 0.12);
      g.add(net);
      // borcane care se vad putin
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 8), Ped.mat(0x7fbf6a));
      jar.position.set(0.38, this.baba ? 1.05 : 1.1, 0.12);
      g.add(jar);
    }
    this.mesh = g;
    this.mesh.position.set(x, 0, z);
    scene.add(g);
  }

  setPos(x: number, z: number): void {
    this.x = x;
    this.z = z;
    this.mesh.position.set(x, 0, z);
  }

  sync(): void {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.yaw;
  }

  hit(dmg: number): boolean {
    if (this.state === 'dead') return false;
    this.hp -= dmg;
    this.hitFlash = 0.15;
    if (this.hp <= 0) {
      this.state = 'dead';
      this.deadTimer = 0.8;
      this.mesh.rotation.x = Math.PI / 2;
      this.mesh.position.y = 0.2;
      return true;
    }
    // flash rosu pe materiale (doar pe ale acestui ped)
    this.mesh.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        (o.material as THREE.MeshLambertMaterial).emissive?.setHex(0x661111);
      }
    });
    return false;
  }

  setThugTarget(tx: number, tz: number): void {
    this.wanderTarget = { x: tx, z: tz };
  }
}

export interface PedSpawn {
  x: number;
  z: number;
  isThug: boolean;
  shirt: number;
}

export function updatePeds(
  peds: Ped[],
  playerX: number,
  playerZ: number,
  playerSpeed: number,
  dt: number,
  time: number,
): void {
  for (const p of peds) {
    if (p.state === 'dead') {
      p.deadTimer -= dt;
      if (p.deadTimer <= 0) p.mesh.visible = false;
      continue;
    }
    if (p.hitFlash > 0) {
      p.hitFlash -= dt;
      if (p.hitFlash <= 0) {
        p.mesh.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            (o.material as THREE.MeshLambertMaterial).emissive?.setHex(0x000000);
          }
        });
      }
    }

    const distP = Math.hypot(p.x - playerX, p.z - playerZ);
    const speed = p.isThug ? 2.6 : p.baba ? 1.05 : 1.7;

    if (p.state === 'thug') {
      // se apropie de jucator; daca e departe, pazeste tarabele (sta pe loc)
      const tx = playerX;
      const tz = playerZ;
      const d = Math.hypot(tx - p.x, tz - p.z);
      if (d > 55) {
        p.yaw = Math.atan2(tx - p.x, tz - p.z);
      } else if (d > 1.4) {
        p.x += ((tx - p.x) / d) * speed * dt;
        p.z += ((tz - p.z) / d) * speed * dt;
        p.yaw = Math.atan2(tx - p.x, tz - p.z);
      }
      p.sync();
      continue;
    }

    if (p.state === 'flee') {
      p.fleeTimer -= dt;
      const dx = p.x - playerX;
      const dz = p.z - playerZ;
      const d = Math.hypot(dx, dz) || 1;
      p.x += (dx / d) * speed * 1.6 * dt;
      p.z += (dz / d) * speed * 1.6 * dt;
      p.yaw = Math.atan2(dx, dz);
      p.sync();
      if (p.fleeTimer <= 0 && d > 12) p.state = 'wander';
      continue;
    }

    // wander: merge spre o tinta aleatoare in jurul punctului de origine
    p.wanderTimer -= dt;
    if (p.wanderTimer <= 0 || Math.hypot(p.wanderTarget.x - p.x, p.wanderTarget.z - p.z) < 0.6) {
      const ang = Math.sin(time * 1.3 + p.originX) * Math.PI * 2;
      p.wanderTarget = {
        x: p.originX + Math.cos(ang) * 7,
        z: p.originZ + Math.sin(ang) * 7,
      };
      p.wanderTimer = 2.5 + hash01(p.originX * 7 + p.originZ * 3) * 2;
    }
    const dx = p.wanderTarget.x - p.x;
    const dz = p.wanderTarget.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.5) {
      p.x += (dx / d) * speed * dt;
      p.z += (dz / d) * speed * dt;
      p.yaw = Math.atan2(dx, dz);
    }

    if (distP < 5 && playerSpeed > 5) {
      p.state = 'flee';
      p.fleeTimer = 3;
    }
    p.x = Math.max(-430, Math.min(430, p.x));
    p.z = Math.max(-430, Math.min(430, p.z));
    p.sync();
  }
}

export function nearestPed(peds: Ped[], x: number, z: number, maxD: number): Ped | null {
  let best: Ped | null = null;
  let bd = maxD * maxD;
  for (const p of peds) {
    if (p.state === 'dead') continue;
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}
