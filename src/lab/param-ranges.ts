import type { SkyParams } from "./sky/params";

export interface Range {
  min: number;
  max: number;
  step: number;
}

const PI = Math.PI;

export const RANGES: Partial<Record<keyof SkyParams, Range>> = {
  sunElevation: { min: -1, max: 1, step: 0.005 },
  sunAzimuth: { min: -PI, max: PI, step: 0.01 },
  sunIntensity: { min: 0, max: 3, step: 0.01 },
  sunSize: { min: 0.95, max: 0.9999, step: 0.0001 },
  glowStrength: { min: 0, max: 2, step: 0.01 },
  glowPower: { min: 1, max: 80, step: 0.5 },
  moonIntensity: { min: 0, max: 2, step: 0.01 },
  moonPhase: { min: 0, max: 1, step: 0.01 },
  skyExponent: { min: 0.2, max: 2, step: 0.01 },
  hazeStrength: { min: 0, max: 1, step: 0.01 },
  hazeTightness: { min: 1, max: 30, step: 0.1 },
  starIntensity: { min: 0, max: 2, step: 0.01 },
  starDensity: { min: 0.4, max: 2.5, step: 0.01 },
  starTwinkle: { min: 0, max: 1, step: 0.01 },
  milkyWay: { min: 0, max: 1.5, step: 0.01 },
  coverage: { min: 0, max: 1, step: 0.005 },
  cloudBase: { min: 80, max: 3000, step: 10 },
  cloudTop: { min: 200, max: 6000, step: 20 },
  cloudDetail: { min: 0, max: 1, step: 0.01 },
  cloudAbsorption: { min: 0.005, max: 0.2, step: 0.001 },
  cloudDarkness: { min: 0, max: 1, step: 0.01 },
  silverLining: { min: 0, max: 2, step: 0.01 },
  cloudScale: { min: 0.3, max: 4, step: 0.01 },
  cloudSpeed: { min: 0, max: 5, step: 0.01 },
  windAngle: { min: -PI, max: PI, step: 0.01 },
  windSpeed: { min: 0, max: 45, step: 0.1 },
  rain: { min: 0, max: 1, step: 0.01 },
  rainLength: { min: 0.05, max: 1.2, step: 0.01 },
  snow: { min: 0, max: 1, step: 0.01 },
  snowSize: { min: 1, max: 8, step: 0.05 },
  lightning: { min: 0, max: 2, step: 0.01 },
  fog: { min: 0, max: 1, step: 0.01 },
  exposure: { min: 0.3, max: 2.5, step: 0.01 },
  saturation: { min: 0, max: 2, step: 0.01 },
  vignette: { min: 0, max: 1, step: 0.01 },
};

export const GROUPS: { label: string; keys: (keyof SkyParams)[] }[] = [
  {
    label: "Light",
    keys: [
      "sunElevation",
      "sunAzimuth",
      "sunColor",
      "sunIntensity",
      "sunSize",
      "glowStrength",
      "glowPower",
      "moonIntensity",
      "moonPhase",
    ],
  },
  {
    label: "Sky",
    keys: [
      "zenith",
      "horizon",
      "ground",
      "skyExponent",
      "hazeColor",
      "hazeStrength",
      "hazeTightness",
    ],
  },
  { label: "Stars", keys: ["starIntensity", "starDensity", "starTwinkle", "milkyWay"] },
  {
    label: "Clouds",
    keys: [
      "coverage",
      "cloudBase",
      "cloudTop",
      "cloudDetail",
      "cloudAbsorption",
      "cloudDarkness",
      "silverLining",
      "cloudLight",
      "cloudAmbient",
      "cloudScale",
      "cloudSpeed",
    ],
  },
  {
    label: "Weather",
    keys: [
      "windAngle",
      "windSpeed",
      "rain",
      "rainLength",
      "snow",
      "snowSize",
      "lightning",
      "flashColor",
      "fog",
      "fogColor",
    ],
  },
  { label: "Grade", keys: ["exposure", "saturation", "vignette"] },
];
