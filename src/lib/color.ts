export interface HSB {
  h: number;
  s: number;
  b: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hsbToRgb({ h, s, b }: HSB): RGB {
  const sat = s / 100;
  const val = b / 100;
  const c = val * sat;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp < 1) {
    r1 = c;
    g1 = x;
  } else if (hp < 2) {
    r1 = x;
    g1 = c;
  } else if (hp < 3) {
    g1 = c;
    b1 = x;
  } else if (hp < 4) {
    g1 = x;
    b1 = c;
  } else if (hp < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  const m = val - c;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function rgbToHsb({ r, g, b }: RGB): HSB {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rN) {
      h = ((gN - bN) / delta + (gN < bN ? 6 : 0)) * 60;
    } else if (max === gN) {
      h = ((bN - rN) / delta + 2) * 60;
    } else {
      h = ((rN - gN) / delta + 4) * 60;
    }
  }
  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return { h, s, b: v };
}

export function shiftHueHex(hex: string, deltaDegrees: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsb = rgbToHsb(rgb);
  const h = (((hsb.h + deltaDegrees) % 360) + 360) % 360;
  return rgbToHex(hsbToRgb({ h, s: hsb.s, b: hsb.b }));
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): RGB | null {
  let normalized = hex.trim().replace(/^#/, "");
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  const n = parseInt(normalized, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Resolve any valid CSS color string (rgb, oklab, oklch, color-mix output,
// hex, named) to sRGB by rendering a 1×1 pixel and reading it back. Chrome
// returns color-mix(in oklch, …) as oklab(…) from getComputedStyle, so a
// rgb()-only regex would miss it — canvas readback handles every format.
export function cssColorToRgb(value: string): RGB | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return { r: data[0] ?? 0, g: data[1] ?? 0, b: data[2] ?? 0 };
}
