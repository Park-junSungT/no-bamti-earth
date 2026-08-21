/**
 * Tiny WebAudio synth. No asset downloads, no autoplay violations: the
 * AudioContext is only created once the player has interacted with the page.
 */
type Wave = OscillatorType;

interface ToneOpts {
  freq: number;
  dur?: number;
  type?: Wave;
  vol?: number;
  slideTo?: number;
  delay?: number;
  attack?: number;
}

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.02);
    }
  }

  /** Call from a user gesture (button press) before any sound is needed. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.32 : 0;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  private tone({
    freq,
    dur = 0.14,
    type = "sine",
    vol = 1,
    slideTo,
    delay = 0,
    attack = 0.006,
  }: ToneOpts) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private noise(dur = 0.18, vol = 0.5, freq = 900) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  click() {
    this.tone({ freq: 640, dur: 0.06, type: "triangle", vol: 0.25 });
  }

  hover() {
    this.tone({ freq: 880, dur: 0.04, type: "sine", vol: 0.1 });
  }

  pick() {
    this.tone({ freq: 420, dur: 0.05, type: "triangle", vol: 0.18 });
  }

  correct(combo: number) {
    const step = Math.min(combo, 16);
    const base = 392 * Math.pow(2, step / 24);
    this.tone({ freq: base, dur: 0.1, type: "triangle", vol: 0.26 });
    this.tone({ freq: base * 1.5, dur: 0.09, type: "sine", vol: 0.14, delay: 0.04 });
  }

  perfect(combo: number) {
    const step = Math.min(combo, 16);
    const base = 523 * Math.pow(2, step / 24);
    this.tone({ freq: base, dur: 0.1, type: "triangle", vol: 0.24 });
    this.tone({ freq: base * 1.26, dur: 0.1, type: "triangle", vol: 0.2, delay: 0.05 });
    this.tone({ freq: base * 2, dur: 0.16, type: "sine", vol: 0.2, delay: 0.1 });
  }

  wrong() {
    this.tone({ freq: 190, dur: 0.22, type: "sawtooth", vol: 0.2, slideTo: 80 });
    this.noise(0.14, 0.25, 320);
  }

  miss() {
    this.tone({ freq: 150, dur: 0.26, type: "square", vol: 0.14, slideTo: 70 });
  }

  milestone(n: number) {
    const base = 523;
    const notes = [0, 4, 7, 12];
    notes.forEach((semi, i) => {
      this.tone({
        freq: base * Math.pow(2, (semi + Math.min(n, 12)) / 12),
        dur: 0.18,
        type: "triangle",
        vol: 0.2,
        delay: i * 0.055,
      });
    });
  }

  levelUp() {
    [0, 5, 9, 14].forEach((semi, i) =>
      this.tone({
        freq: 392 * Math.pow(2, semi / 12),
        dur: 0.3,
        type: "sawtooth",
        vol: 0.12,
        delay: i * 0.08,
      }),
    );
  }

  power() {
    this.tone({ freq: 300, dur: 0.3, type: "sine", vol: 0.24, slideTo: 1200 });
    this.tone({ freq: 900, dur: 0.24, type: "triangle", vol: 0.14, delay: 0.08 });
  }

  golden() {
    [0, 7, 12, 19].forEach((semi, i) =>
      this.tone({
        freq: 659 * Math.pow(2, semi / 12),
        dur: 0.24,
        type: "sine",
        vol: 0.2,
        delay: i * 0.06,
      }),
    );
  }

  heart() {
    this.tone({ freq: 523, dur: 0.16, type: "sine", vol: 0.22 });
    this.tone({ freq: 784, dur: 0.24, type: "sine", vol: 0.18, delay: 0.09 });
  }

  gameOver() {
    [0, -3, -7, -12].forEach((semi, i) =>
      this.tone({
        freq: 440 * Math.pow(2, semi / 12),
        dur: 0.44,
        type: "triangle",
        vol: 0.16,
        delay: i * 0.13,
      }),
    );
  }

  buy() {
    [0, 7, 16].forEach((semi, i) =>
      this.tone({
        freq: 523 * Math.pow(2, semi / 12),
        dur: 0.2,
        type: "triangle",
        vol: 0.18,
        delay: i * 0.07,
      }),
    );
  }
}

export const sfx = new Sfx();
