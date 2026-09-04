// Vehicule arcade — nu simulator. Parametri in JSON/obiecte, fizica simpla:
// viteza pe directia capului, viraj proportional cu viteza, handbrake = drift.

import * as THREE from 'three';

export interface VehicleDef {
  id: string;
  name: string;
  accel: number; // m/s^2
  top: number; // m/s (~26 = 94 km/h)
  brake: number;
  grip: number; // 1 = normal, >1 = lipicios, <1 = derapeaza
  len: number;
  wid: number;
  color: number;
  accent: number;
  kind: 'car' | 'van' | 'suv';
}

export const CAR_DEFS: Record<string, VehicleDef> = {
  dacia: {
    id: 'dacia', name: 'Bătrâna (1310)', accel: 7.5, top: 27, brake: 20,
    grip: 1.0, len: 4.1, wid: 1.7, color: 0xd8a13a, accent: 0x8a6420, kind: 'car',
  },
  logan: {
    id: 'logan', name: 'Loganul', accel: 8.5, top: 30, brake: 21,
    grip: 1.05, len: 4.3, wid: 1.75, color: 0x4a6fa5, accent: 0x2c4265, kind: 'car',
  },
  taxi: {
    id: 'taxi', name: 'Taxi Galben', accel: 9, top: 29, brake: 22,
    grip: 1.1, len: 4.4, wid: 1.8, color: 0xe8c81f, accent: 0x0f0f0f, kind: 'car',
  },
  serie3: {
    id: 'serie3', name: 'Șmecheria', accel: 12.5, top: 36, brake: 26,
    grip: 1.2, len: 4.6, wid: 1.85, color: 0x23262c, accent: 0x55606e, kind: 'car',
  },
  duba: {
    id: 'duba', name: 'Duba cu mici', accel: 6, top: 21, brake: 16,
    grip: 0.92, len: 4.8, wid: 2.0, color: 0xe9e6dc, accent: 0xc8402c, kind: 'van',
  },
  aro: {
    id: 'aro', name: 'Ursoaica (ARO)', accel: 8, top: 24, brake: 18,
    grip: 0.95, len: 4.4, wid: 1.9, color: 0x8a9a5a, accent: 0x555e3a, kind: 'suv',
  },
};

export interface CarControls {
  throttle: number; // -1..1 (negativ = marsarier)
  brake: boolean;
  handbrake: boolean;
  steer: number; // -1..1
}

export class Vehicle {
  readonly def: VehicleDef;
  x = 0;
  z = 0;
  yaw = 0;
  speed = 0;
  /** Locul de parcare de origine (pentru reset cu R). */
  readonly homeX: number;
  readonly homeZ: number;
  readonly homeYaw: number;
  group: THREE.Group;
  static = true; // parcata = obstacol; condusa = libera
  honkCooldown = 0;

  constructor(def: VehicleDef, x: number, z: number, yaw: number) {
    this.def = def;
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.homeX = x;
    this.homeZ = z;
    this.homeYaw = yaw;
    this.group = this.buildMesh();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = yaw;
  }

  resetToHome(): void {
    this.x = this.homeX;
    this.z = this.homeZ;
    this.yaw = this.homeYaw;
    this.speed = 0;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.yaw;
  }

