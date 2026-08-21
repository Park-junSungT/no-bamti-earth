"use client";

import { MAX_LEVEL, UPGRADES } from "@/game/config";
import type { BannerData, Profile, RunResult, UpgradeId } from "@/game/types";
import { Btn, Overlay, Panel, Stat } from "./ui";

const nf = (n: number) => n.toLocaleString("en-US");

const TONE: Record<BannerData["tone"], string> = {
  hot: "bg-[#ff5470] text-white",
  cool: "bg-[#25c9e8] text-[#06222a]",
  gold: "bg-[linear-gradient(100deg,#ffd84d,#ffb020)] text-[#4a2f00]",
  good: "bg-[#12b981] text-white",
};

export function Banner({ banner }: { banner: BannerData }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center px-4 sm:top-5">
      <div
        key={banner.id}
        className={`si-banner rounded-2xl px-5 py-2.5 text-center shadow-[0_16px_34px_-16px_rgba(8,22,31,0.7)] ${TONE[banner.tone]}`}
      >
        <div className="text-[13px] font-black tracking-[0.18em] sm:text-sm">
          {banner.title}
        </div>
        <div className="text-[9px] font-bold tracking-[0.22em] opacity-80">
          {banner.sub}
        </div>
      </div>
    </div>
  );
}

export function StartScreen({
  best,
  ready,
  onPlay,
  onUpgrades,
  onStats,
}: {
  best: number;
  ready: boolean;
  onPlay: () => void;
  onUpgrades: () => void;
  onStats: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 py-3">
      <div className="si-pop si-hero-panel pointer-events-auto max-h-full w-full max-w-[430px] overflow-y-auto rounded-[30px] border border-white/80 bg-white/78 px-6 py-7 text-center shadow-[0_34px_90px_-34px_rgba(8,22,31,0.6)] backdrop-blur-md sm:px-8">
        <span className="si-mono si-hero-badge inline-block rounded-full border border-[#bfe0d5] bg-white/90 px-3 py-1 text-[9px] font-black tracking-[0.24em] text-[#12b981]">
          RECYCLING CONVEYOR ARCADE
        </span>
        <h1 className="si-title si-hero-title mt-3 text-[62px] font-black leading-[0.84] sm:text-[80px]">
          SORT IT!
        </h1>
        <p className="mt-2 text-[11px] font-black tracking-[0.34em] text-[#4a6472]">
          ONE ITEM AT A TIME.
        </p>

        <Btn variant="primary" size="lg" onClick={onPlay} className="mt-6 w-full">
          PLAY
        </Btn>

        <div className="mt-2.5 flex gap-2">
          <Btn size="sm" className="flex-1" onClick={onUpgrades}>
            UPGRADES
          </Btn>
          <Btn size="sm" className="flex-1" onClick={onStats}>
            BEST SCORE
          </Btn>
        </div>

        <div className="si-hero-hint mt-5 space-y-1.5 text-[11px] font-medium leading-snug text-[#4a6472]">
          <p>
            Drag every item into its bin before it reaches the chute. Sort early
            for <b className="text-[#12b981]">PERFECT</b>, chain them for combos.
          </p>
          <p className="si-mono text-[10px] font-bold tracking-wider text-[#8aa1ad]">
            KEYS 1–5 SORT · SPACE SLOWS THE BELT
          </p>
        </div>

        <div className="si-mono si-hero-best mt-4 h-4 text-[11px] font-black tracking-[0.16em] text-[#08161f]">
          {ready && best > 0 ? `BEST ${nf(best)}` : ""}
        </div>
      </div>
    </div>
  );
}

export function PauseScreen({
  onResume,
  onRestart,
  onMenu,
}: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <Overlay>
      <Panel className="text-center">
        <h2 className="text-3xl font-black tracking-tight">PAUSED</h2>
        <p className="mt-1 text-[11px] font-bold tracking-[0.2em] text-[#8aa1ad]">
          THE BELT IS WAITING
        </p>
        <Btn
          variant="primary"
          size="lg"
          onClick={onResume}
          className="mt-6 w-full"
        >
          RESUME
        </Btn>
        <div className="mt-2.5 flex gap-2">
          <Btn className="flex-1" onClick={onRestart}>
            RESTART
          </Btn>
          <Btn className="flex-1" onClick={onMenu}>
            MENU
          </Btn>
        </div>
      </Panel>
    </Overlay>
  );
}

