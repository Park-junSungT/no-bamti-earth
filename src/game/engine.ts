import { sfx } from "./audio";
import { drawPowerGlyph, drawWaste, rr } from "./draw";
import {
  BINS,
  BIN_ORDER,
  C,
  STAGES,
  STAGE_AT,
  TUNING,
  WASTE,
} from "./config";
import type {
  BannerData,
  BinId,
  Grade,
  HudState,
  Phase,
  PowerId,
  Profile,
  RunResult,
  WasteKind,
} from "./types";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SANS =
  "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[(Math.random() * arr.length) | 0];

interface Item {
  id: number;
  kind: WasteKind;
  bin: BinId;
  label: string;
  x: number;
  bob: number;
  r: number;
  golden: boolean;
  /** 0 = on belt, 1 = held by pointer, 2 = flying to a bin, 3 = dumped */
  state: 0 | 1 | 2 | 3;
  hx: number;
  hy: number;
  fx: number;
  fy: number;
  ft: number;
  fdur: number;
  grabbedAt: number;
  spin: number;
  spinV: number;
  scale: number;
  tone: number;
}

interface Orb {
  id: number;
  power: PowerId;
  x: number;
  r: number;
  t: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  square: boolean;
  g: number;
}

interface Floater {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
  mono: boolean;
}

interface BinRect {
  id: BinId;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
}

interface BinFx {
  glow: number;
  bad: number;
  shake: number;
  hover: number;
}

interface Layout {
  w: number;
  h: number;
  beltTop: number;
  beltH: number;
  cy: number;
  beltEnd: number;
  chuteW: number;
  binTop: number;
  binH: number;
  bins: BinRect[];
  itemR: number;
}

export interface EngineHooks {
  onHud: (hud: HudState) => void;
  onBanner: (b: BannerData) => void;
  onOver: (r: RunResult) => void;
}

const POWER_META: Record<
  PowerId,
  { label: string; sub: string; color: string }
> = {
  boost: { label: "ECO BOOST", sub: "DOUBLE SCORE", color: C.mint },
  freeze: { label: "FREEZE", sub: "BELT STOPPED", color: C.cyan },
  magnet: { label: "ECO MAGNET", sub: "AUTO SORTING", color: "#7C9CF5" },
  heart: { label: "REPAIR", sub: "+1 LIFE", color: C.red },
};

export class Engine {
  phase: Phase = "menu";

  private hooks: EngineHooks;
  private profile: Profile;

  private L: Layout;
  private dpr = 1;
  /** Static art is rasterised once per resize; the frame loop only blits. */
  private scene: HTMLCanvasElement | null = null;
  private beltBack: HTMLCanvasElement | null = null;
  private beltFront: HTMLCanvasElement | null = null;
  private binArt = new Map<BinId, [HTMLCanvasElement, HTMLCanvasElement]>();

  private items: Item[] = [];
  private orbs: Orb[] = [];
  private parts: Particle[] = [];
  private floats: Floater[] = [];
  private pending: Array<{ at: number; bin?: BinId; golden?: boolean }> = [];
  private nextId = 1;

  private t = 0;
  private beltOffset = 0;
  private lastMs = 0;

  // run state
  private score = 0;
  private combo = 0;
  private bestCombo = 0;
  private lives: number = TUNING.startLives;
  private sorted = 0;
  private wrongCount = 0;
  private missedCount = 0;
  private stage = 0;
  private comboT = 0;
  private spawnT = 0;
  private eventT = 0;
  private magnetTick = 0;
  private orbCooldown = 0;
  private lifeAwardAt: number = TUNING.lifeEveryCombo;

  // modifiers
  private eventSpeed = 1;
  private eventSpeedT = 0;
  private boostT = 0;
  private freezeT = 0;
  private magnetT = 0;
  private slowT = 0;
  private slowCharges = 0;

  // fx
  private shake = 0;
  private shakeSeed = 0;
  private flash = 0;
  private flashColor = "#FF5470";
  private ring = 0;
  private binFx: Record<BinId, BinFx>;

  private held: Item | null = null;
  private pointer = { x: 0, y: 0, down: false };
  private hoverBin: BinId | null = null;
  private bannerId = 1;
  private lastHud: HudState | null = null;

  constructor(hooks: EngineHooks, profile: Profile) {
    this.hooks = hooks;
    this.profile = profile;
    this.L = this.computeLayout(800, 600);
    this.binFx = {} as Record<BinId, BinFx>;
    for (const id of BIN_ORDER) {
      this.binFx[id] = { glow: 0, bad: 0, shake: 0, hover: 0 };
    }
  }

  setProfile(p: Profile) {
    this.profile = p;
  }

  // ---------------------------------------------------------------- layout

  resize(w: number, h: number, dpr = 1) {
    this.L = this.computeLayout(w, h);
    this.dpr = Math.min(2, Math.max(1, dpr));
    this.scene = null;
    this.beltBack = null;
    this.beltFront = null;
    this.binArt.clear();
  }

  private computeLayout(w: number, h: number): Layout {
    const pad = Math.max(8, Math.min(16, w * 0.02));
    const binH = clamp(h * 0.26, 92, 180);
    const binTop = h - binH - pad;
    const beltH = clamp(h * 0.26, 84, 150);
    const beltTop = clamp((binTop - beltH) * 0.38, 8, 210);
    const chuteW = clamp(w * 0.075, 34, 62);
    const gap = Math.max(5, w * 0.012);
    const binW = (w - pad * 2 - gap * 4) / 5;
    const bins: BinRect[] = BIN_ORDER.map((id, i) => {
      const x = pad + i * (binW + gap);
      return { id, x, y: binTop, w: binW, h: binH, cx: x + binW / 2 };
    });
    return {
      w,
      h,
      beltTop,
      beltH,
      cy: beltTop + beltH / 2,
      beltEnd: w - chuteW,
      chuteW,
      binTop,
      binH,
      bins,
      itemR: clamp(beltH * 0.31, 16, 44),
    };
  }

  // ----------------------------------------------------------- run control

  startRun() {
    this.items = [];
    this.orbs = [];
    this.parts = [];
    this.floats = [];
    this.pending = [];
    this.t = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.lives = TUNING.startLives;
    this.sorted = 0;
    this.wrongCount = 0;
    this.missedCount = 0;
    this.stage = 0;
    this.comboT = 0;
    this.spawnT = 0.85;
    this.eventT = TUNING.eventFirstAt;
    this.lifeAwardAt = TUNING.lifeEveryCombo;
    this.eventSpeed = 1;
    this.eventSpeedT = 0;
    this.boostT = 0;
    this.freezeT = 0;
    this.magnetT = 0;
    this.slowT = 0;
    this.orbCooldown = rand(14, 22);
    this.slowCharges = this.profile.upgrades.conveyorControl;
    this.held = null;
    this.hoverBin = null;
    this.shake = 0;
    this.flash = 0;
    this.ring = 0;
    this.phase = "playing";
    this.banner("STAGE 1", "START", "good");
    this.syncHud(true);
  }

