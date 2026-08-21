import type { WasteKind } from "./types";

export function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + k);
  ctx.lineTo(x + w, y + h - k);
  ctx.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  ctx.lineTo(x + k, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - k);
  ctx.lineTo(x, y + k);
  ctx.quadraticCurveTo(x, y, x + k, y);
  ctx.closePath();
}

interface Skin {
  a: string; // top colour
  b: string; // bottom colour
  c?: string; // accent
  d?: string; // secondary accent
  line: string;
}

const SKINS: Record<WasteKind, Skin> = {
  bottle: { a: "#E6F7FD", b: "#A9DDF0", c: "#25C9E8", d: "#FFFFFF", line: "#3D7E96" },
  cup: { a: "#FFFFFF", b: "#DFEAF1", c: "#FFD84D", d: "#25C9E8", line: "#6D8896" },
  jug: { a: "#EAF6FB", b: "#B6DDEE", c: "#2596BE", d: "#FFFFFF", line: "#3D7E96" },
  bag: { a: "#F6FBFD", b: "#CFE4EE", c: "#25C9E8", d: "#FFFFFF", line: "#7898A8" },
  news: { a: "#F6F1E4", b: "#DCD4BE", c: "#9BAEB8", d: "#FFFFFF", line: "#8C8266" },
  box: { a: "#EDCB96", b: "#C79A57", c: "#F3E7D0", d: "#A87B3E", line: "#8A6430" },
  mag: { a: "#FFFFFF", b: "#E4EDF2", c: "#FFB020", d: "#9BAEB8", line: "#7A8F9B" },
  glassbottle: { a: "#B7EDD3", b: "#4FBF8E", c: "#2F6B52", d: "#E8FBF2", line: "#2C7C5D" },
  jar: { a: "#DDF6EA", b: "#93D9BC", c: "#BAC8D3", d: "#FFFFFF", line: "#4E9B7C" },
  can: { a: "#F4F8FB", b: "#BCC9D5", c: "#25C9E8", d: "#FF5470", line: "#66798A" },
  tin: { a: "#F1F5F9", b: "#B4C3CF", c: "#FFB020", d: "#FFFFFF", line: "#66798A" },
  foil: { a: "#EDF3F7", b: "#AFC0CC", c: "#FFFFFF", d: "#8798A6", line: "#68798A" },
  apple: { a: "#FFF6E0", b: "#F1DCA4", c: "#FF5470", d: "#12B981", line: "#B99A55" },
  wrapper: { a: "#DFE8EF", b: "#93A6B4", c: "#FF5470", d: "#FFFFFF", line: "#5E7182" },
  foam: { a: "#FFFFFF", b: "#DCE7ED", c: "#EFF5F8", d: "#B9C9D3", line: "#7E93A0" },
  trash: { a: "#C6D4DD", b: "#93A6B4", c: "#FFFFFF", d: "#7E93A0", line: "#5E7182" },
};

const GOLD: Skin = {
  a: "#FFF0BE",
  b: "#FFB300",
  c: "#FFFFFF",
  d: "#E39A00",
  line: "#A9700A",
};

export interface WasteStyle {
  mono?: string;
  golden?: boolean;
}

/**
 * Draws a waste item centred on the current origin, sized to roughly a
 * 2s x 2s box. Keeps every shape on the same visual language: soft vertical
 * gradient, single dark contour, one bright highlight.
 */
