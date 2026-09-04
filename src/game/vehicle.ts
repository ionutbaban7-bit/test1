// Vehicule arcade — nu simulator. Parametri in JSON/obiecte, fizica simpla:
// viteza pe directia capului, viraj proportional cu viteza, handbrake = drift.
// Nota: „in fata” = +Z local (masinile au lungimea de-a lungul axei Z).
// (Exceptie acceptata la „<=400 linii”: constructorii de mesh se vor muta in
// module de modele separate cand parcul auto creste.)

import * as THREE from 'three';

export type VehicleKind = 'car' | 'van' | 'suv' | 'moped' | 'scooter' | 'tractor' | 'cart' | 'bike';

export interface VehicleDef {
  id: string;
  name: string;
  accel: number; // m/s^2
  top: number; // m/s (~27 = 97 km/h)
  brake: number;
  grip: number; // 1 = normal, >1 = lipicios, <1 = derapeaza
  len: number;
  wid: number;
  color: number;
  accent: number;
  kind: VehicleKind;
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
  politie: {
    id: 'politie', name: 'Poliția (Dacia de serviciu)', accel: 9.2, top: 31, brake: 24,
    grip: 1.1, len: 4.3, wid: 1.8, color: 0xdfe4ea, accent: 0x2a4a8a, kind: 'car',
  },
  mobra: {
    id: 'mobra', name: 'Mobra 50', accel: 3.4, top: 13.5, brake: 8,
    grip: 1.25, len: 1.9, wid: 0.85, color: 0x3f7ab3, accent: 0x233c54, kind: 'moped',
  },
  scuter: {
    id: 'scuter', name: 'Scuterul de la bloc', accel: 4.0, top: 15.5, brake: 9,
    grip: 1.3, len: 1.9, wid: 0.9, color: 0xcf4040, accent: 0x8a2c2c, kind: 'scooter',
  },
  tractor: {
    id: 'tractor', name: 'Tractorul U-650', accel: 5.2, top: 12.5, brake: 12,
    grip: 0.9, len: 4.2, wid: 2.1, color: 0x25539c, accent: 0x16355f, kind: 'tractor',
  },
  cart: {
    id: 'cart', name: 'Căruța lu\' Nea Ion', accel: 2.6, top: 6.5, brake: 6,
    grip: 1.15, len: 5.6, wid: 2.0, color: 0x9a6b3a, accent: 0x5d3c20, kind: 'cart',
  },
  bicicleta: {
    id: 'bicicleta', name: 'Bicicleta Poliției', accel: 3.2, top: 9.5, brake: 7,
    grip: 1.4, len: 1.5, wid: 0.7, color: 0xd8d8d8, accent: 0x233c54, kind: 'bike',
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
  /** Luminile (faruri/stopuri) — pornite/oprite de bucla jocului (zi/noapte). */
  lightsOn = false;
  private headlights: THREE.SpotLight[] = [];
  private brakeLights: THREE.Mesh[] = [];
  private headBulbs: THREE.Mesh[] = [];
  /** Apeleaza setWorldLights (in main) cand jucatorul intra intr-o masina. */
  static onPlayerLightsChange: ((on: boolean) => void) | null = null;
  /** Unica lumina care „merge” cu masina jucatorului (nu se roteste cu grupul). */
  playerLight: THREE.SpotLight | null = null;

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
    // umbre: toate componentele vehiculului (caroserie, roti, marfa)
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }

  /** Actualizeaza pozitia spotului „playerLight” (care nu apartine grupului). */
  updatePlayerLight(): void {
    const s = this.playerLight;
    if (!s) return;
    s.position.set(this.x, 0.85, this.z);
    s.target.position.set(this.x + Math.sin(this.yaw) * 10, 0, this.z + Math.cos(this.yaw) * 10);
  }

  resetToHome(): void {
    this.x = this.homeX;
    this.z = this.homeZ;
    this.yaw = this.homeYaw;
    this.speed = 0;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.yaw;
  }

