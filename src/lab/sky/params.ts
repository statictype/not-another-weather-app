/**
 * Every visual property of the sky, flattened to numbers and RGB triples so any
 * two states can be interpolated component-wise. Transitions are `lerpParams`.
 */
export type RGB = readonly [number, number, number];

export interface SkyParams {
  // Key light. `sunElevation` is sin(altitude): 1 = zenith, 0 = horizon, <0 = set.
  sunElevation: number;
  sunAzimuth: number;
  sunColor: RGB;
  sunIntensity: number;
  sunSize: number;
  glowStrength: number;
  glowPower: number;

  moonIntensity: number;
  moonPhase: number;

  // Sky dome.
  zenith: RGB;
  horizon: RGB;
  ground: RGB;
  skyExponent: number;
  hazeColor: RGB;
  hazeStrength: number;
  hazeTightness: number;

  // Night sky.
  starIntensity: number;
  starDensity: number;
  starTwinkle: number;
  milkyWay: number;

  // Cloud slab.
  coverage: number;
  cloudBase: number;
  cloudTop: number;
  cloudDetail: number;
  cloudAbsorption: number;
  cloudDarkness: number;
  silverLining: number;
  cloudLight: RGB;
  cloudAmbient: RGB;
  cloudScale: number;
  cloudSpeed: number;

  // Shared wind. Drives cloud drift and precipitation slant.
  windAngle: number;
  windSpeed: number;

  // Precipitation, 0-1.
  rain: number;
  rainLength: number;
  snow: number;
  snowSize: number;

  // Strikes per second, and the colour of the flash.
  lightning: number;
  flashColor: RGB;

  // Full-frame wash toward `fogColor`.
  fog: number;
  fogColor: RGB;

  // Grade.
  exposure: number;
  saturation: number;
  vignette: number;
}

/** Keys interpolated on the shortest arc rather than linearly. */
const ANGLE_KEYS = new Set<keyof SkyParams>(["sunAzimuth", "windAngle"]);

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  const TAU = Math.PI * 2;
  const d = ((((b - a) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
  return a + d * t;
}

/** Mixes in linear light so blue-to-orange does not pass through grey. */
export function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.sqrt(lerp(a[0] * a[0], b[0] * b[0], t)),
    Math.sqrt(lerp(a[1] * a[1], b[1] * b[1], t)),
    Math.sqrt(lerp(a[2] * a[2], b[2] * b[2], t)),
  ];
}

export function lerpParams(a: SkyParams, b: SkyParams, t: number): SkyParams {
  const out = { ...a } as Record<string, unknown>;
  for (const key of Object.keys(a) as (keyof SkyParams)[]) {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") {
      out[key] = ANGLE_KEYS.has(key) ? lerpAngle(av, bv, t) : lerp(av, bv, t);
    } else if (Array.isArray(av) && Array.isArray(bv)) {
      out[key] = lerpRGB(av as RGB, bv as RGB, t);
    }
  }
  return out as unknown as SkyParams;
}

export function scaleRGB(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

export function desaturateRGB(c: RGB, amount: number): RGB {
  const l = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  return [lerp(c[0], l, amount), lerp(c[1], l, amount), lerp(c[2], l, amount)];
}

export function hexToRGB(hex: string): RGB {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex(c: RGB): string {
  const to = (v: number) =>
    Math.round(Math.min(Math.max(v, 0), 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(c[0])}${to(c[1])}${to(c[2])}`;
}
