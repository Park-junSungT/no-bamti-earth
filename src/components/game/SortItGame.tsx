"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { sfx } from "@/game/audio";
import { MAX_LEVEL, STAGES, TUNING, UPGRADES } from "@/game/config";
import { Engine } from "@/game/engine";
import { EMPTY_PROFILE, loadProfile, saveProfile } from "@/game/storage";
import type {
  BannerData,
  HudState,
  Phase,
  Profile,
  RunResult,
  UpgradeId,
} from "@/game/types";
import Hud from "./Hud";
import {
  Banner,
  GameOverScreen,
  PauseScreen,
  StartScreen,
  StatsScreen,
  UpgradeScreen,
} from "./Overlays";

const INITIAL_HUD: HudState = {
  score: 0,
  combo: 0,
  multiplier: 1,
  lives: TUNING.startLives,
  maxLives: TUNING.maxLives,
  stage: 1,
  stageName: STAGES[0].name,
  slowCharges: 0,
  boost: 0,
  freeze: 0,
  magnet: 0,
};

type Modal = "none" | "upgrades" | "stats";

export default function SortItGame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const comboBarRef = useRef<HTMLDivElement>(null);
  const stageBarRef = useRef<HTMLDivElement>(null);
  const overRef = useRef<(r: RunResult) => void>(() => {});

  const [phase, setPhase] = useState<Phase>("menu");
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [modal, setModal] = useState<Modal>("none");
  const [ready, setReady] = useState(false);

  /* ------------------------------------------------ engine + render loop */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const stored = loadProfile();
    setProfile(stored);
    setReady(true);
    sfx.setEnabled(stored.sound);

    const engine = new Engine(
      {
        onHud: setHud,
        onBanner: setBanner,
        onOver: (r) => overRef.current(r),
      },
      stored,
    );
    engineRef.current = engine;

    const applySize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(260, Math.round(rect.width));
      const h = Math.max(220, Math.round(rect.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.resize(w, h, dpr);
    };
    applySize();

    const ro = new ResizeObserver(applySize);
    ro.observe(wrap);

    let raf = 0;
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      engine.frame(ts, ctx);
      const m = engine.readMeters();
      if (comboBarRef.current) {
        comboBarRef.current.style.transform = `scaleX(${m.combo.toFixed(3)})`;
      }
      if (stageBarRef.current) {
        stageBarRef.current.style.transform = `scaleX(${m.stage.toFixed(3)})`;
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      engineRef.current = null;
    };
  }, []);

  /* --------------------------------------------------------- run results */
  const handleOver = useCallback(
    (r: RunResult) => {
      setResult(r);
      setPhase("over");
      const next: Profile = {
        ...profile,
        best: Math.max(profile.best, r.score),
        bestCombo: Math.max(profile.bestCombo, r.bestCombo),
        totalSorted: profile.totalSorted + r.sorted,
        games: profile.games + 1,
        eco: profile.eco + r.eco,
        ecoLifetime: profile.ecoLifetime + r.eco,
      };
      saveProfile(next);
      engineRef.current?.setProfile(next);
      setProfile(next);
    },
    [profile],
  );

  useEffect(() => {
    overRef.current = handleOver;
  });

  /* -------------------------------------------------------------- actions */
  const startRun = useCallback(() => {
    sfx.unlock();
    sfx.click();
    setResult(null);
    setBanner(null);
    setModal("none");
    const engine = engineRef.current;
    if (!engine) return;
    engine.resetClock();
    engine.startRun();
    setPhase("playing");
  }, []);

  const pause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || engine.phase !== "playing") return;
    engine.pause();
    setPhase("paused");
    sfx.click();
  }, []);

  const resume = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || engine.phase !== "paused") return;
    engine.resetClock();
    engine.resume();
    setPhase("playing");
    sfx.click();
  }, []);

  const toMenu = useCallback(() => {
    engineRef.current?.toMenu();
    setPhase("menu");
    setResult(null);
    setBanner(null);
    setModal("none");
    sfx.click();
  }, []);

  const useSlow = useCallback(() => {
    engineRef.current?.useSlow();
  }, []);

  const toggleSound = useCallback(() => {
    const next: Profile = { ...profile, sound: !profile.sound };
    sfx.unlock();
    sfx.setEnabled(next.sound);
    saveProfile(next);
    engineRef.current?.setProfile(next);
    setProfile(next);
    if (next.sound) sfx.click();
  }, [profile]);

  const buy = useCallback(
    (id: UpgradeId) => {
      const lvl = profile.upgrades[id];
      const def = UPGRADES.find((u) => u.id === id);
      if (!def || lvl >= MAX_LEVEL) return;
      const cost = def.costs[lvl];
      if (profile.eco < cost) return;
      const next: Profile = {
        ...profile,
        eco: profile.eco - cost,
        upgrades: { ...profile.upgrades, [id]: lvl + 1 },
      };
      saveProfile(next);
      engineRef.current?.setProfile(next);
      setProfile(next);
      sfx.unlock();
      sfx.buy();
    },
    [profile],
  );

  const openModal = useCallback((m: Modal) => {
    sfx.click();
    setModal(m);
  }, []);

  const closeModal = useCallback(() => {
    sfx.click();
    setModal("none");
  }, []);

  /* ------------------------------------------------------------ keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (engine.phase === "playing") {
        if (e.key >= "1" && e.key <= "5") {
          engine.sortLeading(Number(e.key) - 1);
          e.preventDefault();
        } else if (e.code === "Space") {
          engine.useSlow();
          e.preventDefault();
        } else if (key === "escape" || key === "p") {
          pause();
          e.preventDefault();
        }
      } else if (engine.phase === "paused" && (key === "escape" || key === "p")) {
        resume();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pause, resume]);

  /* ------------------------------------------- pause when the tab is hidden */
  useEffect(() => {
    const onVisibility = () => {
      const engine = engineRef.current;
      if (!engine) return;
      if (document.hidden && engine.phase === "playing") {
        engine.pause();
        setPhase("paused");
      }
      engine.resetClock();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* ------------------------------------------------------ banner lifetime */
  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 1750);
    return () => window.clearTimeout(id);
  }, [banner]);

  /* -------------------------------------------------------------- pointer */
  const at = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = at(e);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    engineRef.current?.pointerDown(p.x, p.y);
  };

  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = at(e);
    engineRef.current?.pointerMove(p.x, p.y);
  };

  const onUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = at(e);
    engineRef.current?.pointerUp(p.x, p.y);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const showStart = phase === "menu" && modal === "none";
  const showPause = phase === "paused" && modal === "none";
  const showOver = phase === "over" && result !== null && modal === "none";

  return (
    <div className="si-root relative h-[100dvh] w-full overflow-hidden">
      <div className="relative mx-auto flex h-full w-full max-w-[1120px] flex-col pb-[env(safe-area-inset-bottom)]">
      <Hud
        hud={hud}
        playing={phase === "playing"}
        soundOn={profile.sound}
        comboBarRef={comboBarRef}
        stageBarRef={stageBarRef}
        onPause={pause}
        onToggleSound={toggleSound}
        onSlow={useSlow}
      />

      <div ref={wrapRef} className="relative mt-2 min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="si-surface absolute inset-0"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => engineRef.current?.cancelPointer()}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Recycling conveyor. Drag each item into the matching bin."
          role="application"
        />

        {banner && phase === "playing" && <Banner banner={banner} />}

        {showStart && (
          <StartScreen
            best={profile.best}
            ready={ready}
            onPlay={startRun}
            onUpgrades={() => openModal("upgrades")}
            onStats={() => openModal("stats")}
          />
        )}

        {showPause && (
          <PauseScreen onResume={resume} onRestart={startRun} onMenu={toMenu} />
        )}

        {showOver && result && (
          <GameOverScreen
            result={result}
            profile={profile}
            onAgain={startRun}
            onUpgrades={() => openModal("upgrades")}
            onStats={() => openModal("stats")}
            onMenu={toMenu}
          />
        )}

        {modal === "upgrades" && (
          <UpgradeScreen profile={profile} onBuy={buy} onClose={closeModal} />
        )}
        {modal === "stats" && (
          <StatsScreen profile={profile} onClose={closeModal} />
        )}
      </div>
      </div>
    </div>
  );
}