export function GameOverScreen({
  result,
  profile,
  onAgain,
  onUpgrades,
  onStats,
  onMenu,
}: {
  result: RunResult;
  profile: Profile;
  onAgain: () => void;
  onUpgrades: () => void;
  onStats: () => void;
  onMenu: () => void;
}) {
  return (
    <Overlay>
      <Panel className="text-center">
        {result.newBest && (
          <div className="si-shine si-mono mx-auto mb-3 w-fit rounded-full bg-[linear-gradient(100deg,#ffd84d,#ffb020)] px-4 py-1.5 text-[10px] font-black tracking-[0.2em] text-[#4a2f00]">
            NEW HIGH SCORE!
          </div>
        )}
        <p className="text-[10px] font-black tracking-[0.28em] text-[#8aa1ad]">
          YOUR RESULT
        </p>
        <div className="si-mono mt-1 text-[56px] font-black leading-none tracking-tight sm:text-[68px]">
          {nf(result.score)}
        </div>
        <p className="text-[10px] font-black tracking-[0.28em] text-[#8aa1ad]">
          SCORE
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Stat
            value={`x${result.bestCombo}`}
            label="BEST COMBO"
            accent="#12b981"
          />
          <Stat value={nf(result.sorted)} label="ITEMS SORTED" />
          <Stat
            value={`${Math.round(result.accuracy * 100)}%`}
            label="ACCURACY"
            accent="#25c9e8"
          />
          <Stat
            value={`+${nf(result.eco)}`}
            label="ECO POINTS"
            accent="#ffb020"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-[#cdece0] bg-[#f1fbf7] p-4 text-left">
          <p className="text-[10px] font-black tracking-[0.24em] text-[#12b981]">
            ECO IMPACT
          </p>
          {result.sorted > 0 ? (
            <>
              <p className="mt-2 text-sm font-bold leading-snug text-[#08161f]">
                {nf(result.sorted)} item{result.sorted === 1 ? "" : "s"}{" "}
                correctly sorted.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#4a6472]">
                You kept recyclable material out of the wrong waste stream — and
                reached stage {result.stage}.
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-bold leading-snug text-[#08161f]">
                Nothing reached the right bin this run.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#4a6472]">
                Every correct sort keeps material in the recycling stream. The
                belt starts slow — take the first few one at a time.
              </p>
            </>
          )}
          <p className="si-mono mt-3 text-[10px] font-black tracking-[0.14em] text-[#08161f]">
            TOTAL ITEMS SORTED: {nf(profile.totalSorted)}
          </p>
          <p className="mt-1 text-[9px] tracking-wide text-[#8aa1ad]">
            In-game statistics only, not a real-world measurement.
          </p>
        </div>

        <Btn
          variant="primary"
          size="lg"
          onClick={onAgain}
          className="mt-5 w-full"
        >
          PLAY AGAIN
        </Btn>
        <div className="mt-2.5 flex gap-2">
          <Btn size="sm" className="flex-1" onClick={onUpgrades}>
            UPGRADES
          </Btn>
          <Btn size="sm" className="flex-1" onClick={onStats}>
            BEST SCORE
          </Btn>
          <Btn size="sm" className="flex-1" onClick={onMenu}>
            MENU
          </Btn>
        </div>
      </Panel>
    </Overlay>
  );
}

export function StatsScreen({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  return (
    <Overlay>
      <Panel className="text-center">
        <h2 className="text-2xl font-black tracking-tight">BEST SCORE</h2>
        <div className="si-mono mt-3 text-[54px] font-black leading-none text-[#12b981]">
          {nf(profile.best)}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Stat value={`x${profile.bestCombo}`} label="BEST COMBO" />
          <Stat value={nf(profile.games)} label="RUNS PLAYED" />
          <Stat value={nf(profile.totalSorted)} label="TOTAL RECYCLED" />
          <Stat
            value={nf(profile.ecoLifetime)}
            label="ECO POINTS EARNED"
            accent="#ffb020"
          />
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-[#4a6472]">
          Saved on this device only. In-game statistics, not a real-world
          measurement.
        </p>
        <Btn variant="solid" onClick={onClose} className="mt-5 w-full">
          BACK
        </Btn>
      </Panel>
    </Overlay>
  );
}

export function UpgradeScreen({
  profile,
  onBuy,
  onClose,
}: {
  profile: Profile;
  onBuy: (id: UpgradeId) => void;
  onClose: () => void;
}) {
  return (
    <Overlay>
      <Panel wide>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight">UPGRADES</h2>
            <p className="text-[10px] font-black tracking-[0.2em] text-[#8aa1ad]">
              SPEND ECO POINTS
            </p>
          </div>
          <div className="si-mono rounded-2xl bg-[#08161f] px-4 py-2 text-right">
            <div className="text-[8px] font-black tracking-[0.2em] text-[#8aa1ad]">
              BALANCE
            </div>
            <div className="text-xl font-black leading-none text-[#ffc53d]">
              {nf(profile.eco)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {UPGRADES.map((u) => {
            const lvl = profile.upgrades[u.id];
            const maxed = lvl >= MAX_LEVEL;
            const cost = maxed ? 0 : u.costs[lvl];
            const afford = !maxed && profile.eco >= cost;
            return (
              <div
                key={u.id}
                className="rounded-2xl border border-[#e2ecf0] bg-white/75 p-4 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="si-mono text-[12px] font-black tracking-[0.1em]">
                    {u.name}
                  </h3>
                  <div className="flex shrink-0 gap-1 pt-1">
                    {Array.from({ length: MAX_LEVEL }, (_, i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full"
                        style={{
                          background: i < lvl ? "#12b981" : "#dbe6ea",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-[#4a6472]">
                  {u.desc}
                </p>
                <p className="si-mono mt-2 text-[10px] font-black tracking-wider text-[#12b981]">
                  {lvl > 0 ? u.effect(lvl) : "NOT INSTALLED"}
                </p>
                <Btn
                  size="sm"
                  variant={afford ? "primary" : "ghost"}
                  disabled={!afford}
                  onClick={() => onBuy(u.id)}
                  className="mt-3 w-full"
                >
                  {maxed ? "MAX LEVEL" : `UPGRADE · ${nf(cost)}`}
                </Btn>
              </div>
            );
          })}
        </div>

        <Btn variant="solid" onClick={onClose} className="mt-4 w-full">
          BACK
        </Btn>
      </Panel>
    </Overlay>
  );
}
