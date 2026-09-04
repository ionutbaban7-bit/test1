// Meniu de start / pauza / ecran de incarcare & controale — overlay DOM modern.
// Nu atinge bucla jocului; doar arata/ascunde ecrane si consuma taste.

export class StartMenu {
  private root: HTMLDivElement;
  private onStart: () => void;
  visible = true;

  constructor(onStart: () => void) {
    this.onStart = onStart;
    this.root = document.createElement('div');
    this.root.style.cssText =
      'position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;' +
      'background:radial-gradient(ellipse at center,rgba(6,10,22,.88) 0%,rgba(2,4,10,.96) 100%);' +
      'font-family:"Segoe UI",system-ui,sans-serif;color:#eef2ff;' +
      'backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);';
    document.body.appendChild(this.root);
    this.build();
  }

  private css(el: HTMLElement, s: string): void {
    el.style.cssText = s;
  }

  private build(): void {
    const box = document.createElement('div');
    this.css(
      box,
      'text-align:center;max-width:640px;padding:34px 42px;border-radius:22px;' +
        'background:rgba(12,16,30,.72);border:1px solid rgba(244,197,66,.28);' +
        'box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 60px rgba(244,197,66,.08);',
    );
    this.root.appendChild(box);

    const title = document.createElement('div');
    this.css(title, 'font-size:44px;font-weight:900;letter-spacing:1px;color:#f4c542;text-shadow:0 0 26px rgba(244,197,66,.45);');
    title.textContent = 'BUCUREȘTI VICE';
    box.appendChild(title);

    const sub = document.createElement('div');
    this.css(sub, 'margin-top:8px;font-size:15px;color:#aebadd;letter-spacing:3px;');
    sub.textContent = 'MICI · MAȘINI · GLOANȚE';
    box.appendChild(sub);

    const bar = document.createElement('div');
    this.css(bar, 'width:100%;height:2px;margin:22px 0;background:linear-gradient(90deg,transparent,rgba(244,197,66,.7),transparent);');
    box.appendChild(bar);

    const desc = document.createElement('div');
    this.css(desc, 'font-size:14px;line-height:1.6;color:#cfd6ec;');
    desc.innerHTML =
      'O zi în Centru: împrumuți o Dacie, cureți Oborul de golani, câștigi cursa „Noaptea Unirii”, ' +
      'faci un selfie interzis la Palat și fugi cu „Datoria” până la Autogară. Apoi: satul și Constanța. 🌆🚜🌊';
    box.appendChild(desc);

    // controale
    const grid = document.createElement('div');
    this.css(
      grid,
      'margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px 18px;text-align:left;font-size:12.5px;' +
        'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px 18px;',
    );
    const rows: [string, string][] = [
      ['W A S D', 'mers & condus'],
      ['Mouse', 'privit (click = lock)'],
      ['E', 'intri/ieși din mașină, vorbești'],
      ['Shift', 'fugi'],
      ['Space', 'drift / frână'],
      ['Click stânga', 'foc'],
      ['H', 'claxon'],
      ['M / N', 'radio on/off / post'],
      ['T', 'sare timpul (zi/noapte)'],
      ['J', 'schimbi lumea'],
      ['R', 'resetezi mașina'],
      ['F1', 'acest ajutor'],
    ];
    for (const [k, v] of rows) {
      const row = document.createElement('div');
      this.css(row, 'display:flex;justify-content:space-between;gap:14px;');
      const kk = document.createElement('span');
      this.css(kk, 'font-weight:700;color:#ffd75e;white-space:nowrap;');
      kk.textContent = k;
      const vv = document.createElement('span');
      this.css(vv, 'color:#b9c4de;');
      vv.textContent = v;
      row.append(kk, vv);
      grid.appendChild(row);
    }
    box.appendChild(grid);

    const start = document.createElement('button');
    this.css(
      start,
      'margin-top:26px;font:inherit;font-size:17px;font-weight:700;letter-spacing:.5px;color:#14100a;cursor:pointer;' +
        'background:linear-gradient(180deg,#ffd75e,#f4c542);border:none;border-radius:12px;padding:13px 44px;' +
        'box-shadow:0 6px 20px rgba(244,197,66,.35);transition:transform .12s, box-shadow .12s;',
    );
    start.textContent = '▶  ÎNCEPE JOACA';
    start.addEventListener('mouseenter', () => {
      start.style.transform = 'translateY(-2px)';
      start.style.boxShadow = '0 10px 26px rgba(244,197,66,.5)';
    });
    start.addEventListener('mouseleave', () => {
      start.style.transform = '';
      start.style.boxShadow = '';
    });
    start.addEventListener('click', () => this.start());
    box.appendChild(start);

    const tip = document.createElement('div');
    this.css(tip, 'margin-top:14px;font-size:11.5px;color:#7885a5;');
    tip.textContent = 'Misiunile progresează și se salvează automat. Apasă F1 oricând pentru controale.';
    box.appendChild(tip);
  }

  private start(): void {
    this.visible = false;
    this.root.style.transition = 'opacity .4s';
    this.root.style.opacity = '0';
    setTimeout(() => {
      this.root.style.display = 'none';
      this.onStart();
    }, 380);
  }

  /** Pauza / repornire meniu (F1) — fara sa porneasca jocul din nou. */
  toggle(): void {
    if (this.visible) {
      this.start();
    } else {
      this.visible = true;
      this.root.style.display = 'flex';
      this.root.style.opacity = '1';
    }
  }
}
