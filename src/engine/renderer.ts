// Renderer Three.js cu buget retro: rezolutie interna scazuta (senzatia de
// PS2 pe CRT), fara umbre dinamice, fara postprocesare scumpa.
// Include ciclul zi/noapte (cer, ceață, lumini) — doar palete si interpolari.

import * as THREE from 'three';

const DAY = new THREE.Color(0x9fc8e8);
const DAWN = new THREE.Color(0xe8975e);
const NIGHT = new THREE.Color(0x0a1026);
const SUN_DAY = new THREE.Color(0xfff1d6);
const SUN_LOW = new THREE.Color(0x7f9fd8);
const SUN_WARM = new THREE.Color(0xff9a5a);

/** Popasuri orare pentru culoarea cerului: [ora, culoare]. */
const SKY_STOPS: [number, THREE.Color][] = [
  [0.0, NIGHT],
  [4.5, NIGHT],
  [5.4, new THREE.Color(0x2c3056)],
  [6.3, DAWN],
  [7.6, new THREE.Color(0xa9cfe6)],
  [8.6, DAY],
  [16.6, DAY],
  [17.7, new THREE.Color(0xa9cfe6)],
  [18.4, DAWN],
  [19.5, new THREE.Color(0x5d4f78)],
  [20.3, NIGHT],
  [24.0, NIGHT],
];

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly three: THREE.WebGLRenderer;
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private fill: THREE.DirectionalLight;
  private tmp = new THREE.Color();
  private tmp2 = new THREE.Color();

  constructor(container: HTMLElement) {
    this.three = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    // Rezolutie interna ~75% => upscale pixelat, aspect de console retro.
    this.three.setPixelRatio(Math.min(window.devicePixelRatio, 1) * 0.75);
    this.three.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.three.domElement);

    this.camera = new THREE.PerspectiveCamera(
      62,
      container.clientWidth / container.clientHeight,
      0.1,
      1400,
    );
    this.camera.position.set(-150, 8, 8);

    this.scene.background = new THREE.Color(DAY);
    this.scene.fog = new THREE.Fog(DAY, 120, 620);

    // Lumina: 1 hemisphere + soare + fill. Atat. Fara shadow maps in v1.
    this.hemi = new THREE.HemisphereLight(0xcfe4ff, 0x5a6656, 1.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 1.25);
    this.sun.position.set(260, 420, 180);
    this.scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0xbcd4ff, 0.35);
    this.fill.position.set(-300, 200, -250);
    this.scene.add(this.fill);

    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.three.setSize(w, h);
  }

  private skyColorAt(hour: number): THREE.Color {
    for (let i = 0; i < SKY_STOPS.length - 1; i++) {
      const [h0, c0] = SKY_STOPS[i];
      const [h1, c1] = SKY_STOPS[i + 1];
      if (hour >= h0 && hour < h1) {
        const t = h1 === h0 ? 0 : (hour - h0) / (h1 - h0);
        return this.tmp.copy(c0).lerp(c1, t);
      }
    }
    return this.tmp.copy(NIGHT);
  }

  /**
   * Aplica cerul/ceata/luminile pentru ora data (0..24).
   * Returneaza „factorul de zi" 0..1 (0 = noapte, 1 = ziua).
   */
  applyDayNight(hour: number): number {
    const f0 = clamp01((hour - 5.6) / 2.6); // rasarit 5.6 -> 8.2
    const f1 = clamp01((20.2 - hour) / 2.4); // apus 20.2 -> 17.8
    let f = Math.min(f0, f1);
    f = f * f * (3 - 2 * f); // smoothstep

    const sky = this.skyColorAt(hour);
    this.scene.background = sky.clone();
    if (this.scene.fog) {
      (this.scene.fog as THREE.Fog).color.copy(sky);
      (this.scene.fog as THREE.Fog).near = 60 + f * 60;
      (this.scene.fog as THREE.Fog).far = 340 + f * 280;
    }

    // soarele: pozitie + intensitate + culoare (cald la rasarit/apus)
    const elev = 0.08 + f * 1.05;
    const az = ((hour - 6) / 12) * Math.PI;
    const r = 620;
    this.sun.position.set(
      r * Math.cos(elev) * Math.cos(az),
      r * Math.sin(elev),
      r * Math.cos(elev) * Math.sin(az),
    );
    const warm = 1 - f; // cald cand soarele e jos
    this.tmp2.copy(SUN_LOW).lerp(SUN_DAY, f).lerp(SUN_WARM, warm * 0.5);
    this.sun.color.copy(this.tmp2);
    this.sun.intensity = 0.12 + f * 1.35;
    this.hemi.intensity = 0.12 + f * 0.95;
    this.fill.intensity = 0.05 + f * 0.3;
    return f;
  }

  render(): void {
    this.three.render(this.scene, this.camera);
  }
}
