// Kit vizual „look & feel”: materiale PBR (MeshStandardMaterial) cu finisaje,
// texturi procedurale (canvas — fara asset-uri externe) si umbre.
// Toate lumile si entitatile folosesc acest kit, ca aspectul sa fie unitar.

import * as THREE from 'three';

export interface MatOpts {
  roughness?: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}

/** Material standard mat-mediu: bun pentru beton, tencuiala, pamant, piele. */
export function mat(color: number, o: MatOpts = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: o.roughness ?? 0.92,
    metalness: o.metalness ?? 0.02,
  });
  if (o.emissive !== undefined) {
    m.emissive = new THREE.Color(o.emissive);
    m.emissiveIntensity = o.emissiveIntensity ?? 1;
  }
  if (o.transparent) {
    m.transparent = true;
    m.opacity = o.opacity ?? 0.85;
  }
  return m;
}

// ---------------------------------------------------------------------------
// Texturi procedurale (speckle) generate pe canvas
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

function toRGB(c: THREE.Color): RGB {
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}

function speckleCanvas(base: RGB, spread: number): HTMLCanvasElement {
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
  ctx.fillRect(0, 0, size, size);

  // puncte fine de variatie (fiecare ~3px), ~35% acoperire
  const cell = 3;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      if (Math.random() > 0.35) continue;
      const r = Math.max(0, Math.min(255, base[0] + (Math.random() - 0.5) * spread));
      const g = Math.max(0, Math.min(255, base[1] + (Math.random() - 0.5) * spread));
      const b = Math.max(0, Math.min(255, base[2] + (Math.random() - 0.5) * spread));
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x, y, cell - 1, cell - 1);
    }
  }
  // cateva pete mari, foarte subtile (umezeala/praf/variatii de sol)
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 9; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 18 + Math.random() * 40;
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return cv;
}

function makeTex(cv: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export type GroundKind = 'grass' | 'sand' | 'asphalt';

/**
 * Material de sol texturat. `w`/`h` = dimensiunile suprafetei in unitati de joc;
 * un „tile" acopera ~`tile` unitati (granulatie constanta indiferent de marime).
 */
export function ground(color: number, kind: GroundKind, w: number, h: number, tile = 24): THREE.MeshStandardMaterial {
  const c = new THREE.Color(color);
  const base = toRGB(c);
  const spread = kind === 'asphalt' ? 16 : kind === 'sand' ? 22 : 30;
  const t = makeTex(speckleCanvas(base, spread));
  const rw = Math.max(1, Math.round(w / tile));
  const rh = Math.max(1, Math.round(h / tile));
  t.repeat.set(rw, rh);
  return new THREE.MeshStandardMaterial({
    map: t,
    roughness: kind === 'asphalt' ? 0.98 : 1,
    metalness: 0,
  });
}

/** Material de asfalt pentru o fasie de drum (w x d). */
export function asphalt(w: number, d: number): THREE.MeshStandardMaterial {
  return ground(0x4a4a52, 'asphalt', w, d, 16);
}

/** Material de geam: ziua aproape negru lucios, noaptea se aprinde cald. */
export function windowMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x141824,
    roughness: 0.25,
    metalness: 0.5,
    emissive: new THREE.Color(0xffc860),
    emissiveIntensity: 0,
  });
}

/** Material mic „bec” cald (pentru felinare, globuri, faruri decorative). */
export function glowMat(color = 0xffd27a): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color });
}

// ---------------------------------------------------------------------------
// Texturi de semne „neon” si halouri luminoase (sprite-uri aditive)
// ---------------------------------------------------------------------------

let glowTex: THREE.CanvasTexture | null = null;

/** Textura radiala alba->transparent, partajata de toate halo-urile. */
function getGlowTexture(): THREE.CanvasTexture {
  if (glowTex) return glowTex;
  const size = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.28, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTex = new THREE.CanvasTexture(cv);
  return glowTex;
}

/** Halou luminos aditiv (fara sa coste un PointLight). */
export function glowSprite(color: number, scale = 5): THREE.Sprite {
  const m = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(scale);
  return s;
}

/** Textura de semn: text pe fundal inchis (pentru zi) — noaptea devine neon. */
export function neonMaterial(
  text: string,
  color: string,
  w = 5,
  h = 1.1,
): THREE.MeshStandardMaterial {
  const px = Math.max(128, Math.round(w * 22));
  const py = Math.max(48, Math.round(h * 22));
  const cv = document.createElement('canvas');
  cv.width = px;
  cv.height = py;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, px, py);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(py * 0.52)}px "Segoe UI", Arial, sans-serif`;
  ctx.shadowColor = color;
  ctx.shadowBlur = py * 0.16;
  ctx.fillStyle = color;
  ctx.fillText(text, px / 2, py / 2 + py * 0.04, px * 0.96);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({
    color: 0x1a1c22,
    roughness: 0.45,
    metalness: 0.3,
    map: tex,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: tex,
    emissiveIntensity: 0,
  });
  (m as unknown as { isNeon?: boolean }).isNeon = true;
  return m;
}

/** Porneste umbrele (cast + receive) pe tot subarborele. */
export function enableShadows(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
}

/**
 * Aprinde „ferestrele” (isWindow) si semnele neon (isNeon) dintr-un subarbore,
 * cu o intensitate ce depinde de cat de intuneric e (night 0..1).
 */
export function setWindowsLit(root: THREE.Object3D, night: number): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      const mm = m.material as THREE.MeshStandardMaterial;
      const flag = mm as unknown as { isWindow?: boolean; isNeon?: boolean };
      if (flag.isWindow) {
        mm.emissiveIntensity = night * 0.85;
      } else if (flag.isNeon) {
        // neonul are o usoara prezenta si ziua (0.06), noaptea devine intens
        mm.emissiveIntensity = 0.06 + night * 1.45;
      }
    }
  });
}
