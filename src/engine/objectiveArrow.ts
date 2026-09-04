// FRONTEND AGENT — livrabil A2: „Render indicator de obiectiv”.
// Săgeata 2D (DOM) care arată spre marcajul misiunii active, proiectat din 3D în 2D.
// Retro style: umbră tare, galben HUD; ascunsă când ținta e aproape sau inexistentă.

import * as THREE from 'three';

export class ObjectiveArrow {
  private el: HTMLDivElement;
  private distEl: HTMLDivElement;
  private v = new THREE.Vector3();
  private visible = false;

  constructor() {
    this.el = document.createElement('div');
    this.el.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;z-index:12;pointer-events:none;display:none;';
    const arrow = document.createElement('div');
    arrow.textContent = '▲';
    arrow.style.cssText =
      'position:absolute;left:-10px;top:-18px;font-size:22px;line-height:1;color:#ffe066;' +
      'text-shadow:2px 2px 0 #000,-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000;';
    this.el.appendChild(arrow);
    this.distEl = document.createElement('div');
    this.distEl.style.cssText =
      'position:absolute;left:-50px;top:6px;width:100px;text-align:center;' +
      'color:#fff;font-family:monospace;font-size:12px;text-shadow:2px 2px 0 #000;';
    this.el.appendChild(this.distEl);
    document.body.appendChild(this.el);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.el.style.display = 'none';
  }

  /**
   * Desenează săgeata către (tx, tz) pe un inel imaginar în jurul centrului
   * ecranului; ascunde când ținta e aproape de centru (marcajul se vede pe jos).
   */
  update(cam: THREE.Camera, tx: number, tz: number, dist: number | null): void {
    if (dist !== null && dist < 8) {
      this.hide();
      return;
    }
    this.v.set(tx, 1.8, tz).project(cam);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    const behind = this.v.z > 1;
    let nx = this.v.x;
    let ny = this.v.y;
    if (behind) {
      // ținta e în spatele camerei: oglindim prin centru (aproximare ok la arcade)
      nx = -nx;
      ny = -ny;
    }
    const sx = (nx * 0.5 + 0.5) * w;
    const sy = (-ny * 0.5 + 0.5) * h;
    const dx = sx - cx;
    const dy = sy - cy;
    const len = Math.hypot(dx, dy);
    const R = Math.min(w, h) * 0.34;
    if (!behind && len < R * 0.62) {
      this.hide();
      return;
    }
    const ang = Math.atan2(dy, dx);
    const px = cx + Math.cos(ang) * R;
    const py = cy + Math.sin(ang) * R;
    this.el.style.display = 'block';
    this.el.style.transform =
      `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(${((ang * 180) / Math.PI + 90).toFixed(1)}deg)`;
    if (dist !== null) this.distEl.textContent = `${Math.round(dist)} m`;
    this.visible = true;
  }
}
