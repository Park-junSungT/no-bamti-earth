import type { BinId, UpgradeId, WasteDef, WasteKind } from "./types";

/** Eco-tech arcade palette: bright neutral base, environmental accents. */
export const C = {
  ink: "#08161F",
  ink2: "#4A6472",
  ink3: "#8AA1AD",
  surface: "#FFFFFF",
  surface2: "#EDF3F5",
  line: "#D5E2E8",
  mint: "#22E0A1",
  cyan: "#25C9E8",
  green: "#12B981",
  amber: "#FFB020",
  yellow: "#FFD84D",
  red: "#FF5470",
  gold: "#FFC53D",
  belt: "#132030",
  beltHi: "#22364B",
  beltTread: "#0C1724",
} as const;

export const BIN_ORDER: BinId[] = [
  "plastic",
  "paper",
  "glass",
  "metal",
  "general",
];

export const BINS: Record<
  BinId,
  { label: string; color: string; icon: WasteKind }
> = {
  plastic: { label: "PLASTIC", color: "#25C9E8", icon: "bottle" },
  paper: { label: "PAPER", color: "#FFB020", icon: "news" },
  glass: { label: "GLASS", color: "#22E0A1", icon: "glassbottle" },
  metal: { label: "METAL", color: "#7C9CF5", icon: "can" },
  general: { label: "GENERAL", color: "#8FA6B2", icon: "trash" },
};

/** Waste catalog. `tier` is the first stage the item can appear in. */
export const WASTE: WasteDef[] = [
  { kind: "bottle", label: "BOTTLE", bin: "plastic", tier: 1 },
  { kind: "news", label: "NEWSPAPER", bin: "paper", tier: 1 },
  { kind: "can", label: "SODA CAN", bin: "metal", tier: 1 },
  { kind: "glassbottle", label: "GLASS BOTTLE", bin: "glass", tier: 1 },
  { kind: "apple", label: "APPLE CORE", bin: "general", tier: 1 },

  { kind: "box", label: "CARDBOARD", bin: "paper", tier: 2 },
  { kind: "cup", label: "YOGURT CUP", bin: "plastic", tier: 2 },
  { kind: "jar", label: "GLASS JAR", bin: "glass", tier: 2 },
  { kind: "tin", label: "TIN CAN", bin: "metal", tier: 2 },

  { kind: "jug", label: "DETERGENT JUG", bin: "plastic", tier: 3 },
  { kind: "mag", label: "MAGAZINE", bin: "paper", tier: 3 },
  { kind: "wrapper", label: "CHIP BAG", bin: "general", tier: 3 },

  { kind: "foam", label: "FOAM TRAY", bin: "general", tier: 4 },
  { kind: "bag", label: "PLASTIC BAG", bin: "plastic", tier: 4 },
  { kind: "foil", label: "FOIL BALL", bin: "metal", tier: 5 },
];

export interface StageDef {
  name: string;
  travel: number; // seconds to cross the belt
  gap: [number, number]; // seconds between spawn groups
  tier: number;
  maxItems: number;
  patterns: Array<[Pattern, number]>;
}

export type Pattern = "single" | "pair" | "burst";

/** Stage start times in seconds. */
export const STAGE_AT = [0, 22, 48, 78, 112];

export const STAGES: StageDef[] = [
  {
    name: "START",
    travel: 6.2,
    gap: [1.9, 2.5],
    tier: 1,
    maxItems: 3,
    patterns: [["single", 1]],
  },
  {
    name: "SORT",
    travel: 5.2,
    gap: [1.5, 2.0],
    tier: 2,
    maxItems: 4,
    patterns: [
      ["single", 4],
      ["pair", 1],
    ],
  },
  {
    name: "RUSH",
    travel: 4.3,
    gap: [1.15, 1.6],
    tier: 3,
    maxItems: 5,
    patterns: [
      ["single", 3],
      ["pair", 2],
      ["burst", 1],
    ],
  },
  {
    name: "CHAOS",
    travel: 3.5,
    gap: [0.9, 1.3],
    tier: 4,
    maxItems: 6,
    patterns: [
      ["single", 2],
      ["pair", 2],
      ["burst", 2],
    ],
  },
  {
    name: "ECO MASTER",
    travel: 2.9,
    gap: [0.72, 1.05],
    tier: 5,
    maxItems: 7,
    patterns: [
      ["single", 2],
      ["pair", 2],
      ["burst", 3],
    ],
  },
];

export const TUNING = {
  startLives: 3,
  maxLives: 5,
  lifeEveryCombo: 15,
  comboWindow: 4.0,
  comboWindowPerLevel: 0.35,
  perfectAt: 0.4, // belt progress below this = PERFECT
  greatAt: 0.7,
  forgivenessPerLevel: 0.05,
  base: { good: 50, great: 100, perfect: 150 },
  goldenBonus: 500,
  goldenChance: 0.025,
  powerChance: 0.05,
  powerCooldown: [20, 34] as [number, number],
  multStep: 0.1,
  multComboCap: 40,
  eventFirstAt: 40,
  eventGap: [13, 21] as [number, number],
  slowFactor: 0.45,
  slowDuration: 3,
  boostDuration: 8,
  freezeDuration: 3.2,
  magnetDuration: 4,
  magnetPerLevel: 1.2,
} as const;

export const UPGRADES: Array<{
  id: UpgradeId;
  name: string;
  desc: string;
  effect: (lvl: number) => string;
  costs: number[];
}> = [
  {
    id: "sortingPower",
    name: "SORTING POWER",
    desc: "Wider PERFECT and GREAT timing windows.",
    effect: (l) => `+${l * 5}% timing window`,
    costs: [150, 350, 700],
  },
  {
    id: "conveyorControl",
    name: "CONVEYOR CONTROL",
    desc: "Slow the belt on demand. One charge per level.",
    effect: (l) => `${l} SLOW charge${l === 1 ? "" : "s"} per run`,
    costs: [200, 450, 900],
  },
  {
    id: "ecoMagnet",
    name: "ECO MAGNET",
    desc: "Magnet bursts last longer and show up more often.",
    effect: (l) => `+${(l * TUNING.magnetPerLevel).toFixed(1)}s magnet`,
    costs: [180, 400, 800],
  },
  {
    id: "comboTime",
    name: "COMBO TIME",
    desc: "More breathing room before a combo expires.",
    effect: (l) => `+${(l * TUNING.comboWindowPerLevel).toFixed(2)}s combo`,
    costs: [160, 380, 760],
  },
];

export const MAX_LEVEL = 3;
