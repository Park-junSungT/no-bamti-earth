export type BinId = "plastic" | "paper" | "glass" | "metal" | "general";

export type WasteKind =
  | "bottle"
  | "cup"
  | "jug"
  | "bag"
  | "news"
  | "box"
  | "mag"
  | "glassbottle"
  | "jar"
  | "can"
  | "tin"
  | "foil"
  | "apple"
  | "wrapper"
  | "foam"
  | "trash";

export type Grade = "good" | "great" | "perfect";

export type PowerId = "boost" | "freeze" | "magnet" | "heart";

export type UpgradeId =
  | "sortingPower"
  | "conveyorControl"
  | "ecoMagnet"
  | "comboTime";

export type Phase = "menu" | "playing" | "paused" | "over";

export interface WasteDef {
  kind: WasteKind;
  label: string;
  bin: BinId;
  tier: number;
}

export interface Profile {
  best: number;
  bestCombo: number;
  totalSorted: number;
  games: number;
  eco: number;
  ecoLifetime: number;
  upgrades: Record<UpgradeId, number>;
  sound: boolean;
}

export interface RunResult {
  score: number;
  bestCombo: number;
  sorted: number;
  wrong: number;
  missed: number;
  accuracy: number;
  eco: number;
  stage: number;
  duration: number;
  newBest: boolean;
}

export interface HudState {
  score: number;
  combo: number;
  multiplier: number;
  lives: number;
  maxLives: number;
  stage: number;
  stageName: string;
  slowCharges: number;
  boost: number;
  freeze: number;
  magnet: number;
}

export interface BannerData {
  id: number;
  title: string;
  sub: string;
  tone: "hot" | "cool" | "gold" | "good";
}
