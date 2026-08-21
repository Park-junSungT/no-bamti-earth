import type { Profile, UpgradeId } from "./types";

const KEY = "sort-it.profile.v1";

export const EMPTY_PROFILE: Profile = {
  best: 0,
  bestCombo: 0,
  totalSorted: 0,
  games: 0,
  eco: 0,
  ecoLifetime: 0,
  upgrades: {
    sortingPower: 0,
    conveyorControl: 0,
    ecoMagnet: 0,
    comboTime: 0,
  },
  sound: true,
};

function coerce(raw: unknown): Profile {
  const p = { ...EMPTY_PROFILE, upgrades: { ...EMPTY_PROFILE.upgrades } };
  if (!raw || typeof raw !== "object") return p;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : fallback;
  p.best = num(o.best, 0);
  p.bestCombo = num(o.bestCombo, 0);
  p.totalSorted = num(o.totalSorted, 0);
  p.games = num(o.games, 0);
  p.eco = num(o.eco, 0);
  p.ecoLifetime = num(o.ecoLifetime, 0);
  p.sound = o.sound !== false;
  const up = o.upgrades;
  if (up && typeof up === "object") {
    for (const id of Object.keys(p.upgrades) as UpgradeId[]) {
      p.upgrades[id] = Math.min(3, num((up as Record<string, unknown>)[id], 0));
    }
  }
  return p;
}

export function loadProfile(): Profile {
  if (typeof window === "undefined") return coerce(null);
  try {
    return coerce(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    return coerce(null);
  }
}

export function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable (private mode, quota) — game still plays fine */
  }
}
