// HUD in DOM (nu canvas): viteza, bani, obiective, mesaje, bare de viata.
// Stil: panouri „sticla" translucide cu blur, font de sistem clar, accente
// aurii — curat si modern, fara sa schimbe API-ul public.

export class Hud {
  private root: HTMLDivElement;
  private speedEl!: HTMLDivElement;
  private moneyEl!: HTMLDivElement;
  private missionEl!: HTMLDivElement;
  private objEl!: HTMLDivElement;
  private hpFill!: HTMLDivElement;
  private hpTextEl!: HTMLSpanElement;
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
      'position:fixed;inset:0;pointer-events:none;z-index:20;' +
      'font-family:"Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;' +
      'user-select:none;-webkit-user-select:none;';
    document.body.appendChild(this.root);
    this.build();
  }

  private css(el: HTMLElement, s: string): void {
    el.style.cssText = s;
  }

  /** Panou „sticla": translucid, blur, bordura subtila. */
  private panel(base: string): string {
    return (
      'color:#eef2ff;background:rgba(8,11,20,.42);border:1px solid rgba(255,255,255,.14);' +
      'border-radius:12px;padding:7px 12px;backdrop-filter:blur(7px) saturate(1.35);' +
      '-webkit-backdrop-filter:blur(7px) saturate(1.35);' +
      'box-shadow:0 4px 16px rgba(0,0,0,.35);text-shadow:0 1px 2px rgba(0,0,0,.6);' + base
    );
  }

  private build(): void {
    // --- colt stanga-sus: bani (insignă cu nume de joc) ---
    const brand = document.createElement('div');
    this.css(brand, this.panel('top:14px;left:16px;padding:6px 14px;font-weight:700;font-size:13px;letter-spacing:.5px;color:#f4c542;'));
    brand.textContent = 'BUCUREȘTI VICE';
    this.root.appendChild(brand);

    this.moneyEl = document.createElement('div');
    this.css(this.moneyEl, this.panel('top:56px;left:16px;font-size:15px;font-weight:600;'));
    this.moneyEl.textContent = 'LEI 0';
    this.root.appendChild(this.moneyEl);

    this.missionEl = document.createElement('div');
    this.css(
      this.missionEl,
      this.panel('top:98px;left:16px;font-size:13px;font-weight:600;color:#ffd75e;border-left:3px solid #f4c542;border-radius:12px;'),
    );
    this.root.appendChild(this.missionEl);

    this.objEl = document.createElement('div');
    this.css(
      this.objEl,
      this.panel('top:134px;left:16px;font-size:12.5px;line-height:1.45;color:#cfd8ff;max-width:400px;border-radius:12px;'),
    );
    this.root.appendChild(this.objEl);

    // șpagă (heat) sub obiectiv
    this.heatEl = document.createElement('div');
    this.css(
      this.heatEl,
      this.panel('top:16px;right:auto;left:50%;transform:translateX(-50%);font-size:13px;font-weight:700;color:#ff9d8a;border:1px solid rgba(255,90,60,.45);background:rgba(70,12,8,.55);display:none;'),
    );
    this.root.appendChild(this.heatEl);

    // --- viata (jos-stanga) ---
    const hpBox = document.createElement('div');
    this.css(hpBox, this.panel('bottom:22px;left:16px;padding:8px 12px;min-width:180px;'));
    const hpLabel = document.createElement('div');
    this.css(hpLabel, 'font-size:11px;letter-spacing:2px;color:#9fb0c8;margin-bottom:5px;font-weight:600;');
    hpLabel.textContent = 'VIATĂ';
    this.hpTextEl = document.createElement('span');
    this.css(this.hpTextEl, 'float:right;font-size:11px;color:#e8eefc;font-weight:600;');
    hpLabel.appendChild(this.hpTextEl);
    const hpOut = document.createElement('div');
    this.css(hpOut, 'height:10px;background:rgba(255,255,255,.12);border-radius:6px;overflow:hidden;');
    this.hpFill = document.createElement('div');
    this.css(this.hpFill, 'height:100%;width:100%;border-radius:6px;background:linear-gradient(90deg,#3fae4a,#8fd46a);transition:width .15s, background .3s;');
    hpOut.appendChild(this.hpFill);
    hpBox.appendChild(hpLabel);
    hpBox.appendChild(hpOut);
    this.root.appendChild(hpBox);

    // --- viteza (jos-dreapta) ---
    this.speedEl = document.createElement('div');
    this.css(
      this.speedEl,
      this.panel('bottom:22px;right:18px;padding:8px 18px;text-align:right;font-variant-numeric:tabular-nums;'),
    );
    this.speedEl.innerHTML = '<span style="font-size:34px;font-weight:800;line-height:1">0</span> <span style="font-size:13px;color:#9fb0c8;font-weight:600">km/h</span>';
    this.root.appendChild(this.speedEl);

    // --- poziția în cursă (sub viteză) ---
    this.raceEl = document.createElement('div');
    this.css(
      this.raceEl,
      this.panel('bottom:86px;right:18px;font-size:15px;font-weight:700;text-align:right;color:#ffe066;display:none;'),
    );
    this.root.appendChild(this.raceEl);

    // --- ceasul (dreapta-sus) ---
    this.clockEl = document.createElement('div');
    this.css(this.clockEl, this.panel('top:14px;right:16px;font-size:14px;font-weight:600;color:#ffe6a0;font-variant-numeric:tabular-nums;text-align:right;'));
    this.clockEl.textContent = '12:00';
    this.root.appendChild(this.clockEl);

    // --- banner central ---
    this.bannerEl = document.createElement('div');
    this.css(
      this.bannerEl,
      'position:absolute;top:15%;left:50%;transform:translateX(-50%);min-width:340px;max-width:720px;' +
        'background:rgba(6,8,16,.55);border:1px solid rgba(244,197,66,.4);border-radius:14px;' +
        'padding:14px 26px;color:#ffe9a8;text-align:center;font-size:19px;line-height:1.5;font-weight:600;' +
        'text-shadow:0 2px 8px rgba(0,0,0,.7);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
        'box-shadow:0 0 34px rgba(244,197,66,.14),0 10px 34px rgba(0,0,0,.45);' +
        'opacity:0;transition:opacity .3s;white-space:pre-line;',
    );
    this.root.appendChild(this.bannerEl);

    // --- hint jos-centru ---
    this.hintEl = document.createElement('div');
    this.css(
      this.hintEl,
      'position:absolute;bottom:86px;left:50%;transform:translateX(-50%);font-size:13px;color:#e8f0ff;' +
        'background:rgba(8,11,20,.5);border:1px solid rgba(255,255,255,.12);border-radius:999px;' +
        'padding:7px 16px;backdrop-filter:blur(6px);display:none;white-space:nowrap;',
    );
    this.root.appendChild(this.hintEl);

    // --- ochi de arma (pe jos): punct + 4 linii subtiri ---
    this.crossEl = document.createElement('div');
    this.css(this.crossEl, 'position:absolute;top:50%;left:50%;width:26px;height:26px;margin:-13px 0 0 -13px;display:none;');
    this.crossEl.innerHTML =
      '<span style="position:absolute;left:50%;top:50%;width:3px;height:3px;margin:-1.5px 0 0 -1.5px;border-radius:50%;background:#fff;box-shadow:0 0 3px rgba(0,0,0,.9)"></span>' +
      '<span style="position:absolute;left:50%;top:1px;width:1.5px;height:7px;margin-left:-0.75px;background:rgba(255,255,255,.85);box-shadow:0 0 2px rgba(0,0,0,.8)"></span>' +
      '<span style="position:absolute;left:50%;bottom:1px;width:1.5px;height:7px;margin-left:-0.75px;background:rgba(255,255,255,.85);box-shadow:0 0 2px rgba(0,0,0,.8)"></span>' +
      '<span style="position:absolute;top:50%;left:1px;width:7px;height:1.5px;margin-top:-0.75px;background:rgba(255,255,255,.85);box-shadow:0 0 2px rgba(0,0,0,.8)"></span>' +
      '<span style="position:absolute;top:50%;right:1px;width:7px;height:1.5px;margin-top:-0.75px;background:rgba(255,255,255,.85);box-shadow:0 0 2px rgba(0,0,0,.8)"></span>';
    this.root.appendChild(this.crossEl);

    // --- hitmarker ---
    this.hitEl = document.createElement('div');
    this.css(this.hitEl, 'position:absolute;top:50%;left:50%;width:22px;height:22px;margin:-11px 0 0 -11px;display:none;color:#ff5544;font-size:19px;font-weight:900;text-shadow:0 0 6px rgba(255,40,20,.8);line-height:22px;text-align:center;');
    this.hitEl.textContent = '✕';
    this.root.appendChild(this.hitEl);

    // --- vignette rosie la daune + vignette cinematografica permanenta ---
    const cinema = document.createElement('div');
    this.css(
      cinema,
      'position:fixed;inset:0;pointer-events:none;' +
        'background:radial-gradient(ellipse at center,transparent 62%,rgba(0,0,0,.34) 100%);',
    );
    document.body.appendChild(cinema);
    this.vignetteEl = document.createElement('div');
    this.css(
      this.vignetteEl,
      'position:fixed;inset:0;pointer-events:none;opacity:0;transition:opacity .22s;' +
        'background:radial-gradient(ellipse at center,transparent 40%,rgba(190,0,0,.55) 100%);',
    );
    document.body.appendChild(this.vignetteEl);
  }

  setMoney(v: number): void {
    this.moneyEl.textContent = `💰 ${Math.floor(v)} LEI`;
  }
  setMission(text: string | null): void {
    this.missionEl.textContent = text ?? '';
  }
  setObjective(text: string | null): void {
    this.objEl.textContent = text ?? '';
  }
  setHp(ratio: number): void {
    const r = Math.max(0, Math.min(1, ratio));
    this.hpFill.style.width = `${Math.round(r * 100)}%`;
    this.hpFill.style.background =
      r > 0.5
        ? 'linear-gradient(90deg,#2e8f3d,#8fd46a)'
        : r > 0.25
          ? 'linear-gradient(90deg,#c99a20,#e8c43a)'
          : 'linear-gradient(90deg,#a02020,#d43c2f)';
    this.hpTextEl.textContent = `${Math.round(r * 100)}%`;
  }
  setSpeed(kmh: number): void {
    const v = Math.abs(Math.round(kmh));
    // pastram doar numarul din structura "x km/h"
    this.speedEl.innerHTML = `<span style="font-size:34px;font-weight:800;line-height:1">${v}</span> <span style="font-size:13px;color:#9fb0c8;font-weight:600">km/h</span>`;
  }
  setClock(h: number, m: number): void {
    const hh = Math.floor(h);
    const icon = hh >= 6 && hh < 21 ? '☀️' : '🌙';
    this.clockEl.textContent = `${icon} ${String(hh).padStart(2, '0')}:${String(Math.floor(m)).padStart(2, '0')}`;
  }
  setHeat(level: number): void {
    this.heatEl.style.display = level > 0 ? 'block' : 'none';
    if (level > 0) this.heatEl.textContent = `🚨 ȘPAGĂ ${'💰'.repeat(Math.min(5, level))}`;
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