export function drawWaste(
  ctx: CanvasRenderingContext2D,
  kind: WasteKind,
  s: number,
  style: WasteStyle = {},
) {
  const skin = style.golden ? GOLD : SKINS[kind];
  const mono = style.mono;
  const lw = Math.max(1.4, s * 0.085);

  const grad = (top: number, bottom: number, a: string, b: string) => {
    if (mono) return mono;
    const g = ctx.createLinearGradient(0, top * s, 0, bottom * s);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    return g;
  };

  // paint: fill the current path with the body gradient + contour
  const body = () => {
    ctx.fillStyle = grad(-1, 1, skin.a, skin.b);
    ctx.fill();
    if (!mono) {
      ctx.strokeStyle = skin.line;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  };
  const flat = (color: string) => {
    ctx.fillStyle = mono ?? color;
    ctx.fill();
  };

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  switch (kind) {
    case "bottle": {
      rr(ctx, -0.2 * s, -0.92 * s, 0.4 * s, 0.3 * s, 0.09 * s);
      flat(skin.c!);
      ctx.beginPath();
      ctx.moveTo(-0.15 * s, -0.66 * s);
      ctx.lineTo(0.15 * s, -0.66 * s);
      ctx.lineTo(0.4 * s, -0.28 * s);
      ctx.lineTo(0.4 * s, 0.72 * s);
      ctx.quadraticCurveTo(0.4 * s, 0.92 * s, 0.2 * s, 0.92 * s);
      ctx.lineTo(-0.2 * s, 0.92 * s);
      ctx.quadraticCurveTo(-0.4 * s, 0.92 * s, -0.4 * s, 0.72 * s);
      ctx.lineTo(-0.4 * s, -0.28 * s);
      ctx.closePath();
      body();
      rr(ctx, -0.4 * s, 0.06 * s, 0.8 * s, 0.4 * s, 0.04 * s);
      flat(skin.d!);
      if (!mono) {
        rr(ctx, -0.28 * s, 0.14 * s, 0.3 * s, 0.06 * s, 0.03 * s);
        ctx.fillStyle = skin.c!;
        ctx.fill();
      }
      break;
    }
    case "cup": {
      ctx.beginPath();
      ctx.moveTo(-0.46 * s, -0.5 * s);
      ctx.lineTo(0.46 * s, -0.5 * s);
      ctx.lineTo(0.3 * s, 0.66 * s);
      ctx.quadraticCurveTo(0.3 * s, 0.78 * s, 0.16 * s, 0.78 * s);
      ctx.lineTo(-0.16 * s, 0.78 * s);
      ctx.quadraticCurveTo(-0.3 * s, 0.78 * s, -0.3 * s, 0.66 * s);
      ctx.closePath();
      body();
      rr(ctx, -0.55 * s, -0.72 * s, 1.1 * s, 0.24 * s, 0.09 * s);
      flat(skin.c!);
      if (!mono) {
        ctx.fillStyle = skin.d!;
        rr(ctx, -0.3 * s, -0.16 * s, 0.6 * s, 0.1 * s, 0.05 * s);
        ctx.fill();
      }
      break;
    }
    case "jug": {
      rr(ctx, 0.06 * s, -0.94 * s, 0.34 * s, 0.34 * s, 0.08 * s);
      flat(skin.c!);
      ctx.beginPath();
      ctx.moveTo(-0.48 * s, -0.34 * s);
      ctx.quadraticCurveTo(-0.48 * s, -0.62 * s, -0.2 * s, -0.64 * s);
      ctx.lineTo(0.14 * s, -0.7 * s);
      ctx.lineTo(0.34 * s, -0.62 * s);
      ctx.quadraticCurveTo(0.48 * s, -0.5 * s, 0.48 * s, -0.24 * s);
      ctx.lineTo(0.48 * s, 0.7 * s);
      ctx.quadraticCurveTo(0.48 * s, 0.9 * s, 0.28 * s, 0.9 * s);
      ctx.lineTo(-0.28 * s, 0.9 * s);
      ctx.quadraticCurveTo(-0.48 * s, 0.9 * s, -0.48 * s, 0.7 * s);
      ctx.closePath();
      body();
      if (!mono) {
        ctx.strokeStyle = skin.line;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(-0.32 * s, -0.34 * s);
        ctx.quadraticCurveTo(-0.06 * s, -0.28 * s, -0.32 * s, 0.02 * s);
        ctx.stroke();
        rr(ctx, -0.3 * s, 0.2 * s, 0.62 * s, 0.4 * s, 0.05 * s);
        ctx.fillStyle = skin.d!;
        ctx.fill();
      }
      break;
    }
    case "bag": {
      ctx.strokeStyle = mono ?? skin.line;
      ctx.lineWidth = lw * 1.1;
      ctx.beginPath();
      ctx.arc(-0.24 * s, -0.42 * s, 0.19 * s, Math.PI * 0.98, Math.PI * 2.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0.24 * s, -0.42 * s, 0.19 * s, Math.PI * 0.98, Math.PI * 2.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.5 * s, -0.36 * s);
      ctx.lineTo(0.5 * s, -0.36 * s);
      ctx.quadraticCurveTo(0.62 * s, 0.34 * s, 0.36 * s, 0.78 * s);
      ctx.quadraticCurveTo(0.16 * s, 0.66 * s, 0 * s, 0.8 * s);
      ctx.quadraticCurveTo(-0.18 * s, 0.66 * s, -0.36 * s, 0.78 * s);
      ctx.quadraticCurveTo(-0.62 * s, 0.34 * s, -0.5 * s, -0.36 * s);
      ctx.closePath();
      body();
      if (!mono) {
        ctx.globalAlpha = 0.55;
        rr(ctx, -0.2 * s, 0.02 * s, 0.4 * s, 0.34 * s, 0.06 * s);
        ctx.fillStyle = skin.c!;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "news": {
      ctx.save();
      ctx.rotate(-0.07);
      rr(ctx, -0.66 * s, -0.5 * s, 1.32 * s, 1.0 * s, 0.05 * s);
      body();
      if (!mono) {
        ctx.fillStyle = skin.c!;
        rr(ctx, -0.56 * s, -0.4 * s, 0.5 * s, 0.16 * s, 0.03 * s);
        ctx.fill();
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 4; i++) {
          rr(ctx, -0.56 * s, (-0.14 + i * 0.15) * s, 1.1 * s, 0.05 * s, 0.02 * s);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = skin.line;
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -0.5 * s);
        ctx.lineTo(0, 0.5 * s);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "box": {
      ctx.beginPath();
      ctx.moveTo(-0.58 * s, -0.36 * s);
      ctx.lineTo(-0.34 * s, -0.72 * s);
      ctx.lineTo(0.34 * s, -0.72 * s);
      ctx.lineTo(0.58 * s, -0.36 * s);
      ctx.closePath();
      flat(skin.a);
      if (!mono) {
        ctx.strokeStyle = skin.line;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
      rr(ctx, -0.58 * s, -0.36 * s, 1.16 * s, 1.14 * s, 0.06 * s);
      body();
      if (!mono) {
        ctx.fillStyle = skin.c!;
        rr(ctx, -0.09 * s, -0.36 * s, 0.18 * s, 1.14 * s, 0.02 * s);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = skin.d!;
        rr(ctx, -0.44 * s, 0.16 * s, 0.28 * s, 0.28 * s, 0.04 * s);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "mag": {
      ctx.save();
      ctx.rotate(0.06);
      rr(ctx, -0.46 * s, -0.74 * s, 0.92 * s, 1.48 * s, 0.05 * s);
      body();
      if (!mono) {
        ctx.fillStyle = skin.c!;
        rr(ctx, -0.46 * s, -0.74 * s, 0.92 * s, 0.42 * s, 0.05 * s);
        ctx.fill();
        ctx.fillStyle = skin.d!;
        ctx.globalAlpha = 0.65;
        for (let i = 0; i < 4; i++) {
          rr(ctx, -0.34 * s, (-0.16 + i * 0.2) * s, 0.68 * s, 0.07 * s, 0.03 * s);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "glassbottle": {
      rr(ctx, -0.16 * s, -0.98 * s, 0.32 * s, 0.22 * s, 0.05 * s);
      flat(skin.c!);
      ctx.beginPath();
      ctx.moveTo(-0.12 * s, -0.78 * s);
      ctx.lineTo(0.12 * s, -0.78 * s);
      ctx.lineTo(0.12 * s, -0.34 * s);
      ctx.quadraticCurveTo(0.38 * s, -0.16 * s, 0.38 * s, 0.24 * s);
      ctx.lineTo(0.38 * s, 0.74 * s);
      ctx.quadraticCurveTo(0.38 * s, 0.94 * s, 0.18 * s, 0.94 * s);
      ctx.lineTo(-0.18 * s, 0.94 * s);
      ctx.quadraticCurveTo(-0.38 * s, 0.94 * s, -0.38 * s, 0.74 * s);
      ctx.lineTo(-0.38 * s, 0.24 * s);
      ctx.quadraticCurveTo(-0.38 * s, -0.16 * s, -0.12 * s, -0.34 * s);
      ctx.closePath();
      body();
      if (!mono) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = skin.d!;
        rr(ctx, -0.28 * s, 0.06 * s, 0.1 * s, 0.62 * s, 0.05 * s);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "jar": {
      rr(ctx, -0.44 * s, -0.82 * s, 0.88 * s, 0.28 * s, 0.08 * s);
      flat(skin.c!);
      rr(ctx, -0.4 * s, -0.56 * s, 0.8 * s, 1.44 * s, 0.14 * s);
      body();
      if (!mono) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = skin.d!;
        rr(ctx, -0.28 * s, -0.36 * s, 0.1 * s, 1.0 * s, 0.05 * s);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "can": {
      rr(ctx, -0.38 * s, -0.86 * s, 0.76 * s, 1.72 * s, 0.12 * s);
      body();
      if (!mono) {
        ctx.fillStyle = skin.c!;
        rr(ctx, -0.38 * s, -0.24 * s, 0.76 * s, 0.4 * s, 0.03 * s);
        ctx.fill();
        ctx.fillStyle = skin.d!;
        rr(ctx, -0.38 * s, 0.2 * s, 0.76 * s, 0.12 * s, 0.02 * s);
        ctx.fill();
        ctx.strokeStyle = skin.line;
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        ctx.ellipse(0, -0.8 * s, 0.32 * s, 0.11 * s, 0, 0, Math.PI * 2);
        ctx.fillStyle = skin.a;
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0.05 * s, -0.8 * s, 0.13 * s, 0.05 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "tin": {
      rr(ctx, -0.46 * s, -0.6 * s, 0.92 * s, 1.28 * s, 0.1 * s);
      body();
      if (!mono) {
        ctx.fillStyle = skin.c!;
        rr(ctx, -0.46 * s, -0.16 * s, 0.92 * s, 0.44 * s, 0.03 * s);
        ctx.fill();
        ctx.fillStyle = skin.d!;
        ctx.globalAlpha = 0.8;
        rr(ctx, -0.3 * s, -0.02 * s, 0.6 * s, 0.16 * s, 0.03 * s);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = skin.line;
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        ctx.ellipse(0, -0.56 * s, 0.4 * s, 0.13 * s, 0, 0, Math.PI * 2);
        ctx.fillStyle = skin.a;
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case "foil": {
      const pts = [0.86, 0.62, 0.92, 0.7, 0.88, 0.6, 0.94, 0.66, 0.8, 0.72];
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const a = (i / pts.length) * Math.PI * 2 - 0.4;
        const r = pts[i] * s;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      body();
      if (!mono) {
        ctx.strokeStyle = skin.c!;
        ctx.lineWidth = lw * 0.9;
        ctx.beginPath();
        ctx.moveTo(-0.3 * s, -0.3 * s);
        ctx.lineTo(0.06 * s, 0.02 * s);
        ctx.lineTo(-0.14 * s, 0.4 * s);
        ctx.moveTo(0.12 * s, -0.44 * s);
        ctx.lineTo(0.34 * s, 0.2 * s);
        ctx.stroke();
      }
      break;
    }
    case "apple": {
      ctx.beginPath();
      ctx.moveTo(-0.42 * s, -0.52 * s);
      ctx.quadraticCurveTo(-0.5 * s, -0.06 * s, -0.2 * s, 0.06 * s);
      ctx.quadraticCurveTo(-0.5 * s, 0.2 * s, -0.4 * s, 0.72 * s);
      ctx.quadraticCurveTo(-0.18 * s, 0.92 * s, 0 * s, 0.72 * s);
      ctx.quadraticCurveTo(0.18 * s, 0.92 * s, 0.4 * s, 0.72 * s);
      ctx.quadraticCurveTo(0.5 * s, 0.2 * s, 0.2 * s, 0.06 * s);
      ctx.quadraticCurveTo(0.5 * s, -0.06 * s, 0.42 * s, -0.52 * s);
      ctx.quadraticCurveTo(0.18 * s, -0.72 * s, 0 * s, -0.5 * s);
      ctx.quadraticCurveTo(-0.18 * s, -0.72 * s, -0.42 * s, -0.52 * s);
      ctx.closePath();
      body();
      if (!mono) {
        ctx.strokeStyle = skin.line;
        ctx.lineWidth = lw * 1.1;
        ctx.beginPath();
        ctx.moveTo(0, -0.56 * s);
        ctx.lineTo(0.02 * s, -0.92 * s);
        ctx.stroke();
        ctx.fillStyle = skin.d!;
        ctx.beginPath();
        ctx.ellipse(0.24 * s, -0.86 * s, 0.22 * s, 0.11 * s, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = skin.c!;
        ctx.beginPath();
        ctx.arc(-0.1 * s, 0.4 * s, 0.07 * s, 0, Math.PI * 2);
        ctx.arc(0.14 * s, 0.24 * s, 0.06 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "wrapper": {
      ctx.beginPath();
      ctx.moveTo(-0.42 * s, -0.52 * s);
      ctx.lineTo(-0.62 * s, -0.72 * s);
      ctx.lineTo(-0.56 * s, -0.3 * s);
      ctx.lineTo(-0.66 * s, 0.02 * s);
      ctx.lineTo(-0.5 * s, 0.36 * s);
      ctx.lineTo(-0.6 * s, 0.72 * s);
      ctx.lineTo(-0.4 * s, 0.52 * s);
      ctx.quadraticCurveTo(0 * s, 0.86 * s, 0.4 * s, 0.52 * s);
      ctx.lineTo(0.6 * s, 0.72 * s);
      ctx.lineTo(0.5 * s, 0.36 * s);
      ctx.lineTo(0.66 * s, 0.02 * s);
      ctx.lineTo(0.56 * s, -0.3 * s);
      ctx.lineTo(0.62 * s, -0.72 * s);
      ctx.lineTo(0.42 * s, -0.52 * s);
      ctx.quadraticCurveTo(0 * s, -0.86 * s, -0.42 * s, -0.52 * s);
      ctx.closePath();
      body();
      if (!mono) {
        ctx.fillStyle = skin.c!;
        ctx.globalAlpha = 0.9;
        rr(ctx, -0.34 * s, -0.16 * s, 0.68 * s, 0.2 * s, 0.05 * s);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = skin.d!;
        rr(ctx, -0.3 * s, -0.44 * s, 0.4 * s, 0.12 * s, 0.05 * s);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "foam": {
      rr(ctx, -0.7 * s, -0.4 * s, 1.4 * s, 0.86 * s, 0.12 * s);
      body();
      if (!mono) {
        ctx.fillStyle = skin.c!;
        rr(ctx, -0.56 * s, -0.28 * s, 1.12 * s, 0.6 * s, 0.09 * s);
        ctx.fill();
        ctx.fillStyle = skin.d!;
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc((-0.4 + i * 0.2) * s, (i % 2 ? 0.06 : -0.1) * s, 0.05 * s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "trash": {
      rr(ctx, -0.6 * s, -0.86 * s, 1.2 * s, 0.24 * s, 0.09 * s);
      flat(skin.a);
      rr(ctx, -0.2 * s, -1.0 * s, 0.4 * s, 0.16 * s, 0.06 * s);
      flat(skin.a);
      ctx.beginPath();
      ctx.moveTo(-0.5 * s, -0.56 * s);
      ctx.lineTo(0.5 * s, -0.56 * s);
      ctx.lineTo(0.36 * s, 0.86 * s);
      ctx.quadraticCurveTo(0.34 * s, 0.96 * s, 0.22 * s, 0.96 * s);
      ctx.lineTo(-0.22 * s, 0.96 * s);
      ctx.quadraticCurveTo(-0.34 * s, 0.96 * s, -0.36 * s, 0.86 * s);
      ctx.closePath();
      body();
      if (!mono) {
        ctx.strokeStyle = skin.c!;
        ctx.lineWidth = lw * 1.1;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        for (const x of [-0.18, 0.02, 0.22]) {
          ctx.moveTo(x * s, -0.34 * s);
          ctx.lineTo(x * s - 0.03 * s, 0.7 * s);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      break;
    }
  }
  ctx.globalAlpha = 1;
}

/** Power-up glyphs, drawn centred, sized to a 2s box. */
export function drawPowerGlyph(
  ctx: CanvasRenderingContext2D,
  id: "boost" | "freeze" | "magnet" | "heart",
  s: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.16);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  switch (id) {
    case "boost":
      ctx.beginPath();
      ctx.moveTo(0.16 * s, -0.8 * s);
      ctx.lineTo(-0.44 * s, 0.1 * s);
      ctx.lineTo(-0.04 * s, 0.1 * s);
      ctx.lineTo(-0.16 * s, 0.8 * s);
      ctx.lineTo(0.44 * s, -0.1 * s);
      ctx.lineTo(0.04 * s, -0.1 * s);
      ctx.closePath();
      ctx.fill();
      break;
    case "freeze":
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        ctx.moveTo(-Math.cos(a) * 0.74 * s, -Math.sin(a) * 0.74 * s);
        ctx.lineTo(Math.cos(a) * 0.74 * s, Math.sin(a) * 0.74 * s);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const bx = Math.cos(a) * 0.44 * s;
        const by = Math.sin(a) * 0.44 * s;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a + 0.9) * 0.24 * s, by + Math.sin(a + 0.9) * 0.24 * s);
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a - 0.9) * 0.24 * s, by + Math.sin(a - 0.9) * 0.24 * s);
      }
      ctx.stroke();
      break;
    case "magnet":
      ctx.lineWidth = Math.max(3, s * 0.32);
      ctx.beginPath();
      ctx.arc(0, 0.06 * s, 0.5 * s, Math.PI, 0);
      ctx.stroke();
      ctx.lineWidth = Math.max(2, s * 0.16);
      ctx.beginPath();
      ctx.moveTo(-0.5 * s, 0.06 * s);
      ctx.lineTo(-0.5 * s, 0.62 * s);
      ctx.moveTo(0.5 * s, 0.06 * s);
      ctx.lineTo(0.5 * s, 0.62 * s);
      ctx.stroke();
      break;
    case "heart":
      ctx.beginPath();
      ctx.moveTo(0, 0.74 * s);
      ctx.bezierCurveTo(-1.0 * s, 0.06 * s, -0.52 * s, -0.82 * s, 0, -0.3 * s);
      ctx.bezierCurveTo(0.52 * s, -0.82 * s, 1.0 * s, 0.06 * s, 0, 0.74 * s);
      ctx.closePath();
      ctx.fill();
      break;
  }
}
