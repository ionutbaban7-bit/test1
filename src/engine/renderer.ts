// Renderer Three.js — „pass cinematografic":
// ACES tone mapping + sRGB, antialiasing, umbre moi (PCF soft, care urmaresc
// camera), cer cu gradient (shader) cu soare/luna, stele noaptea, ceata care
// se coloreaza dupa ora. Ciclul zi/noapte ramane doar palete + interpolari.

import * as THREE from 'three';

const DAY = new THREE.Color(0x9fc8e8);
const DAWN = new THREE.Color(0xe8975e);
const NIGHT = new THREE.Color(0x0a1026);
const SUN_DAY = new THREE.Color(0xfff1d6);
const SUN_LOW = new THREE.Color(0x7f9fd8);
const SUN_WARM = new THREE.Color(0xff9a5a);

const TOP_DAY = new THREE.Color(0x2e6fc8);
const TOP_NIGHT = new THREE.Color(0x03040c);
const TOP_DUSK = new THREE.Color(0x51416e);

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

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = /* glsl */ `
varying vec3 vDir;
uniform vec3 uHorizon;
uniform vec3 uTop;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uMoonDir;
uniform vec3 uMoonColor;
uniform float uDay;     // 0 noapte .. 1 zi
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uTop, pow(h, 0.62));
  // banda calda subtire la orizont cat timp soarele e jos
  float horizon = pow(1.0 - abs(d.y), 8.0);
  col += vec3(1.0, 0.55, 0.25) * horizon * (1.0 - uDay) * 0.10;
  // soarele: disc + halo
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * pow(s, 900.0) * 2.6;
  col += uSunColor * pow(s, 10.0) * (0.05 + 0.30 * uDay);
  // luna
  float m = max(dot(d, normalize(uMoonDir)), 0.0);
  col += uMoonColor * pow(m, 40.0) * (1.0 - uDay) * 1.2;
  col += uMoonColor * pow(m, 6.0) * (1.0 - uDay) * 0.08;
  gl_FragColor = vec4(col, 1.0);
}`;

