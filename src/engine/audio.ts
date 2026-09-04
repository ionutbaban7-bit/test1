// Audio 100% sintetizat (WebAudio) — zero fisiere mari. Motoare, claxon,
// focuri de arma si radioul cu posturi „de cartier". Fiecare post are o
// melodie procedurala + un jingle cu text (vorbește „DJ-ul" in HUD).

export type StationId = 'micutu' | 'doinita' | 'belea' | 'depeche' | 'fara' | 'gogu';

export interface Station {
  id: StationId;
  name: string;
  dj: string;
  color: string;
}

export const STATIONS: Station[] = [
  { id: 'micutu', name: 'RADIO MICUȚU\' — manele & șlagăre', dj: 'La Micuțu, la țuică!', color: '#ffd75e' },
  { id: 'doinita', name: 'RADIO DOINIȚA — muzica autentică', dj: 'Doină și horă, de la Sibiu pân\' la mare!', color: '#8ecb8e' },
  { id: 'belea', name: 'RADIO BELEA — la Bâlea Lac', dj: 'Frig afară, cald la radio!', color: '#9fc8e8' },
  { id: 'depeche', name: 'RADIO DEPECHE MODE FANCLUB', dj: 'Enjoy the silence... pe coclitu\' lu\' tata.', color: '#b48ed8' },
  { id: 'gogu', name: 'RADIO GOGU PARFUM — hiturile șefului', dj: 'Aici Gogu Parfum! Hai cu mine!', color: '#e88e5e' },
  { id: 'fara', name: 'FĂRĂ RADIO — doar motorul', dj: '', color: '#888888' },
];

const ROOTS: Record<Exclude<StationId, 'fara'>, number> = {
  micutu: 138.59,
  doinita: 110.0, // A2 — doina, mai grav
  belea: 130.81, // C3
  depeche: 146.83, // D3
  gogu: 155.56, // D#3
};
// scara comuna pentru toate: frigian (micutu/belea), pentatonic (doinita), minor (depeche/gogu)
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const PENTA = [0, 3, 5, 7, 10];
const SEQS: Record<Exclude<StationId, 'fara'>, { bass: number[]; lead: number[]; scale: number[]; bpm: number }> = {
  micutu: {
    bass: [0, 0, 5, 3, 0, 0, 7, 5, 0, 0, 3, 5, 8, 7, 5, 3],
    lead: [8, 7, 8, 12, 7, 5, 7, 8],
    scale: MINOR,
    bpm: 118,
  },
  doinita: {
    bass: [0, 2, 0, 2, 3, 2, 0, 2, 0, 2, 0, -2, 0, 3, 2, 0],
    lead: [5, 7, 5, 3, 5, 7, 10, 7, 5, 3, 2, 3],
    scale: PENTA,
    bpm: 96,
  },
  belea: {
    bass: [0, 0, 0, 0, 3, 3, 3, 3, 5, 5, 5, 5, 3, 3, 0, 0],
    lead: [5, 3, 0, 3, 5, 7, 8, 7],
    scale: MINOR,
    bpm: 72,
  },
  depeche: {
    bass: [0, 0, 0, 0, 7, 7, 7, 7, 5, 5, 5, 5, 3, 3, 3, 3],
    lead: [0, 7, 5, 7, 8, 7, 5, 3],
    scale: MINOR,
    bpm: 112,
  },
  gogu: {
    bass: [0, 0, 5, 3, 0, 0, 7, 5],
    lead: [7, 8, 7, 5, 3, 5, 7, 8, 7, 5, 3, 2],
    scale: MAJOR,
    bpm: 128,
  },
};

export class Radio {
  on = false;
  station: Station = STATIONS[0];
  private sfx: Sfx;
  private timer: number | null = null;
  private step = 0;

  constructor(sfx: Sfx) {
    this.sfx = sfx;
  }

  toggle(): Station {
    // daca e pornit, il oprim; daca e oprit, il pornim pe acelasi post
    this.on = !this.on;
    if (this.on) this.startPlayback();
    else this.stopPlayback();
    return this.station;
  }