  /** Aprinde/stinge farurile (spoturi + becuri + stopuri) — noaptea. */
  setLights(on: boolean): void {
    if (this.lightsOn === on) return;
    this.lightsOn = on;
    for (const s of this.headlights) s.intensity = on ? 1 : 0;
    for (const b of this.headBulbs) {
      (b.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 1 : 0;
    }
    for (const s of this.brakeLights) {
      (s.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 0.5 : 0;
    }
  }

  /** Stopurile „frana” — rosu intens cand franezi (doar daca e noapte). */
  setBraking(braking: boolean): void {
    for (const s of this.brakeLights) {
      (s.material as THREE.MeshStandardMaterial).emissiveIntensity =
        braking && this.lightsOn ? 2.2 : this.lightsOn ? 0.5 : 0;
    }
  }

  private wheel(r: number, w: number, mat: THREE.Material): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(r, r, w, 10);
    geo.rotateZ(Math.PI / 2); // axa devine X (lateral)
    return new THREE.Mesh(geo, mat);
  }

  private buildMesh(): THREE.Group {
    const g = new THREE.Group();
    const d = this.def;
    // vopsea lucioasa metalizata, geamuri inchise lucioase, negru mat
    const bodyMat = new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.3, metalness: 0.55 });
    const accentMat = new THREE.MeshStandardMaterial({ color: d.accent, roughness: 0.42, metalness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.7, metalness: 0.25 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fb6c9, roughness: 0.12, metalness: 0.35 });
    // lumina reala de drum — doar pentru vehiculele „de jucator” (car/van/suv)
    // Nu se roteste cu grupul: ramane in scena si o urmareste main-ul.
    if (d.kind === 'car' || d.kind === 'van' || d.kind === 'suv') {
      this.playerLight = new THREE.SpotLight(0xfff0c8, 0, 75, 0.4, 0.55, 1.5);
    }

