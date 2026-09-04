// Input: tastatura + mouse cu pointer-lock (cu fallback de "mouse steering").

export type Action =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'handbrake'
  | 'sprint'
  | 'enter'
  | 'honk'
  | 'radio'
  | 'reset'
  | 'fire'
  | 'aim'
  | 'nextStation'
  | 'skipTime'
  | 'toggleWorld';

const BINDINGS: Record<Action, string[]> = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  handbrake: ['Space'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  enter: ['KeyE'],
  honk: ['KeyH'],
  radio: ['KeyM'],
  reset: ['KeyR'],
  fire: ['Mouse0'],
  aim: ['Mouse2'],
  nextStation: ['KeyN'],
  skipTime: ['KeyT'],
  toggleWorld: ['KeyJ'],
};

const CODE_TO_ACTION = new Map<string, Action>();
for (const [action, codes] of Object.entries(BINDINGS) as [Action, string[]][]) {
  for (const c of codes) CODE_TO_ACTION.set(c, action);
}

export class Input {
  private codes = new Set<string>();
  private mouse = new Set<string>();
  private lookDX = 0;
  private lookDY = 0;
  private locked = false;
  private target: HTMLElement;
  /** Look fallback (fara pointer lock): offset-ul cursorului fata de centrul ecranului. */
  private pointerX = 0;
  private pointerY = 0;

  constructor(target: HTMLElement) {
    this.target = target;

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      this.codes.add(e.code);
      const action = CODE_TO_ACTION.get(e.code);
      if (action) this.pressedQueue.add(action);
    });
    window.addEventListener('keyup', (e) => this.codes.delete(e.code));
    window.addEventListener('blur', () => this.codes.clear());

    document.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.lookDX += e.movementX;
        this.lookDY += e.movementY;
      } else {
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
      }
    });

    document.addEventListener('mousedown', (e) => {
      this.mouse.add('Mouse' + e.button);
      if (!this.locked) this.tryLock();
      if (e.button === 2) e.preventDefault();
    });
    document.addEventListener('mouseup', (e) => this.mouse.delete('Mouse' + e.button));
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.target;
    });
  }

  private tryLock(): void {
    const p = this.target.requestPointerLock?.() as Promise<void> | undefined;
    if (p && typeof p.catch === 'function') p.catch(() => undefined);
  }

  /** Tastele apasate in cadrul acestei frame-uri pentru actiuni one-shot. */
  private pressedQueue = new Set<Action>();
  pressed(a: Action): boolean {
    return this.pressedQueue.has(a);
  }
  endFrame(): void {
    this.pressedQueue.clear();
  }

  isDown(a: Action): boolean {
    const binds = BINDINGS[a];
    for (const b of binds) {
      if (b.startsWith('Mouse') ? this.mouse.has(b) : this.codes.has(b)) return true;
    }
    return false;
  }

  /** -1..1 pentru axa (negativ, pozitiv). */
  axis(neg: Action, pos: Action): number {
    return (this.isDown(pos) ? 1 : 0) - (this.isDown(neg) ? 1 : 0);
  }

  /** Look in radiani pentru cadrul curent (consuma acumulatorii). */
  look(): { dx: number; dy: number } {
    if (this.locked) {
      const out = {
        dx: this.lookDX * 0.0022,
        dy: this.lookDY * 0.0022,
      };
      this.lookDX = 0;
      this.lookDY = 0;
      return out;
    }
    // fallback: cursorul "conduce" camera din centrul ecranului
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    return { dx: (this.pointerX - cx) * 0.0018, dy: (this.pointerY - cy) * 0.0018 };
  }
}