  next(): Station {
    const idx = STATIONS.findIndex((s) => s.id === this.station.id);
    this.station = STATIONS[(idx + 1) % STATIONS.length];
    if (this.station.id === 'fara') {
      this.on = false;
      this.stopPlayback();
    } else if (!this.on) {
      this.on = true;
      this.startPlayback();
    }
    // schimbare post: restartam melodia de la inceput
    if (this.on) {
      this.stopPlayback();
      this.startPlayback();
    }
    return this.station;
  }

  private startPlayback(): void {
    if (this.station.id === 'fara') return;
    this.step = 0;
    const seq = SEQS[this.station.id];
    const ms = 60000 / seq.bpm / 2;
    this.stopPlayback();
    this.timer = window.setInterval(() => this.tick(), ms);
  }

  private stopPlayback(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Un cantecel diferit ca stare de spirit per post. */
  private tick(): void {
    const id = this.station.id as Exclude<StationId, 'fara'>;
    const seq = SEQS[id];
    const root = ROOTS[id];
    const beat = this.step % 16;
    const semis = (deg: number): number => {
      const scale = seq.scale;
      const oct = Math.floor(deg / scale.length);
      const d = ((deg % scale.length) + scale.length) % scale.length;
      return root * Math.pow(2, (oct * 12 + scale[d]) / 12);
    };
    if (beat % 4 === 0) {
      const b = seq.bass[beat];
      this.sfx.tone(semis(b) / 2, 0.3, 'triangle', 0.12);
      this.sfx.tone(semis(b) / 2, 0.3, 'sine', 0.05, 0.04);
    }
    if (beat % 2 === 0 && (id === 'micutu' || id === 'gogu')) {
      // „duba" specifica
      this.sfx.tone(90 + Math.random() * 20, 0.08, 'sine', 0.1);
    }
    const l = seq.lead[(this.step >> 1) % seq.lead.length];
    const vib = (this.step % 8 === 0 ? 1.02 : 1);
    this.sfx.tone(semis(l) * 2 * vib, 0.16, 'square', 0.035);
    this.sfx.tone(semis(l) * 3 * vib, 0.13, 'triangle', 0.02, 0.06);
    this.step++;
  }
}

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

  private lastClip = 0;

  /** rpm 0..1 (turatia), on = motor pornit. */
  engine(rpm: number, on: boolean, kind = 'car'): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engGain.gain.cancelScheduledValues(t);
    let base = 42;
    let mult = 1;
    if (kind === 'tractor') {
      base = 32;
      mult = 0.6;
    } else if (kind === 'moped') {
      base = 90;
      mult = 0.5;
    } else if (kind === 'bike' || kind === 'cart') {
      // nu au motor: clopotei/copite doar din cand in cand, nu la fiecare frame
      this.engGain.gain.setTargetAtTime(0, t, 0.05);
      if (on && rpm > 0.08 && t - this.lastClip > 0.35) {
        this.lastClip = t;
        if (kind === 'cart') {
          this.tone(1200, 0.06, 'sine', 0.03); // clopotel de caruta
          this.tone(900, 0.05, 'sine', 0.02, 0.12);
        } else {
          this.tone(1500, 0.04, 'sine', 0.02); // zornait de bicicleta
        }
      }
      return;
    }
    this.engGain.gain.setTargetAtTime(on ? 0.05 + rpm * 0.09 : 0, t, 0.05);
    const f = (base + rpm * 150 + Math.sin(rpm * 20) * 4) * mult;
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
  // claxon de tractor / masina veche
  honkOld(): void {
    this.tone(233, 0.5, 'square', 0.08);
    this.tone(233, 0.3, 'square', 0.05, 0.55);
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
  // ciocnit de oala / furca: metalic sec
  clang(): void {
    this.noiseBurst(0.05, 0.16, 3800);
    this.tone(660 + Math.random() * 300, 0.09, 'square', 0.06);
  }
  // „poc" de mica pe gratar (fum)
  pop(): void {
    this.noiseBurst(0.03, 0.06, 2000);
  }
  // clinchet de borcane / sticla
  clink(): void {
    this.tone(1976, 0.1, 'sine', 0.09);
    this.tone(2637, 0.16, 'sine', 0.06, 0.03);
    this.tone(3136, 0.1, 'sine', 0.03, 0.07);
  }
  // injuratura digitala (gluma radio) — bip „bip" cenzurat
  beep(): void {
    this.tone(1100, 0.09, 'square', 0.09);
    this.tone(1100, 0.12, 'square', 0.09, 0.13);
  }
}