    switch (d.kind) {
      case 'moped':
      case 'scooter':
        this.buildMoped(g, d, bodyMat, accentMat, dark);
        break;
      case 'tractor':
        this.buildTractor(g, bodyMat, accentMat, dark, glass);
        break;
      case 'cart':
        this.buildCart(g, bodyMat, accentMat, dark);
        break;
      case 'bike':
        this.buildBike(g, dark, accentMat);
        break;
      default:
        this.buildCar(g, d, bodyMat, accentMat, dark, glass);
    }
    // farurile stang/drept din buildCar — grupul; aici adaug spoturile (sus)
    if (this.headlights.length >= 2) {
      const L = d.len;
      for (const s of this.headlights) {
        s.position.set(s.position.x, 0.62, s.position.z);
        s.target.position.set(s.position.x, 0, L / 2 + 12);
        s.target.updateMatrixWorld();
        g.add(s.target);
      }
    }
    return g;
  }

  /** Masina / dubita / SUV — „in fata" = +Z. */
  private buildCar(
    g: THREE.Group,
    d: VehicleDef,
    bodyMat: THREE.Material,
    accentMat: THREE.Material,
    dark: THREE.Material,
    glass: THREE.Material,
  ): void {
    const L = d.len;
    const W = d.wid;
    const h = d.kind === 'van' ? 2.0 : d.kind === 'suv' ? 1.7 : 1.35;
    const baseY = 0.32;

    const body = new THREE.Mesh(new THREE.BoxGeometry(W, 0.5, L), bodyMat);
    body.position.y = baseY + 0.35;
    g.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.92, Math.max(0.3, h - 0.9), L * 0.52),
      d.kind === 'van' ? accentMat : glass,
    );
    cabin.position.set(0, baseY + 1.0, d.kind === 'van' ? -0.02 * L : -0.06 * L);
    g.add(cabin);
    const band = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.18, L), accentMat);
    band.position.y = baseY + 0.6;
    g.add(band);
    // faruri (+Z) si stopuri (-Z), cu materiale care se aprind noaptea
    const lightPositions = [1, -1] as const;
    for (const side of lightPositions) {
      const sx = side * (W / 2 - 0.22);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0x10141c,
        emissive: new THREE.Color(0xfff3c8),
        emissiveIntensity: 0,
      });
      const fl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), bulbMat);
      fl.position.set(sx, baseY + 0.55, L / 2 - 0.03);
      g.add(fl);
      this.headBulbs.push(fl);
      // stopurile — rosu, cu material emisiv
      const brakeMat = new THREE.MeshStandardMaterial({
        color: 0x5a0e0e,
        emissive: new THREE.Color(0xff3a25),
        emissiveIntensity: 0,
      });
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), brakeMat);
      tl.position.set(sx, baseY + 0.55, -L / 2 + 0.03);
      g.add(tl);
      this.brakeLights.push(tl);
    }
    // spoturile de drum — doar pentru vehicule care au „faruri adevarate”
    if (d.kind === 'car' || d.kind === 'van' || d.kind === 'suv' || d.kind === 'tractor') {
      for (const side of lightPositions) {
        const sx = side * (W / 2 - 0.6);
        const s = new THREE.SpotLight(0xfff0c8, 0, 90, 0.34, 0.5, 1.4);
        s.position.set(sx, baseY + 0.6, L / 2);
        g.add(s);
        this.headlights.push(s);
      }
    }
    for (const [wz, wx] of [
      [L * 0.31, W / 2 - 0.14],
      [L * 0.31, -(W / 2 - 0.14)],
      [-L * 0.29, W / 2 - 0.14],
      [-L * 0.29, -(W / 2 - 0.14)],
    ] as const) {
      const w = this.wheel(0.32, 0.26, dark);
      w.position.set(wx, 0.32, wz);
      g.add(w);
    }
    if (d.kind === 'van') {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, L * 0.3), accentMat);
      stripe.position.set(W / 2 + 0.02, baseY + 1.35, L * 0.15);
      g.add(stripe);
    }
  }

  private buildMoped(
    g: THREE.Group,
    d: VehicleDef,
    bodyMat: THREE.Material,
    accentMat: THREE.Material,
    dark: THREE.Material,
  ): void {
    const isScooter = d.kind === 'scooter';
    const wheelR = isScooter ? 0.26 : 0.3;
    for (const wz of [0.68, -0.68]) {
      const w = this.wheel(wheelR, 0.12, dark);
      w.position.set(0, wheelR, wz);
      g.add(w);
    }
    // podeaua / carenajul
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(d.wid * 0.9, 0.34, isScooter ? 1.5 : 1.0),
      bodyMat,
    );
    deck.position.set(0, 0.62, isScooter ? 0.05 : -0.08);
    g.add(deck);
    // scut frontal (la scuter) / ghidon inalt (la mobra)
    const front = new THREE.Mesh(
      new THREE.BoxGeometry(d.wid * 0.8, isScooter ? 0.62 : 0.3, 0.14),
      accentMat,
    );
    front.position.set(0, isScooter ? 0.9 : 0.75, 0.55);
    g.add(front);
    // ghidon
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 6), dark);
    stem.position.set(0, 1.05, 0.58);
    g.add(stem);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(d.wid * 0.8, 0.05, 0.05), accentMat);
    bar.position.set(0, 1.32, 0.58);
    g.add(bar);
    // sa
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.5), dark);
    seat.position.set(0, 0.92, -0.28);
    g.add(seat);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.08), accentMat);
    lamp.position.set(0, 0.7, 1.02);
    g.add(lamp);
  }

  private buildTractor(
    g: THREE.Group,
    bodyMat: THREE.Material,
    accentMat: THREE.Material,
    dark: THREE.Material,
    glass: THREE.Material,
  ): void {
    // rotile: mari in spate, mici in fata
    for (const side of [1, -1]) {
      const rear = this.wheel(0.62, 0.4, dark);
      rear.position.set(side * 1.0, 0.62, -0.85);
      g.add(rear);
      const front = this.wheel(0.38, 0.24, dark);
      front.position.set(side * 0.72, 0.38, 1.1);
      g.add(front);
      // aripa peste roata spate
      const mud = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 1.5), bodyMat);
      mud.position.set(side * 1.0, 1.28, -0.85);
      g.add(mud);
    }
    // sasiu
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 2.4), bodyMat);
    chassis.position.y = 1.0;
    g.add(chassis);
    // capota motor
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 1.1), bodyMat);
    hood.position.set(0, 1.3, 1.0);
    g.add(hood);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.1), dark);
    grille.position.set(0, 1.15, 1.56);
    g.add(grille);
    // cabina (sticla + acoperis)
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.1), glass);
    cab.position.set(0, 2.05, -0.45);
    g.add(cab);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.1, 1.2), accentMat);
    roof.position.set(0, 2.62, -0.45);
    g.add(roof);
    // esapament
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.3, 6), dark);
    pipe.position.set(0.55, 1.8, 0.5);
    g.add(pipe);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), dark);
    seat.position.set(0, 1.5, -0.5);
    g.add(seat);
  }

  private buildCart(
    g: THREE.Group,
    bodyMat: THREE.Material,
    accentMat: THREE.Material,
    dark: THREE.Material,
  ): void {
    // platforma + roti (in spate) + cai in fata (+Z)
    for (const side of [1, -1]) {
      const w = this.wheel(0.55, 0.14, dark);
      w.position.set(side * 0.78, 0.55, -0.7);
      g.add(w);
    }
    const platform = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.28, 2.5), bodyMat);
    platform.position.set(0, 1.18, -0.8);
    g.add(platform);
    for (const side of [1, -1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 2.3), accentMat);
      rail.position.set(side * 0.86, 1.45, -0.8);
      g.add(rail);
    }
    // fan incarcat (decor)
    const hay1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.4), new THREE.MeshStandardMaterial({ color: 0xd9b73f, roughness: 0.95 }));
    hay1.position.set(0, 1.85, -0.8);
    g.add(hay1);
    const hay2 = hay1.clone();
    hay2.scale.setScalar(0.85);
    hay2.position.set(0, 2.35, -0.85);
    g.add(hay2);
    // ojele
    for (const side of [0.38, -0.38]) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 2.6, 6), bodyMat);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.set(side, 1.25, 1.6);
      g.add(shaft);
    }
    // calul (prietenul omului)
    const horseMat = new THREE.MeshStandardMaterial({ color: 0x8a6242, roughness: 0.9 });
    const manesMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.95 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 1.7), horseMat);
    body.position.set(0, 1.65, 3.15);
    g.add(body);
    for (const hx of [0.3, -0.3]) {
      for (const hz of [3.62, 2.68]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), horseMat);
        leg.position.set(hx, 0.5, hz);
        g.add(leg);
      }
    }
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.55), horseMat);
    neck.position.set(0, 2.5, 3.9);
    neck.rotation.x = 0.45;
    g.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.9), horseMat);
    head.position.set(0, 3.0, 4.2);
    g.add(head);
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 1.3), manesMat);
    mane.position.set(0, 2.95, 3.75);
    g.add(mane);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.4, 6), manesMat);
    tail.position.set(0, 1.7, 2.2);
    g.add(tail);
  }

  private buildBike(g: THREE.Group, dark: THREE.Material, accentMat: THREE.Material): void {
    for (const wz of [0.62, -0.62]) {
      const w = this.wheel(0.36, 0.08, dark);
      w.position.set(0, 0.36, wz);
      g.add(w);
    }
    const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.3, 6), accentMat);
    frame.rotation.x = Math.PI / 2;
    frame.position.set(0, 0.95, 0);
    g.add(frame);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), accentMat);
    fork.position.set(0, 0.75, 0.6);
    g.add(fork);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.16), dark);
    seat.position.set(0, 1.28, -0.12);
    g.add(seat);
    const seatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), dark);
    seatPost.position.set(0, 1.05, -0.12);
    g.add(seatPost);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), accentMat);
    bar.position.set(0, 1.3, 0.55);
    g.add(bar);
  }

  halfLen(): number {
    return this.def.len / 2;
  }
  halfWid(): number {
    return this.def.wid / 2;
  }
  obstacleRect(): { x: number; y: number; w: number; h: number } {
    // AABB al vehiculului rotit (corect pentru orice yaw)
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
    // farul luminos al jucatorului urmareste masina (in scena, nu in grup)
    if (this.playerLight) {
      this.playerLight.position.set(this.x, 0.85, this.z);
      this.playerLight.target.position.set(
        this.x + Math.sin(this.yaw) * 12,
        0,
        this.z + Math.cos(this.yaw) * 12,
      );
      const braking =
        c.brake ||
        (c.throttle !== 0 &&
          Math.sign(c.throttle) !== Math.sign(this.speed) &&
          this.speed !== 0);
      this.setBraking(braking);
    }
  }

  /** Ciocnirea tare te incetineste + zgomot (apelat din coliziuni). */
  onCrash(hitSpeed: number): boolean {
    if (hitSpeed > 7 && this.honkCooldown <= 0) {
      this.honkCooldown = 1.2;
      return true;
    }
    return false;
  }
}
