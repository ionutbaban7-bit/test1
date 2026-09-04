// Audio 100% sintetizat (WebAudio) — zero fisiere mari. Motoare, claxon,
// focuri de arma si un radio chiptune cu chef romanesc.

export class Sfx {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private engGain!: GainNode;
  private engOsc1!: OscillatorNode;
  private engOsc2!: OscillatorNode;

  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);

      this.engGain = this.ctx.createGain();
      this.engGain.gain.value = 0;
      this.engOsc1 = this.ctx.createOscillator();
      this.engOsc1.type = 'sawtooth';
      this.engOsc1.frequency.value = 46;
      this.engOsc2 = this.ctx.createOscillator();
      this.engOsc2.type = 'square';
      this.engOsc2.frequency.value = 92;
      const g2 = this.ctx.createGain();
      g2.gain.value = 0.35;
      this.engOsc2.connect(g2);
      g2.connect(this.engGain);
      this.engOsc1.connect(this.engGain);
      this.engGain.connect(this.master);
      this.engOsc1.start();
      this.engOsc2.start();
    }
    void this.ctx.resume();
  }

  /** rpm 0..1 (turatia), on = motor pornit. */
  engine(rpm: number, on: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engGain.gain.cancelScheduledValues(t);
    this.engGain.gain.setTargetAtTime(on ? 0.05 + rpm * 0.09 : 0, t, 0.05);
    const f = 42 + rpm * 150 + Math.sin(rpm * 20) * 4;
    this.engOsc1.frequency.setTargetAtTime(f, t, 0.04);
    this.engOsc2.frequency.setTargetAtTime(f * 2, t, 0.04);
  }

  tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseBurst(dur: number, gain: number, lowpass = 4000): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  honk(): void {
    this.tone(392, 0.16, 'square', 0.09);
    this.tone(311, 0.2, 'square', 0.08, 0.02);
  }
  shot(): void {
    this.noiseBurst(0.09, 0.22, 2500);
    this.tone(190, 0.1, 'sawtooth', 0.06);
  }
  hit(): void {
    this.noiseBurst(0.05, 0.14, 900);
  }
  pickup(): void {
    this.tone(880, 0.09, 'triangle', 0.12);
    this.tone(1318, 0.12, 'triangle', 0.12, 0.07);
  }
  hurt(): void {
    this.tone(160, 0.18, 'sawtooth', 0.1);
    this.noiseBurst(0.12, 0.1, 700);
  }
  crash(): void {
    this.noiseBurst(0.25, 0.28, 500);
    this.tone(70, 0.3, 'sawtooth', 0.12);
  }
}

/** Radio „Micuțu'” — secventa chiptune pe 4 acorduri, fara fisiere. */
export class Radio {
  on = false;
  private sfx: Sfx;
  private timer: number | null = null;
  private step = 0;
  private readonly chords = [
    [196, 247, 294, 392], // G
    [175, 220, 262, 349], // F
    [165, 208, 247, 330], // E
    [147, 196, 220, 294], // D
  ];

  constructor(sfx: Sfx) {
    this.sfx = sfx;
  }

  toggle(): void {
    this.on = !this.on;
    if (this.on) {
      this.step = 0;
      this.timer = window.setInterval(() => this.tick(), 240);
      this.tick();
    } else if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const ch = this.chords[this.step % this.chords.length];
    const beat = this.step % 4;
    if (beat === 0) this.sfx.tone(ch[0] / 2, 0.22, 'triangle', 0.16);
    const note = ch[1 + ((this.step >> 1) % 3)];
    this.sfx.tone(note * 2, 0.14, 'square', 0.05);
    this.sfx.tone(note * 3, 0.1, 'triangle', 0.03, 0.08);
    this.step++;
  }
}
