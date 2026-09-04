// Renderer Three.js cu buget retro: rezolutie interna scazuta (senzatia de
// PS2 pe CRT), fara umbre dinamice, fara postprocesare scumpa.

import * as THREE from 'three';

const SKY = 0x9fc8e8; // cer de vara bucurestean, putin spalat de ceata

export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly three: THREE.WebGLRenderer;

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

    this.scene.background = new THREE.Color(SKY);
    this.scene.fog = new THREE.Fog(SKY, 120, 620);

    // Lumina: 1 hemisphere + 1 directional. Atat. Fara shadow maps in v1.
    const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x8a9478, 1.0);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.25);
    sun.position.set(260, 420, 180);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xbcd4ff, 0.35);
    fill.position.set(-300, 200, -250);
    this.scene.add(fill);

    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.three.setSize(w, h);
  }

  render(): void {
    this.three.render(this.scene, this.camera);
  }
}