export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly three: THREE.WebGLRenderer;
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private fill: THREE.DirectionalLight;
  private moonGlow: THREE.DirectionalLight;
  private dome!: THREE.Mesh;
  private stars!: THREE.Points;
  private tmp = new THREE.Color();
  private tmp2 = new THREE.Color();
  private tmp3 = new THREE.Color();
  private sunDir = new THREE.Vector3(0.6, 0.8, 0.2);
  private uni: Record<string, { value: unknown }> = {};

  constructor(container: HTMLElement) {
    this.three = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.three.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.three.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.three.domElement);
    this.three.outputColorSpace = THREE.SRGBColorSpace;
    this.three.toneMapping = THREE.ACESFilmicToneMapping;
    this.three.toneMappingExposure = 1.15;
    this.three.shadowMap.enabled = true;
    this.three.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(
      62,
      container.clientWidth / container.clientHeight,
      0.1,
      4200,
    );
    this.camera.position.set(-150, 8, 8);

    this.scene.fog = new THREE.Fog(DAY, 80, 700);

    // --- lumini: soare (cu umbre) + cer/pamant + fill rece + luna ---
    this.hemi = new THREE.HemisphereLight(0xcfe4ff, 0x5a6656, 0.95);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff1d6, 1.55);
    this.sun.position.set(260, 420, 180);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -170;
    sc.right = 170;
    sc.top = 170;
    sc.bottom = -170;
    sc.near = 20;
    sc.far = 1400;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.00045;
    this.sun.shadow.normalBias = 1.4;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.fill = new THREE.DirectionalLight(0xbcd4ff, 0.42);
    this.fill.position.set(-300, 200, -250);
    this.scene.add(this.fill);

    // lumina lunii (blan-d albastrui, fara umbre — mai ieftin noaptea)
    this.moonGlow = new THREE.DirectionalLight(0x9fb4e8, 0.0);
    this.moonGlow.position.set(-260, 300, -180);
    this.scene.add(this.moonGlow);

    this.buildSky();
    window.addEventListener('resize', () => this.resize());
    this.applyDayNight(9.4); // zi frumoasa ca punct de plecare
  }

  private buildSky(): void {
    const uni = {
      uHorizon: { value: new THREE.Color(DAY) },
      uTop: { value: new THREE.Color(TOP_DAY) },
      uSunDir: { value: new THREE.Vector3(0.6, 0.8, 0.2).normalize() },
      uSunColor: { value: new THREE.Color(0xfff1d6) },
      uMoonDir: { value: new THREE.Vector3(-0.6, -0.8, -0.2).normalize() },
      uMoonColor: { value: new THREE.Color(0xb8c8e8) },
      uDay: { value: 1 },
    };
    this.uni = uni;
    const domeMat = new THREE.ShaderMaterial({
      uniforms: uni,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 18), domeMat);
    this.dome.renderOrder = -2;
    this.dome.frustumCulled = false;
    this.scene.add(this.dome);

    // stele (puncte pe boltă, vizibile doar noaptea)
    const n = 650;
    const pos = new Float32Array(n * 3);
    const rng = (() => {
      let s = 42;
      return () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
      };
    })();
    for (let i = 0; i < n; i++) {
      // directii catre emisfera superioara, distributie aproximativ uniforma
      const u = rng() * 2 - 1;
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(Math.max(0, 1 - u * u));
      pos[i * 3] = r * Math.cos(a) * 1950;
      pos[i * 3 + 1] = Math.abs(u) * 1950;
      pos[i * 3 + 2] = r * Math.sin(a) * 1950;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sm = new THREE.PointsMaterial({
      color: 0xdfe8ff,
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    this.stars = new THREE.Points(g, sm);
    this.stars.renderOrder = -1;
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.three.setSize(w, h);
  }

  private skyColorAt(hour: number, out: THREE.Color): THREE.Color {
    for (let i = 0; i < SKY_STOPS.length - 1; i++) {
      const [h0, c0] = SKY_STOPS[i];
      const [h1, c1] = SKY_STOPS[i + 1];
      if (hour >= h0 && hour < h1) {
        const t = h1 === h0 ? 0 : (hour - h0) / (h1 - h0);
        return out.copy(c0).lerp(c1, t);
      }
    }
    return out.copy(NIGHT);
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
    const night = 1 - f;

    const sky = this.skyColorAt(hour, this.tmp);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(sky);
    fog.near = 70 + f * 70;
    fog.far = 430 + f * 330;

    // --- cerul: orizont (paleta) + zenit (paleta dedicata) ---
    this.uni.uHorizon.value = (this.uni.uHorizon.value as THREE.Color).copy(sky);
    const top = this.tmp2
      .copy(TOP_NIGHT)
      .lerp(TOP_DAY, f);
    // la rasarit/apus zenitul are o tenta violeta
    const duskAmt = Math.max(0, 1 - Math.abs(hour - 18.3) * 1.4) + Math.max(0, 1 - Math.abs(hour - 6.1) * 1.4);
    top.lerp(TOP_DUSK, clamp01(duskAmt * 0.55));
    (this.uni.uTop.value as THREE.Color).copy(top);

    // --- soarele: pozitie pe bolta + culoare (cald la rasarit/apus) ---
    const elev = 0.06 + f * 1.08;
    const az = ((hour - 6) / 12) * Math.PI;
    this.sunDir.set(
      Math.cos(elev) * Math.cos(az),
      Math.sin(elev),
      Math.cos(elev) * Math.sin(az),
    );
    (this.uni.uSunDir.value as THREE.Vector3).copy(this.sunDir);
    const warm = night; // cald cand soarele e jos
    this.tmp3.copy(SUN_LOW).lerp(SUN_DAY, f).lerp(SUN_WARM, warm * 0.5);
    (this.uni.uSunColor.value as THREE.Color).copy(this.tmp3);
    // luna: vizibila pe bolta opusa soarelui, putin mai sus de orizont
    const mEl = 0.32 + f * 0.9;
    const mAz = az + Math.PI;
    (this.uni.uMoonDir.value as THREE.Vector3).set(
      Math.cos(mEl) * Math.cos(mAz),
      Math.sin(mEl),
      Math.cos(mEl) * Math.sin(mAz),
    );
    (this.uni.uMoonColor.value as THREE.Color)
      .copy(SUN_LOW)
      .multiplyScalar(0.9);
    (this.uni.uDay.value as number) = f;

    this.sun.color.copy(this.tmp3);
    this.sun.intensity = 0.05 + f * 1.6;
    this.sun.castShadow = f > 0.08;
    this.hemi.intensity = 0.10 + f * 0.92;
    this.hemi.color.copy(this.tmp2.setHex(0xcfe4ff)).lerp(this.tmp.setHex(0x1c2a4a), night * 0.85);
    this.hemi.groundColor.copy(this.tmp2.setHex(0x5a6656)).lerp(this.tmp.setHex(0x0b0e16), night * 0.9);
    this.fill.intensity = 0.02 + f * 0.4;
    this.fill.color.copy(this.tmp2.setHex(0xbcd4ff)).lerp(this.tmp.setHex(0x22335c), night * 0.85);
    this.moonGlow.intensity = 0.22 * night * night;

    // stele: apar treptat dupa apus
    (this.stars.material as THREE.PointsMaterial).opacity = clamp01((0.4 - f) / 0.4) * 0.9;

    // noaptea putin mai luminoasa pe ecran (nu mai negru total)
    this.three.toneMappingExposure = 1.12 + night * 0.75;
    return f;
  }

  render(): void {
    // umbra „urmareste" camera: soarele ramane sus, dar shadow-map-ul e mereu
    // centrat pe jucator (umbre clare langa el, fara cost global)
    const p = this.camera.position;
    this.sun.position.copy(p).addScaledVector(this.sunDir, 900);
    this.sun.target.position.copy(p);
    this.three.render(this.scene, this.camera);
  }
}
