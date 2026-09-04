// HUD in DOM (nu canvas): viteza, bani, obiective, mesaje, bare de viata.
// Stil: font retro cu umbra tare, colturi aspre — ca la 2004, dar curat.

export class Hud {
  private root: HTMLDivElement;
  private speedEl!: HTMLDivElement;
  private moneyEl!: HTMLDivElement;
  private missionEl!: HTMLDivElement;
  private objEl!: HTMLDivElement;
  private hpFill!: HTMLDivElement;
  private bannerEl!: HTMLDivElement;
  private hintEl!: HTMLDivElement;
  private crossEl!: HTMLDivElement;
  private hitEl!: HTMLDivElement;
  private vignetteEl!: HTMLDivElement;
  private clockEl!: HTMLDivElement;
  private heatEl!: HTMLDivElement;
  private raceEl!: HTMLDivElement;
  private bannerTimer = 0;

  constructor() {
    this.root = document.createElement('div');
    this.root.style.cssText =
      'position:fixed;inset:0;pointer-events:none;font-family:monospace;z-index:10;';
    document.body.appendChild(this.root);
    this.build();
  }

  private css(el: HTMLElement, s: string): void {
    el.style.cssText = s;
  }

  private build(): void {
    const base =
      'position:absolute;color:#fff;text-shadow:2px 2px 0 #000;letter-spacing:1px;';

    // colt stanga-sus: pachet de informatii
    this.moneyEl = document.createElement('div');
    this.css(this.moneyEl, base + 'top:14px;left:16px;font-size:15px;');
    this.moneyEl.textContent = 'LEI 0';
    this.root.appendChild(this.moneyEl);

    this.missionEl = document.createElement('div');
    this.css(this.missionEl, base + 'top:34px;left:16px;font-size:13px;color:#ffd75e;');
    this.root.appendChild(this.missionEl);

    this.objEl = document.createElement('div');
    this.css(this.objEl, base + 'top:54px;left:16px;font-size:12px;color:#cfd8ff;max-width:420px;');
    this.root.appendChild(this.objEl);

    // viata jucatorului (doar pe jos apare relevant; o tinem mereu vizibila)
    const hpBox = document.createElement('div');
    this.css(hpBox, base + 'bottom:26px;left:16px;font-size:12px;');
    hpBox.textContent = 'VIATA';
    const hpOut = document.createElement('div');
    this.css(hpOut, 'position:absolute;top:40px;left:16px;width:160px;height:14px;background:#222;border:2px solid #000;');
    this.hpFill = document.createElement('div');
    this.css(this.hpFill, 'height:100%;width:100%;background:#3fae4a;');
    hpOut.appendChild(this.hpFill);
    this.root.appendChild(hpBox);
    this.root.appendChild(hpOut);

    // viteza, colt dreapta-jos
    this.speedEl = document.createElement('div');
    this.css(
      this.speedEl,
      base + 'bottom:24px;right:22px;font-size:30px;text-align:right;',
    );
    this.speedEl.textContent = '0 km/h';
    this.root.appendChild(this.speedEl);

    // ceasul (zi/noapte), dreapta-sus
    this.clockEl = document.createElement('div');
    this.css(this.clockEl, base + 'top:14px;right:16px;font-size:14px;text-align:right;color:#ffe6a0;');
    this.clockEl.textContent = '12:00';
    this.root.appendChild(this.clockEl);

    // nivelul de șpagă (heat), sub obiectiv
    this.heatEl = document.createElement('div');
    this.css(this.heatEl, base + 'top:76px;left:16px;font-size:14px;color:#ffd75e;display:none;');
    this.root.appendChild(this.heatEl);

    // poziția în cursă (jos, deasupra vitezei)
    this.raceEl = document.createElement('div');
    this.css(this.raceEl, base + 'bottom:64px;right:22px;font-size:18px;text-align:right;color:#ffe066;display:none;');
    this.root.appendChild(this.raceEl);

    // banner central (obiective / mesaje)
    this.bannerEl = document.createElement('div');
    this.css(
      this.bannerEl,
      base +
        'top:16%;left:50%;transform:translateX(-50%);font-size:26px;' +
        'color:#ffe066;text-align:center;opacity:0;transition:opacity .3s;white-space:pre-line;',
    );
    this.root.appendChild(this.bannerEl);

    // hint jos-centru
    this.hintEl = document.createElement('div');
    this.css(
      this.hintEl,
      base + 'bottom:70px;left:50%;transform:translateX(-50%);font-size:13px;' +
        'color:#e8f0ff;background:rgba(0,0,0,.35);padding:6px 12px;display:none;',
    );
    this.root.appendChild(this.hintEl);

    // ochi de arma (pe jos)
    this.crossEl = document.createElement('div');
    this.css(this.crossEl, base + 'top:50%;left:50%;width:14px;height:14px;' +
      'margin:-9px 0 0 -9px;display:none;');
    this.crossEl.innerHTML =
      '<span style="position:absolute;left:6px;top:0;width:2px;height:14px;background:#ffe066"></span>' +
      '<span style="position:absolute;top:6px;left:0;width:14px;height:2px;background:#ffe066"></span>';
    this.root.appendChild(this.crossEl);

    // hitmarker
    this.hitEl = document.createElement('div');
    this.css(this.hitEl, base + 'top:50%;left:50%;width:20px;height:20px;' +
      'margin:-10px 0 0 -10px;display:none;color:#ff5544;font-size:16px;');
    this.hitEl.textContent = '✕';
    this.root.appendChild(this.hitEl);

    // vignette rosie la daune
    this.vignetteEl = document.createElement('div');
    this.css(
      this.vignetteEl,
      'position:fixed;inset:0;box-shadow:inset 0 0 160px rgba(180,0,0,.75);opacity:0;transition:opacity .2s;',
    );
    this.root.appendChild(this.vignetteEl);
  }