  private buildMesh(): THREE.Group {
    const g = new THREE.Group();
    const d = this.def;
    const bodyMat = new THREE.MeshLambertMaterial({ color: d.color });
    const accentMat = new THREE.MeshLambertMaterial({ color: d.accent });
    const dark = new THREE.MeshLambertMaterial({ color: 0x1c1e22 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x9fb6c9 });

    const L = d.len;
    const W = d.wid;
    const h = d.kind === 'van' ? 2.0 : d.kind === 'suv' ? 1.7 : 1.35;
    const wheelR = 0.32;
    const baseY = wheelR;

    // sasiu principal
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, 0.5, W), bodyMat);
    body.position.y = baseY + 0.35;
    g.add(body);
    // habitaclu (cabin)
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(L * 0.52, Math.max(0.3, h - 0.9), W * 0.92),
      d.kind === 'van' ? accentMat : glass,
    );
    cabin.position.set(d.kind === 'van' ? -L * 0.02 : -L * 0.05, baseY + 1.0, 0);
    g.add(cabin);
    // praguri/accent
    const band = new THREE.Mesh(new THREE.BoxGeometry(L, 0.18, W * 0.98), accentMat);
    band.position.y = baseY + 0.6;
    g.add(band);
    // faruri + stopuri
    for (const [fx, fz] of [[L / 2, 1], [L / 2, -1]] as const) {
      const fl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.42), accentMat);
      fl.position.set(fx, baseY + 0.55, fz * (W / 2 - 0.25));
      g.add(fl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.42), dark);
      tl.position.set(-fx, baseY + 0.55, fz * (W / 2 - 0.25));
      g.add(tl);
    }
    // roti
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.26, 10);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = dark;
    for (const [wx, wz] of [
      [L * 0.32, 1],
      [L * 0.32, -1],
      [-L * 0.3, 1],
      [-L * 0.3, -1],
    ] as const) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(wx, baseY, wz * (W / 2 - 0.14));
      g.add(w);
    }
    if (d.kind === 'van') {
      // scris „MICI & FII” pe dubita — o banda rosie
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(L * 0.3, 0.5, 0.06), accentMat);
      stripe.position.set(L * 0.15, baseY + 1.35, W / 2 + 0.02);
      g.add(stripe);
    }
    return g;
  }

  halfLen(): number {
    return this.def.len / 2;
  }
  halfWid(): number {
    return this.def.wid / 2;
  }
  obstacleRect(): { x: number; y: number; w: number; h: number } {
    // AABB al masinii rotite (corect pentru orice yaw)
    const l = this.def.len / 2 + 0.2;
    const w = this.def.wid / 2 + 0.2;
    const c = Math.abs(Math.cos(this.yaw));
    const s = Math.abs(Math.sin(this.yaw));
    const hx = l * c + w * s;
    const hz = l * s + w * c;
    return { x: this.x - hx, y: this.z - hz, w: hx * 2, h: hz * 2 };
  }

  update(dt: number, c: CarControls): void {
    const d = this.def;
    const v = this.speed;
    const absV = Math.abs(v);

    if (c.brake || (c.throttle === 0 && absV < 0.5)) {
      this.speed = 0;
    } else if (c.throttle !== 0) {
      if (Math.sign(this.speed) !== Math.sign(c.throttle) && this.speed !== 0) {
        // frana de motor la schimbarea sensului
        this.speed = this.speed > 0
          ? Math.max(0, this.speed - d.brake * 1.6 * dt)
          : Math.min(0, this.speed + d.brake * 1.6 * dt);
      } else {
        const dir = Math.sign(c.throttle);
        const acc = dir * (d.accel * (1 - Math.min(1, absV / d.top) * 0.55));
        this.speed += acc * dt;
        this.speed = Math.max(-d.top * 0.35, Math.min(d.top, this.speed));
      }
    } else {
      // rulare libera cu frecare
      const drag = (1.2 + absV * 0.35) * dt;
      this.speed = v > 0 ? Math.max(0, v - drag) : Math.min(0, v + drag);
    }

    // viraj
    const gripFactor = c.handbrake ? 0.55 : 1;
    const steerFactor = 2.3 * (0.4 + 0.6 / (1 + absV * 0.045)) * gripFactor;
    const dir = this.speed === 0 ? 0 : Math.sign(this.speed);
    if (c.steer !== 0 && this.speed !== 0) {
      this.yaw += c.steer * steerFactor * dir * dt * (0.7 + d.grip * 0.3);
    } else if (this.speed === 0 && c.throttle !== 0) {
      // intoarce pe loc (ca la om)
      this.yaw += c.steer * 1.4 * dt * Math.sign(c.throttle);
    }
    if (c.handbrake && absV > 2) {
      const dec = 9 * dt;
      this.speed = v > 0 ? Math.max(0, v - dec) : Math.min(0, v + dec);
    }

    this.x += Math.sin(this.yaw) * this.speed * dt;
    this.z += Math.cos(this.yaw) * this.speed * dt;

    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.yaw;
  }

  /** Daune: simplificat, ciocnirea tare doar te incetineste + sunet. */
  onCrash(hitSpeed: number): boolean {
    if (hitSpeed > 7 && this.honkCooldown <= 0) {
      this.honkCooldown = 1.2;
      return true;
    }
    return false;
  }
}
