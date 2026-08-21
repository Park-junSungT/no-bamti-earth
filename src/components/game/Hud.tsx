"use client";

import type { RefObject } from "react";
import type { HudState } from "@/game/types";

function Heart({ filled, warn }: { filled: boolean; warn: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-[18px] w-[18px] sm:h-5 sm:w-5 ${warn ? "si-beat" : ""}`}
      aria-hidden
    >
      <path
        d="M12 20.5 3.8 12.6a5 5 0 1 1 7.1-7l1.1 1.1 1.1-1.1a5 5 0 1 1 7.1 7Z"
        fill={filled ? "#ff5470" : "none"}
        stroke={filled ? "#ff5470" : "#c3d3db"}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="si-btn h-9 w-9 shrink-0 border-2 border-[#dbe6ea] bg-white/85 text-[#4a6472] hover:border-[#25c9e8] hover:text-[#08161f]"
    >
      {children}
    </button>
  );
}

const POWER_CHIPS = [
  { key: "boost" as const, label: "BOOST", color: "#12b981" },
  { key: "freeze" as const, label: "FREEZE", color: "#25c9e8" },
  { key: "magnet" as const, label: "MAGNET", color: "#7c9cf5" },
];

export default function Hud({
  hud,
  playing,
  soundOn,
  comboBarRef,
  stageBarRef,
  onPause,
  onToggleSound,
  onSlow,
}: {
  hud: HudState;
  playing: boolean;
  soundOn: boolean;
  comboBarRef: RefObject<HTMLDivElement | null>;
  stageBarRef: RefObject<HTMLDivElement | null>;
  onPause: () => void;
  onToggleSound: () => void;
  onSlow: () => void;
}) {
  const comboColor =
    hud.combo === 0
      ? "#b6c7d0"
      : hud.combo >= 20
        ? "#ffb020"
        : hud.combo >= 10
          ? "#12b981"
          : "#08161f";

  return (
    <header className="relative z-10 shrink-0 px-3 pt-[max(0.6rem,env(safe-area-inset-top))] sm:px-5">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9px] font-black tracking-[0.22em] text-[#8aa1ad]">
            SCORE
          </div>
          <div className="si-mono si-hud-num text-[26px] font-black leading-none tracking-tight sm:text-4xl">
            {hud.score.toLocaleString("en-US")}
          </div>
        </div>

        <div className="min-w-[86px] text-center sm:min-w-[110px]">
          <div className="text-[9px] font-black tracking-[0.22em] text-[#8aa1ad]">
            COMBO
          </div>
          <div
            key={hud.combo}
            className="si-kick si-mono si-hud-num text-[26px] font-black leading-none sm:text-4xl"
            style={{ color: comboColor }}
          >
            {hud.combo > 0 ? `x${hud.combo}` : "—"}
          </div>
          <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-[#cfdee5]">
            <div
              ref={comboBarRef}
              className="h-full w-full origin-left rounded-full"
              style={{
                transform: "scaleX(0)",
                background: "linear-gradient(90deg,#22e0a1,#25c9e8)",
              }}
            />
          </div>
          <div className="si-mono si-hud-sub mt-1 text-[9px] font-bold text-[#8aa1ad]">
            SCORE x{hud.multiplier.toFixed(1)}
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-[3px]">
            {Array.from({ length: hud.maxLives }, (_, i) => (
              <Heart
                key={i}
                filled={i < hud.lives}
                warn={playing && hud.lives === 1 && i === 0}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <IconBtn
              label={soundOn ? "Turn sound off" : "Turn sound on"}
              onClick={onToggleSound}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path
                  d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z"
                  fill="currentColor"
                />
                {soundOn ? (
                  <>
                    <path
                      d="M15.4 9a4.2 4.2 0 0 1 0 6"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d="M17.8 6.6a7.6 7.6 0 0 1 0 10.8"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </>
                ) : (
                  <path
                    d="m16 9.5 4.5 5M20.5 9.5 16 14.5"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </IconBtn>
            {playing && (
              <IconBtn label="Pause game" onClick={onPause}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    d="M9 5.5v13M15 5.5v13"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                </svg>
              </IconBtn>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="si-mono shrink-0 rounded-full bg-[#08161f] px-2.5 py-1 text-[9px] font-black tracking-[0.12em] text-white">
          STAGE {hud.stage} · {hud.stageName}
        </span>
        <div className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full bg-white/80">
          <div
            ref={stageBarRef}
            className="h-full w-full origin-left rounded-full"
            style={{
              transform: "scaleX(0)",
              background: "linear-gradient(90deg,#25c9e8,#22e0a1,#ffb020)",
            }}
          />
        </div>

        {POWER_CHIPS.map(({ key, label, color }) =>
          hud[key] > 0 ? (
            <span
              key={key}
              className="si-mono si-glow shrink-0 rounded-full px-2 py-1 text-[9px] font-black tracking-wider text-white"
              style={{ background: color }}
            >
              {label} {Math.ceil(hud[key])}s
            </span>
          ) : null,
        )}

        {playing && hud.slowCharges > 0 && (
          <button
            type="button"
            onClick={onSlow}
            className="si-btn h-7 shrink-0 border-2 border-[#25c9e8] bg-white px-3 text-[9px] text-[#08161f]"
          >
            SLOW x{hud.slowCharges}
          </button>
        )}
      </div>
    </header>
  );
}
