# SORT IT! — Recycling Conveyor Arcade

A fast-paced arcade game built with Next.js. Waste rides a conveyor belt toward
a landfill chute; drag each item into the right bin before it falls off the end.
Sort early for **PERFECT**, chain sorts for a combo multiplier, and survive five
stages of an ever-accelerating belt.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How to play

| Input | Action |
| --- | --- |
| Drag / touch-drag | Move an item from the belt into a bin |
| Tap | Collect a power-up orb |
| `1`–`5` | Sort the item closest to the chute into that bin |
| `Space` | Spend a SLOW BELT charge (needs the Conveyor Control upgrade) |
| `Esc` / `P` | Pause |

Wrong bin or a missed item costs a life and breaks the combo. Every 15 combo
awards a life back (up to five).

### Scoring

`points = base(grade) × comboMultiplier × ecoBoost`, where the grade comes from
how far along the belt the item was when you grabbed it — the belt is colour-coded
PERFECT / GREAT / LATE. Golden items add a flat +500 bonus.

### Stages

`START → SORT → RUSH → CHAOS → ECO MASTER`. Belt speed and spawn density ramp
continuously rather than in steps, and ECO MASTER keeps tightening toward a floor,
so every run eventually ends. Random events (SPEED UP, SLOW MOTION, CHAOS MODE,
BONUS WAVE, GOLDEN RECYCLABLE) fire from stage 3 onward.

### Progression

Runs award ECO POINTS, spent on four upgrades: Sorting Power, Conveyor Control,
Eco Magnet and Combo Time. Progress, high scores and the sound preference persist
in `localStorage` on the device.

> Scores and item counts shown after a run are in-game statistics only, not
> real-world environmental measurements.

## Architecture

The gameplay is canvas-first so the frame loop never re-renders React:

| Path | Role |
| --- | --- |
| `src/game/engine.ts` | Simulation, scoring, spawning, events and all canvas drawing |
| `src/game/draw.ts` | Vector art for every waste type and power-up glyph |
| `src/game/config.ts` | Palette, waste catalogue, stage table and tuning constants |
| `src/game/audio.ts` | WebAudio synth — no audio assets, unlocked on first interaction |
| `src/game/storage.ts` | `localStorage` profile load/save |
| `src/components/game/` | React shell: HUD, overlays and pointer/keyboard wiring |

React state only holds HUD values and screen phase; continuous meters (combo
timer, stage progress) are written straight to the DOM from the animation frame.
Static art — background, belt body, bin faces — is rasterised once per resize into
offscreen canvases, so a frame is mostly blits.

No dependencies beyond the Next.js starter.

## Checks

```bash
npx tsc --noEmit   # types
npm run lint       # eslint
npm run build      # production build
```