  toMenu() {
    this.phase = "menu";
    this.items = [];
    this.orbs = [];
    this.pending = [];
    this.held = null;
    this.syncHud(true);
  }

  pause() {
    if (this.phase === "playing") {
      this.phase = "paused";
      this.releaseHeld();
    }
  }

  resume() {
    if (this.phase === "paused") this.phase = "playing";
  }

  useSlow() {
    if (this.phase !== "playing" || this.slowCharges <= 0 || this.slowT > 0) return;
    this.slowCharges--;
    this.slowT = TUNING.slowDuration;
    sfx.power();
    this.banner("CONVEYOR CONTROL", "BELT SLOWED", "cool");
    this.syncHud(true);
  }

  // ------------------------------------------------------------ main frame

  frame(nowMs: number, ctx: CanvasRenderingContext2D) {
    const dt = this.lastMs ? Math.min(0.05, (nowMs - this.lastMs) / 1000) : 0.016;
    this.lastMs = nowMs;
    this.update(dt);
    this.render(ctx);
  }

  resetClock() {
    this.lastMs = 0;
  }

  // --------------------------------------------------------------- update

  private stageTravel() {
    const i = this.stage;
    const s = STAGES[i];
    const next = STAGES[i + 1];
    const from = STAGE_AT[i];
    if (!next) {
      // Eco Master never stops tightening — it just approaches a floor.
      return Math.max(1.55, s.travel * Math.pow(0.86, (this.t - from) / 45));
    }
    const to = STAGE_AT[i + 1];
    const p = clamp((this.t - from) / (to - from), 0, 1);
    return lerp(s.travel, next.travel, p);
  }

  private stageGap() {
    const s = STAGES[this.stage];
    const next = STAGES[this.stage + 1];
    const from = STAGE_AT[this.stage];
    if (!next) {
      const decay = Math.max(0.6, Math.pow(0.9, (this.t - from) / 45));
      return rand(s.gap[0] * decay, s.gap[1] * decay);
    }
    const to = STAGE_AT[this.stage + 1];
    const p = clamp((this.t - from) / (to - from), 0, 1);
    return rand(lerp(s.gap[0], next.gap[0], p), lerp(s.gap[1], next.gap[1], p));
  }

  private speedMul() {
    if (this.freezeT > 0) return 0;
    return this.eventSpeed * (this.slowT > 0 ? TUNING.slowFactor : 1);
  }

  private beltSpeed() {
    const len = this.L.beltEnd + this.L.itemR * 2;
    if (this.phase === "menu") return (len / 5.6) * 1;
    if (this.phase === "over") return len / 12;
    return (len / this.stageTravel()) * this.speedMul();
  }

  private update(dt: number) {
    const playing = this.phase === "playing";
    const speed = this.beltSpeed();
    this.beltOffset += speed * dt;

    if (this.phase === "paused") {
      this.decayFx(dt * 0.4);
      return;
    }

    if (playing) {
      this.t += dt;
      this.updateStage();
      this.updateTimers(dt);
      this.updateSpawner(dt);
      this.updateMagnet(dt);
    } else {
      this.attractSpawner(dt);
    }

    this.moveItems(dt, speed);
    this.moveOrbs(dt, speed);
    this.stepParticles(dt);
    this.decayFx(dt);
    if (playing) this.syncHud(false);
  }

  private updateStage() {
    let s = 0;
    for (let i = 0; i < STAGE_AT.length; i++) if (this.t >= STAGE_AT[i]) s = i;
    if (s !== this.stage) {
      this.stage = s;
      sfx.levelUp();
      this.banner(`STAGE ${s + 1}`, STAGES[s].name, s >= 3 ? "hot" : "cool");
      this.ring = 1;
    }
  }

  private updateTimers(dt: number) {
    if (this.combo > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) {
        this.combo = 0;
        this.comboT = 0;
      }
    }
    if (this.eventSpeedT > 0) {
      this.eventSpeedT -= dt;
      if (this.eventSpeedT <= 0) this.eventSpeed = 1;
    }
    this.boostT = Math.max(0, this.boostT - dt);
    this.freezeT = Math.max(0, this.freezeT - dt);
    this.magnetT = Math.max(0, this.magnetT - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    this.orbCooldown = Math.max(0, this.orbCooldown - dt);

    if (this.stage >= 2) {
      this.eventT -= dt;
      if (this.eventT <= 0) {
        this.fireEvent();
        this.eventT = rand(TUNING.eventGap[0], TUNING.eventGap[1]);
      }
    }
  }

  // -------------------------------------------------------------- spawning

  private poolForTier(tier: number, bin?: BinId) {
    return WASTE.filter((wd) => wd.tier <= tier && (!bin || wd.bin === bin));
  }

  private queueGroup() {
    const s = STAGES[this.stage];
    const total = s.patterns.reduce((a, p) => a + p[1], 0);
    let roll = Math.random() * total;
    let pattern = s.patterns[0][0];
    for (const [p, wgt] of s.patterns) {
      roll -= wgt;
      if (roll <= 0) {
        pattern = p;
        break;
      }
    }
    const count = pattern === "single" ? 1 : pattern === "pair" ? 2 : 3;
    const step = pattern === "burst" ? 0.26 : 0.38;
    for (let i = 0; i < count; i++) {
      this.pending.push({ at: this.t + i * step });
    }
  }