  setMoney(v: number): void {
    this.moneyEl.textContent = `LEI ${Math.floor(v)}`;
  }
  setMission(text: string | null): void {
    this.missionEl.textContent = text ?? '';
  }
  setObjective(text: string | null): void {
    this.objEl.textContent = text ?? '';
  }
  setHp(ratio: number): void {
    this.hpFill.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
    this.hpFill.style.background =
      ratio > 0.5 ? '#3fae4a' : ratio > 0.25 ? '#e8c43a' : '#d43c2f';
  }
  setSpeed(kmh: number): void {
    this.speedEl.textContent = `${Math.abs(Math.round(kmh))} km/h`;
  }
  setClock(h: number, m: number): void {
    this.clockEl.textContent = `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor(m)).padStart(2, '0')}`;
  }
  setHeat(level: number): void {
    this.heatEl.style.display = level > 0 ? 'block' : 'none';
    if (level > 0) this.heatEl.textContent = `ȘPAGĂ ${'💰'.repeat(Math.min(5, level))}`;
  }
  /** Poziția live în cursă („LOC 2/4”) sau ascuns dacă nu e cursă. */
  setRacePos(place: number | null): void {
    this.raceEl.style.display = place ? 'block' : 'none';
    if (place) this.raceEl.textContent = `🏁 LOC ${place}/4`;
  }

  banner(text: string, ms = 4200): void {
    this.bannerEl.textContent = text;
    this.bannerEl.style.opacity = '1';
    this.bannerTimer = ms / 1000;
  }
  hint(text: string | null): void {
    this.hintEl.style.display = text ? 'block' : 'none';
    if (text) this.hintEl.textContent = text;
  }
  crosshair(on: boolean): void {
    this.crossEl.style.display = on ? 'block' : 'none';
  }
  hitmark(): void {
    this.hitEl.style.display = 'block';
    setTimeout(() => (this.hitEl.style.display = 'none'), 90);
  }
  damageFlash(): void {
    this.vignetteEl.style.opacity = '1';
    setTimeout(() => (this.vignetteEl.style.opacity = '0'), 220);
  }

  tick(dt: number): void {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerEl.style.opacity = '0';
    }
  }
}