  private updateSpawner(dt: number) {
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      if (this.items.length + this.pending.length < STAGES[this.stage].maxItems) {
        this.queueGroup();
      }
      this.spawnT = this.stageGap();
    }
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (this.pending[i].at <= this.t) {
        const req = this.pending[i];
        this.pending.splice(i, 1);
        this.spawnItem(req.bin, req.golden);
      }
    }
  }

  private attractSpawner(dt: number) {
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = rand(0.85, 1.35);
      if (this.items.length < 7) this.spawnItem(undefined, Math.random() < 0.06);
    }
  }

  private spawnItem(bin?: BinId, golden?: boolean) {
    const tier = this.phase === "playing" ? STAGES[this.stage].tier : 4;
    const pool = this.poolForTier(tier, bin);
    if (!pool.length) return;
    const def = pick(pool);
    const r = this.L.itemR;
    const isGold =
      golden ??
      (this.phase === "playing" &&
        this.stage >= 1 &&
        Math.random() < TUNING.goldenChance);
    this.items.push({
      id: this.nextId++,
      kind: def.kind,
      bin: def.bin,
      label: def.label,
      x: -r * 1.6,
      bob: rand(0, Math.PI * 2),
      r,
      golden: isGold,
      state: 0,
      hx: 0,
      hy: 0,
      fx: 0,
      fy: 0,
      ft: 0,
      fdur: 0.24,
      grabbedAt: 0,
      spin: rand(-0.12, 0.12),
      spinV: 0,
      scale: 0,
      tone: rand(0, 1),
    });

    if (
      this.phase === "playing" &&
      this.stage >= 1 &&
      this.orbs.length === 0 &&
      this.orbCooldown <= 0 &&
      Math.random() < this.orbChance()
    ) {
      this.spawnOrb();
    }
  }

  private orbChance() {
    return TUNING.powerChance + this.profile.upgrades.ecoMagnet * 0.012;
  }

  private spawnOrb() {
    const pool: PowerId[] = ["boost", "freeze", "magnet"];
    if (this.lives < TUNING.maxLives) pool.push("heart");
    this.orbCooldown = rand(TUNING.powerCooldown[0], TUNING.powerCooldown[1]);
    this.orbs.push({
      id: this.nextId++,
      power: pick(pool),
      // trail well behind the item that triggered the spawn so the two never overlap
      x: -this.L.itemR * 5.2,
      r: this.L.itemR * 0.82,
      t: 0,
    });
  }

  // ---------------------------------------------------------------- events

  private fireEvent() {
    const kinds = ["speed", "slow", "chaos", "bonus", "golden"] as const;
    const kind = pick(kinds.slice(0, this.stage >= 3 ? 5 : 4) as unknown as string[]);
    switch (kind) {
      case "speed":
        this.eventSpeed = 1.95;
        this.eventSpeedT = 6;
        this.banner("SPEED UP", "BELT AT 2x", "hot");
        this.flashWith("#FFD84D", 0.28);
        sfx.power();
        break;
      case "slow":
        this.eventSpeed = 0.55;
        this.eventSpeedT = 6.5;
        this.banner("SLOW MOTION", "CATCH YOUR BREATH", "cool");
        sfx.power();
        break;
      case "chaos": {
        const n = 5 + (Math.random() * 3) | 0;
        for (let i = 0; i < n; i++) {
          this.pending.push({ at: this.t + 0.35 + i * rand(0.28, 0.42) });
        }
        this.banner("CHAOS MODE", "INCOMING WAVE", "hot");
        this.shakeBy(9);
        sfx.power();
        break;
      }
      case "bonus": {
        const bin = pick(BIN_ORDER);
        const n = 4 + (Math.random() * 2) | 0;
        for (let i = 0; i < n; i++) {
          this.pending.push({ at: this.t + 0.35 + i * 0.52, bin });
        }
        this.banner("BONUS WAVE", `${BINS[bin].label} ONLY`, "good");
        sfx.power();
        break;
      }
      case "golden":
        this.pending.push({ at: this.t + 0.2, golden: true });
        this.banner("GOLDEN RECYCLABLE", "BIG BONUS INBOUND", "gold");
        sfx.golden();
        break;
    }
  }

  // ------------------------------------------------------------- movement

  private moveItems(dt: number, speed: number) {
    const L = this.L;
    const limit = this.phase === "playing" ? L.beltEnd : L.w + L.itemR * 2;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.scale = Math.min(1, it.scale + dt * 6);
      it.bob += dt * 2.4;

      if (it.state === 0) {
        it.x += speed * dt;
        if (it.x > limit) {
          if (this.phase === "playing") this.onMissed(it);
          this.items.splice(i, 1);
          continue;
        }
      } else if (it.state === 2) {
        it.ft += dt;
        const p = clamp(it.ft / it.fdur, 0, 1);
        const e = 1 - Math.pow(1 - p, 3);
        it.hx = lerp(it.hx, it.fx, e * 0.55 + 0.12);
        it.hy = lerp(it.hy, it.fy, e * 0.55 + 0.12);
        it.spin += dt * 6;
        if (p >= 1) {
          this.items.splice(i, 1);
          continue;
        }
      } else if (it.state === 3) {
        it.ft += dt;
        it.hy += (260 + it.ft * 700) * dt;
        it.spin += dt * 4;
        if (it.hy > L.h + 120 || it.ft > 1.2) {
          this.items.splice(i, 1);
          continue;
        }
      }
    }
  }

  private moveOrbs(dt: number, speed: number) {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.t += dt;
      o.x += speed * dt;
      if (o.x > this.L.w + o.r * 2) this.orbs.splice(i, 1);
    }
  }

  private updateMagnet(dt: number) {
    if (this.magnetT <= 0) return;
    this.magnetTick -= dt;
    if (this.magnetTick > 0) return;
    this.magnetTick = 0.35;
    let best: Item | null = null;
    for (const it of this.items) {
      if (it.state !== 0) continue;
      if (!best || it.x > best.x) best = it;
    }
    if (best) {
      best.grabbedAt = this.progress(best);
      this.resolveSort(best, best.bin, true);
    }
  }

  private stepParticles(dt: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.parts.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 1.6 * dt;
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.floats.splice(i, 1);
        continue;
      }
      f.y += f.vy * dt;
      f.vy *= 1 - 1.2 * dt;
    }
  }

  private decayFx(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 42);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.ring = Math.max(0, this.ring - dt * 1.6);
    for (const id of BIN_ORDER) {
      const f = this.binFx[id];
      f.glow = Math.max(0, f.glow - dt * 2.6);
      f.bad = Math.max(0, f.bad - dt * 2.4);
      f.shake = Math.max(0, f.shake - dt * 6);
      const want = this.hoverBin === id ? 1 : 0;
      f.hover += (want - f.hover) * Math.min(1, dt * 14);
    }
  }

  // --------------------------------------------------------------- scoring

  private progress(it: Item) {
    return clamp(it.x / Math.max(1, this.L.beltEnd), 0, 1);
  }

  private gradeFor(p: number): Grade {
    const bonus = this.profile.upgrades.sortingPower * TUNING.forgivenessPerLevel;
    if (p < TUNING.perfectAt + bonus) return "perfect";
    if (p < TUNING.greatAt + bonus) return "great";
    return "good";
  }

  private multiplier() {
    return 1 + Math.min(this.combo, TUNING.multComboCap) * TUNING.multStep;
  }

  private resolveSort(it: Item, bin: BinId, auto = false) {
    const target = this.L.bins.find((b) => b.id === bin)!;
    it.state = 2;
    it.ft = 0;
    it.fdur = 0.26;
    it.fx = target.cx;
    it.fy = target.y + target.h * 0.34;
    if (it.hx === 0 && it.hy === 0) {
      it.hx = it.x;
      it.hy = this.L.cy;
    }

    if (it.bin === bin) {
      const grade = auto ? "great" : this.gradeFor(it.grabbedAt);
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.comboT =
        TUNING.comboWindow +
        this.profile.upgrades.comboTime * TUNING.comboWindowPerLevel;
      const mult = this.multiplier();
      const boost = this.boostT > 0 ? 2 : 1;
      const gained = Math.round(
        (TUNING.base[grade] * mult + (it.golden ? TUNING.goldenBonus : 0)) * boost,
      );
      this.score += gained;
      this.sorted++;

      const color = it.golden ? C.gold : BINS[bin].color;
      const fx = this.binFx[bin];
      fx.glow = 1;

      const label =
        grade === "perfect" ? "PERFECT!" : grade === "great" ? "GREAT!" : "GOOD";
      const fy = this.L.cy - this.L.itemR * 1.4;
      this.float(it.x, fy, `${label} +${gained}`, color, grade === "perfect" ? 20 : 17);
      this.burst(
        target.cx,
        target.y + 10,
        color,
        grade === "perfect" ? 22 : grade === "great" ? 14 : 9,
        grade === "perfect" ? 300 : 210,
      );
      if (it.golden) {
        this.burst(it.x, this.L.cy, C.gold, 30, 380);
        this.float(it.x, fy - 26, `GOLDEN +${TUNING.goldenBonus}`, C.gold, 20);
        this.flashWith(C.gold, 0.4);
        sfx.golden();
      } else if (grade === "perfect") {
        sfx.perfect(this.combo);
      } else {
        sfx.correct(this.combo);
      }

      if (this.combo > 0 && this.combo % 5 === 0) {
        this.ring = 1;
        this.float(
          this.L.w / 2,
          this.L.beltTop - 6,
          `COMBO x${this.combo}`,
          this.combo >= 20 ? C.gold : C.green,
          Math.min(34, 22 + this.combo * 0.4),
        );
        this.burst(this.L.w / 2, this.L.beltTop - 10, C.mint, 16, 260);
        sfx.milestone(this.combo);
      }
      if (this.combo >= this.lifeAwardAt) {
        this.lifeAwardAt += TUNING.lifeEveryCombo;
        if (this.lives < TUNING.maxLives) {
          this.lives++;
          this.float(this.L.w / 2, this.L.beltTop + 24, "+1 LIFE", C.red, 22);
          sfx.heart();
        }
      }
    } else {
      this.combo = 0;
      this.comboT = 0;
      this.wrongCount++;
      this.lives--;
      const fx = this.binFx[bin];
      fx.bad = 1;
      fx.shake = 1;
      this.shakeBy(11);
      this.flashWith(C.red, 0.42);
      this.float(target.cx, target.y - 18, "WRONG BIN", C.red, 19);
      this.float(
        target.cx,
        target.y + 6,
        `→ ${BINS[it.bin].label}`,
        C.ink2,
        14,
      );
      this.burst(target.cx, target.y + 8, C.red, 14, 240);
      sfx.wrong();
      if (this.lives <= 0) this.gameOver();
    }
    this.syncHud(true);
  }

  private onMissed(it: Item) {
    this.missedCount++;
    this.combo = 0;
    this.comboT = 0;
    this.lives--;
    it.state = 3;
    it.ft = 0;
    it.hx = this.L.beltEnd + this.L.chuteW * 0.5;
    it.hy = this.L.cy;
    this.items.push(it);
    this.shakeBy(8);
    this.flashWith(C.red, 0.3);
    this.float(this.L.beltEnd - 6, this.L.cy - this.L.itemR, "MISSED", C.red, 17);
    this.burst(this.L.beltEnd, this.L.cy, C.red, 10, 200);
    sfx.miss();
    if (this.lives <= 0) this.gameOver();
    this.syncHud(true);
  }

  private gameOver() {
    if (this.phase === "over") return;
    this.lives = 0;
    this.phase = "over";
    this.releaseHeld();
    this.shakeBy(16);
    this.flashWith(C.red, 0.55);
    sfx.gameOver();
    const attempts = this.sorted + this.wrongCount + this.missedCount;
    const accuracy = attempts ? this.sorted / attempts : 0;
    const eco =
      Math.floor(this.score / 12) + this.sorted * 2 + this.bestCombo * 3;
    this.hooks.onOver({
      score: this.score,
      bestCombo: this.bestCombo,
      sorted: this.sorted,
      wrong: this.wrongCount,
      missed: this.missedCount,
      accuracy,
      eco,
      stage: this.stage + 1,
      duration: this.t,
      newBest: this.score > this.profile.best,
    });
    this.syncHud(true);
  }

  // ---------------------------------------------------------------- input

  pointerDown(x: number, y: number) {
    this.pointer = { x, y, down: true };
    if (this.phase !== "playing") return;

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      const dx = x - o.x;
      const dy = y - this.orbY(o);
      if (dx * dx + dy * dy < o.r * o.r * 2.6) {
        this.orbs.splice(i, 1);
        this.collectPower(o);
        return;
      }
    }

    const it = this.hitItem(x, y);
    if (it) {
      it.state = 1;
      it.grabbedAt = this.progress(it);
      it.hx = x;
      it.hy = y;
      this.held = it;
      sfx.pick();
    }
  }

  pointerMove(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
    if (this.held) {
      this.held.hx = x;
      this.held.hy = y;
      this.hoverBin = this.binAt(x, y);
    }
  }

  pointerUp(x: number, y: number) {
    this.pointer.down = false;
    const it = this.held;
    this.held = null;
    this.hoverBin = null;
    if (!it) return;
    const bin = this.binAt(x, y);
    if (bin) {
      it.hx = x;
      it.hy = y;
      this.resolveSort(it, bin);
    } else {
      it.state = 0;
      it.hx = 0;
      it.hy = 0;
    }
  }

  cancelPointer() {
    this.releaseHeld();
  }

  private releaseHeld() {
    if (this.held) {
      this.held.state = 0;
      this.held.hx = 0;
      this.held.hy = 0;
      this.held = null;
    }
    this.hoverBin = null;
    this.pointer.down = false;
  }

  /** Keyboard shortcut: sort the item closest to the reject chute. */
  sortLeading(index: number) {
    if (this.phase !== "playing") return;
    const bin = BIN_ORDER[index];
    if (!bin) return;
    let best: Item | null = this.held;
    if (!best) {
      for (const it of this.items) {
        if (it.state !== 0) continue;
        if (!best || it.x > best.x) best = it;
      }
    }
    if (!best) return;
    if (best.state === 0) best.grabbedAt = this.progress(best);
    best.hx = best.state === 1 ? best.hx : best.x;
    best.hy = best.state === 1 ? best.hy : this.L.cy;
    if (this.held === best) this.held = null;
    this.hoverBin = null;
    this.resolveSort(best, bin);
  }

  private hitItem(x: number, y: number): Item | null {
    let best: Item | null = null;
    for (const it of this.items) {
      if (it.state !== 0) continue;
      const dx = Math.abs(x - it.x);
      const dy = Math.abs(y - (this.L.cy + Math.sin(it.bob) * 3));
      if (dx <= it.r * 1.6 && dy <= it.r * 1.9) {
        if (!best || it.x > best.x) best = it;
      }
    }
    return best;
  }

  private binAt(x: number, y: number): BinId | null {
    if (y < this.L.binTop - 22) return null;
    let best: BinRect | null = null;
    let bd = Infinity;
    for (const b of this.L.bins) {
      const d = Math.abs(x - b.cx);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best && bd < best.w * 0.85 ? best.id : null;
  }

  private orbY(o: Orb) {
    return this.L.cy - this.L.itemR * 0.15 + Math.sin(o.t * 3.2) * 6;
  }

  private collectPower(o: Orb) {
    const meta = POWER_META[o.power];
    switch (o.power) {
      case "boost":
        this.boostT = TUNING.boostDuration;
        break;
      case "freeze":
        this.freezeT = TUNING.freezeDuration;
        break;
      case "magnet":
        this.magnetT =
          TUNING.magnetDuration +
          this.profile.upgrades.ecoMagnet * TUNING.magnetPerLevel;
        this.magnetTick = 0.15;
        break;
      case "heart":
        this.lives = Math.min(TUNING.maxLives, this.lives + 1);
        break;
    }
    this.burst(o.x, this.orbY(o), meta.color, 26, 320);
    this.float(o.x, this.orbY(o) - 22, meta.label, meta.color, 20);
    this.flashWith(meta.color, 0.3);
    this.ring = 1;
    if (o.power === "heart") sfx.heart();
    else sfx.power();
    this.banner(meta.label, meta.sub, o.power === "freeze" ? "cool" : "good");
    this.syncHud(true);
  }

  // ------------------------------------------------------------------- fx

  private burst(x: number, y: number, color: string, n: number, sp: number) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(sp * 0.3, sp);
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - sp * 0.25,
        life: rand(0.32, 0.72),
        max: 0.72,
        size: rand(2, 5.5),
        color,
        square: Math.random() < 0.4,
        g: 620,
      });
    }
  }

  private float(
    x: number,
    y: number,
    text: string,
    color: string,
    size: number,
    mono = false,
  ) {
    this.floats.push({
      x,
      y,
      vy: -58,
      life: 0.95,
      max: 0.95,
      text,
      color,
      size,
      mono,
    });
  }

  private flashWith(color: string, amount: number) {
    this.flashColor = color;
    this.flash = Math.max(this.flash, amount);
  }

  private shakeBy(mag: number) {
    this.shake = Math.max(this.shake, mag);
    this.shakeSeed = Math.random() * 100;
  }

  private banner(title: string, sub: string, tone: BannerData["tone"]) {
    this.hooks.onBanner({ id: this.bannerId++, title, sub, tone });
  }

  private syncHud(force: boolean) {
    const hud: HudState = {
      score: this.score,
      combo: this.combo,
      multiplier: this.multiplier(),
      lives: Math.max(0, this.lives),
      maxLives: TUNING.maxLives,
      stage: this.stage + 1,
      stageName: STAGES[this.stage].name,
      slowCharges: this.slowCharges,
      boost: this.boostT,
      freeze: this.freezeT,
      magnet: this.magnetT,
    };
    const prev = this.lastHud;
    if (
      !force &&
      prev &&
      prev.score === hud.score &&
      prev.combo === hud.combo &&
      prev.lives === hud.lives &&
      prev.stage === hud.stage &&
      prev.slowCharges === hud.slowCharges &&
      Math.ceil(prev.boost) === Math.ceil(hud.boost) &&
      Math.ceil(prev.freeze) === Math.ceil(hud.freeze) &&
      Math.ceil(prev.magnet) === Math.ceil(hud.magnet)
    ) {
      return;
    }
    this.lastHud = hud;
    this.hooks.onHud(hud);
  }

  /** Continuous values the HUD paints without a React render. */
  readMeters() {
    const window =
      TUNING.comboWindow +
      this.profile.upgrades.comboTime * TUNING.comboWindowPerLevel;
    const nextAt = STAGE_AT[this.stage + 1];
    const from = STAGE_AT[this.stage];
    const stageP =
      nextAt === undefined ? 1 : clamp((this.t - from) / (nextAt - from), 0, 1);
    return {
      combo: this.combo > 0 ? clamp(this.comboT / window, 0, 1) : 0,
      stage: stageP,
    };
  }

  // --------------------------------------------------------------- render

  private makeLayer(w: number, h: number) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * this.dpr));
    c.height = Math.max(1, Math.round(h * this.dpr));
    const cx = c.getContext("2d")!;
    cx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    return { c, cx };
  }

  private beltRadius() {
    return Math.min(18, this.L.beltH * 0.2);
  }

  /** Background, glows, belt shadow and under-glow — everything that never moves. */
  private buildScene() {
    const L = this.L;
    const { c, cx } = this.makeLayer(L.w, L.h);

    const g = cx.createLinearGradient(0, 0, 0, L.h);
    g.addColorStop(0, "#F8FCFD");
    g.addColorStop(0.55, "#EDF5F8");
    g.addColorStop(1, "#E2EEF2");
    cx.fillStyle = g;
    cx.fillRect(0, 0, L.w, L.h);

    cx.save();
    cx.globalAlpha = 0.5;
    const g1 = cx.createRadialGradient(
      L.w * 0.2,
      L.beltTop * 0.4,
      0,
      L.w * 0.2,
      L.beltTop * 0.4,
      Math.max(120, L.w * 0.45),
    );
    g1.addColorStop(0, "rgba(34,224,161,0.35)");
    g1.addColorStop(1, "rgba(34,224,161,0)");
    cx.fillStyle = g1;
    cx.fillRect(0, 0, L.w, L.h);
    const g2 = cx.createRadialGradient(
      L.w * 0.85,
      L.beltTop,
      0,
      L.w * 0.85,
      L.beltTop,
      Math.max(120, L.w * 0.4),
    );
    g2.addColorStop(0, "rgba(37,201,232,0.32)");
    g2.addColorStop(1, "rgba(37,201,232,0)");
    cx.fillStyle = g2;
    cx.fillRect(0, 0, L.w, L.h);
    cx.restore();

    cx.save();
    cx.globalAlpha = 0.3;
    cx.strokeStyle = C.line;
    cx.lineWidth = 1;
    cx.beginPath();
    for (let x = -46; x < L.w + 46; x += 46) {
      cx.moveTo(x, 0);
      cx.lineTo(x - 26, Math.max(0, L.beltTop - 14));
    }
    cx.stroke();
    cx.restore();

    const rad = this.beltRadius();
    cx.save();
    cx.shadowColor = "rgba(8,22,31,0.3)";
    cx.shadowBlur = 26;
    cx.shadowOffsetY = 14;
    rr(cx, -4, L.beltTop, L.w + 8, L.beltH, rad);
    cx.fillStyle = C.belt;
    cx.fill();
    cx.restore();

    const ug = cx.createLinearGradient(
      0,
      L.beltTop + L.beltH,
      0,
      L.beltTop + L.beltH + 22,
    );
    ug.addColorStop(0, "rgba(34,224,161,0.5)");
    ug.addColorStop(1, "rgba(34,224,161,0)");
    cx.fillStyle = ug;
    cx.fillRect(0, L.beltTop + L.beltH, L.w, 22);

    this.scene = c;
  }

  private buildBeltLayers() {
    const L = this.L;
    const w = L.w + 8;
    const h = L.beltH;
    const rad = this.beltRadius();

    {
      const { c, cx } = this.makeLayer(w, h);
      rr(cx, 0, 0, w, h, rad);
      cx.clip();
      const g = cx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, C.beltHi);
      g.addColorStop(0.45, C.belt);
      g.addColorStop(1, "#0A1420");
      cx.fillStyle = g;
      cx.fillRect(0, 0, w, h);
      this.beltBack = c;
    }

    {
      const { c, cx } = this.makeLayer(w, h);
      cx.save();
      rr(cx, 0, 0, w, h, rad);
      cx.clip();
      cx.translate(4, 0);

      const bonus =
        this.profile.upgrades.sortingPower * TUNING.forgivenessPerLevel;
      const p1 = (TUNING.perfectAt + bonus) * L.beltEnd;
      const p2 = (TUNING.greatAt + bonus) * L.beltEnd;
      const strip = Math.max(5, h * 0.055);
      const zone = (x0: number, x1: number, color: string) => {
        cx.fillStyle = `rgba(${color},0.07)`;
        cx.fillRect(x0, 0, x1 - x0, h);
        cx.fillStyle = `rgba(${color},0.95)`;
        cx.fillRect(x0, h - strip, x1 - x0, strip);
        const zg = cx.createLinearGradient(0, h - strip * 3.4, 0, h - strip);
        zg.addColorStop(0, `rgba(${color},0)`);
        zg.addColorStop(1, `rgba(${color},0.3)`);
        cx.fillStyle = zg;
        cx.fillRect(x0, h - strip * 3.4, x1 - x0, strip * 2.4);
      };
      zone(-8, p1, "34,224,161");
      zone(p1, p2, "255,216,77");
      zone(p2, L.w + 8, "255,84,112");

      cx.strokeStyle = "rgba(255,255,255,0.18)";
      cx.lineWidth = 1.5;
      cx.setLineDash([5, 7]);
      for (const x of [p1, p2]) {
        cx.beginPath();
        cx.moveTo(x, 4);
        cx.lineTo(x, h - 4);
        cx.stroke();
      }
      cx.setLineDash([]);

      cx.font = `800 10px ${MONO}`;
      cx.textAlign = "left";
      cx.textBaseline = "top";
      const zoneLabel = (text: string, x: number, color: string) => {
        cx.fillStyle = hexA(color, 0.9);
        cx.fillText(text, x + 9, 8);
        cx.fillStyle = hexA(color, 0.5);
        cx.fillRect(x + 9, 21, cx.measureText(text).width, 2);
      };
      zoneLabel("PERFECT", 0, C.mint);
      zoneLabel("GREAT", p1, C.yellow);
      zoneLabel("LATE", p2, C.red);

      cx.fillStyle = "rgba(255,255,255,0.09)";
      cx.fillRect(-8, 0, w, 2);
      cx.restore();

      cx.strokeStyle = "rgba(255,255,255,0.14)";
      cx.lineWidth = 2;
      rr(cx, 1, 1, w - 2, h - 2, rad - 1);
      cx.stroke();
      this.beltFront = c;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const L = this.L;
    if (!this.scene) this.buildScene();
    if (!this.beltBack || !this.beltFront) this.buildBeltLayers();

    ctx.fillStyle = "#E6F0F4";
    ctx.fillRect(0, 0, L.w, L.h);

    ctx.save();
    if (this.shake > 0.2) {
      const s = this.shake;
      ctx.translate(
        Math.sin(this.shakeSeed + this.lastMs * 0.05) * s,
        Math.cos(this.shakeSeed + this.lastMs * 0.07) * s * 0.6,
      );
    }

    if (this.scene) ctx.drawImage(this.scene, 0, 0, L.w, L.h);
    this.drawBelt(ctx);
    this.drawChute(ctx);
    this.drawLanes(ctx);
    this.drawBins(ctx);
    this.drawBeltItems(ctx);
    this.drawOrbs(ctx);
    this.drawLooseItems(ctx);
    this.drawParticles(ctx);
    this.drawFloaters(ctx);
    ctx.restore();

    if (this.flash > 0.001) {
      ctx.globalAlpha = Math.min(0.5, this.flash);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, L.w, L.h);
      ctx.globalAlpha = 1;
    }
    if (this.phase === "playing" && (this.eventSpeed > 1.2 || this.magnetT > 0)) {
      this.drawVignette(ctx, this.eventSpeed > 1.2 ? C.yellow : "#7C9CF5");
    }
  }

  private drawBelt(ctx: CanvasRenderingContext2D) {
    const L = this.L;
    const top = L.beltTop;
    const h = L.beltH;
    const w = L.w + 8;
    if (this.beltBack) ctx.drawImage(this.beltBack, -4, top, w, h);

    ctx.save();
    rr(ctx, -4, top, w, h, this.beltRadius());
    ctx.clip();
    const gapT = 26;
    const off = this.beltOffset % gapT;
    ctx.fillStyle = C.beltTread;
    for (let x = -gapT + off; x < L.w + gapT; x += gapT) {
      ctx.fillRect(x, top + 6, 12, h - 12);
    }
    ctx.fillStyle = "rgba(37,201,232,0.4)";
    for (let x = -gapT + off; x < L.w + gapT; x += gapT * 3) {
      ctx.fillRect(x, top + h - 10, 12, 3);
    }
    ctx.restore();

    if (this.beltFront) ctx.drawImage(this.beltFront, -4, top, w, h);
  }

  private drawLanes(ctx: CanvasRenderingContext2D) {
    const L = this.L;
    const y0 = L.beltTop + L.beltH + 6;
    const y1 = L.binTop - 4;
    if (y1 <= y0) return;
    ctx.save();
    for (const b of L.bins) {
      const fx = this.binFx[b.id];
      const meta = BINS[b.id];
      const lit = Math.max(fx.hover, fx.glow);

      if (lit > 0.02) {
        const beam = ctx.createLinearGradient(0, y0, 0, y1);
        beam.addColorStop(0, hexA(meta.color, 0));
        beam.addColorStop(1, hexA(meta.color, 0.3 * lit));
        ctx.fillStyle = beam;
        ctx.fillRect(b.x + b.w * 0.1, y0, b.w * 0.8, y1 - y0);
      }

      ctx.strokeStyle = hexA(meta.color, 0.14 + lit * 0.7);
      ctx.lineWidth = lit > 0.02 ? 2 : 1.5;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -((this.beltOffset * 0.35) % 14);
      ctx.beginPath();
      ctx.moveTo(b.cx, y0);
      ctx.lineTo(b.cx, y1);
      ctx.stroke();
      ctx.setLineDash([]);

      // arrow head at the bin mouth
      ctx.fillStyle = hexA(meta.color, 0.28 + lit * 0.72);
      ctx.beginPath();
      ctx.moveTo(b.cx - 6, y1 - 8);
      ctx.lineTo(b.cx + 6, y1 - 8);
      ctx.lineTo(b.cx, y1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawChute(ctx: CanvasRenderingContext2D) {
    const L = this.L;
    if (this.phase !== "playing") return;
    const x = L.beltEnd;
    ctx.save();
    const g = ctx.createLinearGradient(x, 0, L.w, 0);
    g.addColorStop(0, "rgba(255,84,112,0)");
    g.addColorStop(1, "rgba(255,84,112,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(x, L.beltTop, L.chuteW, L.beltH);
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(x, L.beltTop + 2);
    ctx.lineTo(x, L.beltTop + L.beltH - 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(x + L.chuteW * 0.55, L.beltTop + L.beltH / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "rgba(255,84,112,0.95)";
    ctx.font = `700 10px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("LANDFILL", 0, 0);
    ctx.restore();
    ctx.restore();
  }

  private buildBinArt(b: BinRect, index: number) {
    const meta = BINS[b.id];
    const rad = Math.min(18, b.w * 0.18);
    const pad = 10;
    const showKey = this.L.w >= 620;

    const paint = (hot: boolean) => {
      const { c, cx } = this.makeLayer(b.w + pad * 2, b.h + pad * 2);
      cx.translate(pad, pad);
      const active = hot ? 1 : 0;

      cx.save();
      cx.shadowColor = hot ? hexA(meta.color, 0.7) : "rgba(8,22,31,0.32)";
      cx.shadowBlur = hot ? 26 : 14;
      cx.shadowOffsetY = 8;
      rr(cx, 0, 0, b.w, b.h, rad);
      const g = cx.createLinearGradient(0, 0, 0, b.h);
      g.addColorStop(0, mix("#1B2C3B", meta.color, active * 0.72));
      g.addColorStop(1, mix("#0A1420", meta.color, active * 0.42));
      cx.fillStyle = g;
      cx.fill();
      cx.restore();

      cx.save();
      rr(cx, 0, 0, b.w, b.h, rad);
      cx.clip();
      cx.fillStyle = meta.color;
      cx.fillRect(0, 0, b.w, 6);
      const sw = b.w * 0.62;
      const sh = Math.max(8, b.h * 0.085);
      rr(cx, (b.w - sw) / 2, 15, sw, sh, sh / 2);
      cx.fillStyle = "rgba(0,0,0,0.55)";
      cx.fill();
      cx.strokeStyle = hexA(meta.color, 0.35 + active * 0.5);
      cx.lineWidth = 1.5;
      cx.stroke();
      const spill = cx.createLinearGradient(0, 15, 0, 15 + b.h * 0.4);
      spill.addColorStop(0, hexA(meta.color, 0.22 + active * 0.3));
      spill.addColorStop(1, hexA(meta.color, 0));
      cx.fillStyle = spill;
      cx.fillRect(0, 15, b.w, b.h * 0.4);
      cx.restore();

      cx.lineWidth = 2;
      cx.strokeStyle = hexA(meta.color, 0.42 + active * 0.58);
      rr(cx, 1, 1, b.w - 2, b.h - 2, rad - 1);
      cx.stroke();

      const iconS = Math.min(b.w * 0.26, b.h * 0.26);
      cx.save();
      cx.translate(b.w / 2, b.h * 0.55);
      drawWaste(cx, meta.icon, iconS, { mono: hot ? "#FFFFFF" : meta.color });
      cx.restore();

      cx.fillStyle = "#FFFFFF";
      cx.textAlign = "center";
      cx.font = `800 ${Math.max(9, Math.min(13, b.w * 0.145))}px ${MONO}`;
      cx.textBaseline = "bottom";
      cx.fillText(meta.label, b.w / 2, b.h - 11);

      if (showKey) {
        cx.beginPath();
        cx.arc(15, 15, 9, 0, Math.PI * 2);
        cx.fillStyle = hexA(meta.color, 0.2);
        cx.fill();
        cx.strokeStyle = hexA(meta.color, 0.55);
        cx.lineWidth = 1;
        cx.stroke();
        cx.fillStyle = hexA(meta.color, 0.95);
        cx.font = `800 10px ${MONO}`;
        cx.textBaseline = "middle";
        cx.fillText(String(index + 1), 15, 15.5);
      }
      return c;
    };

    const art: [HTMLCanvasElement, HTMLCanvasElement] = [
      paint(false),
      paint(true),
    ];
    this.binArt.set(b.id, art);
    return art;
  }

  private drawBins(ctx: CanvasRenderingContext2D) {
    const L = this.L;
    const pad = 10;
    for (let i = 0; i < L.bins.length; i++) {
      const b = L.bins[i];
      const meta = BINS[b.id];
      const fx = this.binFx[b.id];
      const art = this.binArt.get(b.id) ?? this.buildBinArt(b, i);
      const sx = fx.shake > 0 ? Math.sin(fx.shake * 42) * fx.shake * 7 : 0;
      const active = Math.max(fx.hover, fx.glow);
      const lift = fx.hover * 7 + fx.glow * 5;
      const x = b.x - pad + sx;
      const y = b.y - pad - lift;
      const w = b.w + pad * 2;
      const h = b.h + pad * 2;
      const rad = Math.min(18, b.w * 0.18);

      ctx.drawImage(art[0], x, y, w, h);
      if (active > 0.01) {
        ctx.globalAlpha = active;
        ctx.drawImage(art[1], x, y, w, h);
        ctx.globalAlpha = 1;
      }

      if (fx.bad > 0) {
        ctx.save();
        ctx.translate(b.x + sx, b.y - lift);
        rr(ctx, 0, 0, b.w, b.h, rad);
        ctx.fillStyle = hexA(C.red, fx.bad * 0.55);
        ctx.fill();
        ctx.strokeStyle = hexA(C.red, fx.bad);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      if (fx.glow > 0) {
        ctx.save();
        ctx.translate(b.x + sx, b.y - lift);
        ctx.strokeStyle = hexA(meta.color, fx.glow * 0.9);
        ctx.lineWidth = 3;
        rr(ctx, -4, -4, b.w + 8, b.h + 8, rad + 4);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private itemY(it: Item) {
    return this.L.cy + Math.sin(it.bob) * 3;
  }

  private drawBeltItems(ctx: CanvasRenderingContext2D) {
    for (const it of this.items) {
      if (it.state !== 0) continue;
      this.paintItem(ctx, it, it.x, this.itemY(it), 1);
    }
  }

  private drawLooseItems(ctx: CanvasRenderingContext2D) {
    for (const it of this.items) {
      if (it.state === 0) continue;
      const grabScale = it.state === 1 ? 1.16 : it.state === 2 ? 0.86 : 0.9;
      this.paintItem(ctx, it, it.hx, it.hy, grabScale, it.state === 1);
    }
  }

  private paintItem(
    ctx: CanvasRenderingContext2D,
    it: Item,
    x: number,
    y: number,
    scale: number,
    held = false,
  ) {
    const L = this.L;
    const r = it.r * it.scale * scale;
    const near = it.state === 0 ? clamp((it.x / L.beltEnd - 0.78) / 0.22, 0, 1) : 0;

    ctx.save();
    if (it.state === 0) {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#08161F";
      ctx.beginPath();
      ctx.ellipse(x, L.beltTop + L.beltH - 10, r * 0.8, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (it.golden) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.1);
      const pulse = 0.4 + Math.sin(it.bob * 2.4) * 0.18;
      g.addColorStop(0, hexA(C.gold, pulse));
      g.addColorStop(1, hexA(C.gold, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (near > 0) {
      ctx.strokeStyle = hexA(C.red, near * (0.5 + Math.sin(it.bob * 6) * 0.3));
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.45, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (held) {
      ctx.strokeStyle = hexA(C.cyan, 0.75);
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(it.spin);
    if (held) {
      ctx.shadowColor = "rgba(8,22,31,0.3)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
    }
    drawWaste(ctx, it.kind, r, { golden: it.golden });
    ctx.restore();

    if ((it.state === 0 || it.state === 1) && x > -it.r * 0.2) {
      const label = it.golden ? `★ ${it.label}` : it.label;
      ctx.font = `700 ${Math.max(8, Math.round(r * 0.3))}px ${MONO}`;
      const tw = ctx.measureText(label).width;
      const lh = Math.max(13, r * 0.4);
      const ly = y + r * 1.05;
      const lx = clamp(x, tw / 2 + 10, this.L.w - tw / 2 - 10);
      rr(ctx, lx - tw / 2 - 7, ly, tw + 14, lh, lh / 2);
      ctx.fillStyle = it.golden ? hexA(C.gold, 0.95) : "rgba(255,255,255,0.94)";
      ctx.fill();
      ctx.strokeStyle = it.golden ? hexA("#A9700A", 0.6) : hexA(C.line, 0.9);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = it.golden ? "#5B3D00" : C.ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, lx, ly + lh / 2 + 0.5);
    }
    ctx.restore();
  }

  private drawOrbs(ctx: CanvasRenderingContext2D) {
    for (const o of this.orbs) {
      const meta = POWER_META[o.power];
      const y = this.orbY(o);
      const pulse = 1 + Math.sin(o.t * 5) * 0.06;
      const r = o.r * pulse;
      ctx.save();
      const g = ctx.createRadialGradient(o.x, y, 0, o.x, y, r * 2.4);
      g.addColorStop(0, hexA(meta.color, 0.5));
      g.addColorStop(1, hexA(meta.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(o.x, y, r * 2.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(o.x, y, r, 0, Math.PI * 2);
      const cg = ctx.createLinearGradient(0, y - r, 0, y + r);
      cg.addColorStop(0, "#FFFFFF");
      cg.addColorStop(1, hexA(meta.color, 0.35));
      ctx.fillStyle = cg;
      ctx.fill();
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(o.x, y);
      ctx.rotate(Math.sin(o.t * 2) * 0.12);
      drawPowerGlyph(ctx, o.power, r * 0.52, mix(meta.color, C.ink, 0.32));
      ctx.restore();

      ctx.fillStyle = meta.color;
      ctx.font = `700 9px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("TAP", o.x, y + r + 6);
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.parts) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.square) {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    if (this.ring > 0) {
      const L = this.L;
      const r = (1 - this.ring) * Math.max(L.w, L.h) * 0.7;
      ctx.globalAlpha = this.ring * 0.35;
      ctx.strokeStyle = C.mint;
      ctx.lineWidth = 4 * this.ring;
      ctx.beginPath();
      ctx.arc(L.w / 2, L.cy, Math.max(1, r), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  private drawFloaters(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of this.floats) {
      const p = 1 - f.life / f.max;
      const pop = p < 0.18 ? 0.7 + (p / 0.18) * 0.42 : 1.06 - p * 0.1;
      ctx.save();
      ctx.globalAlpha = clamp(f.life / (f.max * 0.5), 0, 1);
      ctx.translate(clamp(f.x, 62, this.L.w - 62), f.y);
      ctx.scale(pop, pop);
      ctx.font = `800 ${f.size}px ${f.mono ? MONO : SANS}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineJoin = "round";
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
  }

  private drawVignette(ctx: CanvasRenderingContext2D, color: string) {
    const L = this.L;
    const g = ctx.createRadialGradient(
      L.w / 2,
      L.h / 2,
      Math.min(L.w, L.h) * 0.32,
      L.w / 2,
      L.h / 2,
      Math.max(L.w, L.h) * 0.72,
    );
    g.addColorStop(0, hexA(color, 0));
    g.addColorStop(1, hexA(color, 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L.w, L.h);
  }
}

function rgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}

function mix(a: string, b: string, t: number) {
  const A = rgb(a);
  const B = rgb(b);
  const k = clamp(t, 0, 1);
  return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(
    lerp(A[1], B[1], k),
  )},${Math.round(lerp(A[2], B[2], k))})`;
}

function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a, 0, 1)})`;
}
