import { desaturateRGB, hexToRGB, lerpRGB, type RGB, scaleRGB, type SkyParams } from "./params";

export const CONDITIONS = [
  "sunny",
  "cloudy",
  "drizzle",
  "thunderstorm",
  "snow",
  "blizzard",
] as const;
export type Condition = (typeof CONDITIONS)[number];

export const PHASES = ["dawn", "day", "dusk", "night"] as const;
export type Phase = (typeof PHASES)[number];

const DEG = Math.PI / 180;

/** Sun position, sky colours and star visibility. Weather-independent. */
interface PhaseLight {
  label: string;
  sunElevation: number;
  sunAzimuth: number;
  sunColor: RGB;
  sunIntensity: number;
  sunSize: number;
  glowStrength: number;
  glowPower: number;
  moonIntensity: number;
  zenith: RGB;
  horizon: RGB;
  ground: RGB;
  skyExponent: number;
  hazeColor: RGB;
  hazeStrength: number;
  hazeTightness: number;
  starIntensity: number;
  milkyWay: number;
  cloudLight: RGB;
  cloudAmbient: RGB;
  fogColor: RGB;
}

const PHASE_LIGHT: Record<Phase, PhaseLight> = {
  dawn: {
    label: "Dawn",
    sunElevation: 0.045,
    sunAzimuth: 62 * DEG,
    sunColor: hexToRGB("#ffb473"),
    sunIntensity: 1.15,
    sunSize: 0.985,
    glowStrength: 0.9,
    glowPower: 12,
    moonIntensity: 0.12,
    zenith: hexToRGB("#223b73"),
    horizon: hexToRGB("#f6b489"),
    ground: hexToRGB("#3f4560"),
    skyExponent: 0.55,
    hazeColor: hexToRGB("#ffb98a"),
    hazeStrength: 0.5,
    hazeTightness: 9,
    starIntensity: 0.22,
    milkyWay: 0.08,
    cloudLight: hexToRGB("#ffc196"),
    cloudAmbient: hexToRGB("#5d6a99"),
    fogColor: hexToRGB("#c9a7a0"),
  },
  day: {
    label: "Day",
    sunElevation: 0.62,
    sunAzimuth: -34 * DEG,
    sunColor: hexToRGB("#fff5e2"),
    sunIntensity: 1,
    sunSize: 0.9975,
    glowStrength: 0.42,
    glowPower: 26,
    moonIntensity: 0,
    zenith: hexToRGB("#2f6fce"),
    horizon: hexToRGB("#c3e2f6"),
    ground: hexToRGB("#93aec0"),
    skyExponent: 0.5,
    hazeColor: hexToRGB("#dcecf8"),
    hazeStrength: 0.24,
    hazeTightness: 15,
    starIntensity: 0,
    milkyWay: 0,
    cloudLight: hexToRGB("#fffaf0"),
    cloudAmbient: hexToRGB("#8fb2d8"),
    fogColor: hexToRGB("#cfe0ee"),
  },
  dusk: {
    label: "Dusk",
    sunElevation: 0.022,
    sunAzimuth: -78 * DEG,
    sunColor: hexToRGB("#ff8a4d"),
    sunIntensity: 1.25,
    sunSize: 0.9835,
    glowStrength: 1.05,
    glowPower: 9,
    moonIntensity: 0.3,
    zenith: hexToRGB("#1d2a5c"),
    horizon: hexToRGB("#ef8f63"),
    ground: hexToRGB("#33334d"),
    skyExponent: 0.48,
    hazeColor: hexToRGB("#ff9358"),
    hazeStrength: 0.56,
    hazeTightness: 8,
    starIntensity: 0.34,
    milkyWay: 0.14,
    cloudLight: hexToRGB("#ff9e63"),
    cloudAmbient: hexToRGB("#4c5586"),
    fogColor: hexToRGB("#b98878"),
  },
  night: {
    label: "Night",
    sunElevation: -0.35,
    sunAzimuth: 150 * DEG,
    sunColor: hexToRGB("#20304f"),
    sunIntensity: 0.12,
    sunSize: 0.999,
    glowStrength: 0.1,
    glowPower: 40,
    moonIntensity: 1,
    zenith: hexToRGB("#050813"),
    horizon: hexToRGB("#111c36"),
    ground: hexToRGB("#04060d"),
    skyExponent: 0.85,
    hazeColor: hexToRGB("#1a2949"),
    hazeStrength: 0.34,
    hazeTightness: 11,
    starIntensity: 1,
    milkyWay: 0.6,
    cloudLight: hexToRGB("#7f92c4"),
    cloudAmbient: hexToRGB("#10182c"),
    fogColor: hexToRGB("#131c2f"),
  },
};

/** Cloud, precipitation and atmosphere, plus how the phase light is attenuated. */
interface ConditionProfile {
  label: string;
  coverage: number;
  cloudBase: number;
  cloudTop: number;
  cloudDetail: number;
  cloudAbsorption: number;
  cloudDarkness: number;
  silverLining: number;
  cloudScale: number;
  cloudSpeed: number;
  windSpeed: number;
  rain: number;
  rainLength: number;
  snow: number;
  snowSize: number;
  lightning: number;
  fog: number;
  /** Multiplies zenith/horizon luminance. */
  skyDarken: number;
  /** Pulls sky and cloud colour toward grey. */
  desaturate: number;
  sunAttenuation: number;
  starAttenuation: number;
}

const CONDITION_PROFILE: Record<Condition, ConditionProfile> = {
  sunny: {
    label: "Sunny",
    coverage: 0.14,
    cloudBase: 700,
    cloudTop: 1350,
    cloudDetail: 0.55,
    cloudAbsorption: 0.045,
    cloudDarkness: 0.26,
    silverLining: 0.95,
    cloudScale: 1,
    cloudSpeed: 0.5,
    windSpeed: 3,
    rain: 0,
    rainLength: 0.3,
    snow: 0,
    snowSize: 3,
    lightning: 0,
    fog: 0.05,
    skyDarken: 1,
    desaturate: 0,
    sunAttenuation: 1,
    starAttenuation: 1,
  },
  cloudy: {
    label: "Cloudy",
    coverage: 0.6,
    cloudBase: 620,
    cloudTop: 1250,
    cloudDetail: 0.42,
    cloudAbsorption: 0.058,
    cloudDarkness: 0.5,
    silverLining: 0.45,
    cloudScale: 0.85,
    cloudSpeed: 0.8,
    windSpeed: 6,
    rain: 0,
    rainLength: 0.3,
    snow: 0,
    snowSize: 3,
    lightning: 0,
    fog: 0.16,
    skyDarken: 0.84,
    desaturate: 0.12,
    sunAttenuation: 0.62,
    starAttenuation: 0.55,
  },
  drizzle: {
    label: "Drizzle",
    coverage: 0.84,
    cloudBase: 430,
    cloudTop: 900,
    cloudDetail: 0.26,
    cloudAbsorption: 0.075,
    cloudDarkness: 0.62,
    silverLining: 0.22,
    cloudScale: 0.7,
    cloudSpeed: 0.7,
    windSpeed: 5,
    rain: 0.32,
    rainLength: 0.18,
    snow: 0,
    snowSize: 3,
    lightning: 0,
    fog: 0.34,
    skyDarken: 0.66,
    desaturate: 0.4,
    sunAttenuation: 0.32,
    starAttenuation: 0.2,
  },
  thunderstorm: {
    label: "Thunderstorm",
    coverage: 0.9,
    cloudBase: 380,
    cloudTop: 2600,
    cloudDetail: 0.52,
    cloudAbsorption: 0.1,
    cloudDarkness: 0.84,
    silverLining: 0.55,
    cloudScale: 1.35,
    cloudSpeed: 1.6,
    windSpeed: 16,
    rain: 0.92,
    rainLength: 0.55,
    snow: 0,
    snowSize: 3,
    lightning: 0.55,
    fog: 0.28,
    skyDarken: 0.4,
    desaturate: 0.48,
    sunAttenuation: 0.16,
    starAttenuation: 0.06,
  },
  snow: {
    label: "Snow",
    coverage: 0.78,
    cloudBase: 520,
    cloudTop: 1120,
    cloudDetail: 0.3,
    cloudAbsorption: 0.055,
    cloudDarkness: 0.4,
    silverLining: 0.3,
    cloudScale: 0.75,
    cloudSpeed: 0.6,
    windSpeed: 4.5,
    rain: 0,
    rainLength: 0.3,
    snow: 0.6,
    snowSize: 3.2,
    lightning: 0,
    fog: 0.3,
    skyDarken: 0.8,
    desaturate: 0.55,
    sunAttenuation: 0.4,
    starAttenuation: 0.3,
  },
  blizzard: {
    label: "Blizzard",
    coverage: 0.96,
    cloudBase: 300,
    cloudTop: 900,
    cloudDetail: 0.2,
    cloudAbsorption: 0.05,
    cloudDarkness: 0.32,
    silverLining: 0.12,
    cloudScale: 0.6,
    cloudSpeed: 2.4,
    windSpeed: 26,
    rain: 0,
    rainLength: 0.3,
    snow: 1,
    snowSize: 2.6,
    lightning: 0,
    fog: 0.82,
    skyDarken: 0.72,
    desaturate: 0.86,
    sunAttenuation: 0.24,
    starAttenuation: 0.05,
  },
};

export interface Variant {
  id: string;
  label: string;
  note: string;
  patch: Partial<SkyParams>;
}

/** Art-direction alternates. Applied last, so they override the composition. */
const VARIANTS: Record<Condition, Variant[]> = {
  sunny: [
    { id: "open", label: "Open", note: "sparse fair-weather cumulus, deep sky", patch: {} },
    {
      id: "hazy",
      label: "Hazy",
      note: "heavier horizon haze, softer contrast",
      patch: { coverage: 0.2, hazeStrength: 0.5, hazeTightness: 8, fog: 0.16, skyExponent: 0.6 },
    },
    {
      id: "cirrus",
      label: "Cirrus",
      note: "thin ice sheet high above, sun reads through",
      patch: {
        coverage: 0.34,
        cloudBase: 2600,
        cloudTop: 3600,
        cloudDetail: 0.72,
        cloudAbsorption: 0.014,
        cloudScale: 2.6,
        cloudSpeed: 0.35,
        silverLining: 1.2,
        cloudDarkness: 0.08,
      },
    },
  ],
  cloudy: [
    { id: "broken", label: "Broken", note: "stratocumulus with gaps of sky", patch: {} },
    {
      id: "overcast",
      label: "Overcast",
      note: "flat lid, no gaps, diffuse light",
      patch: {
        coverage: 0.94,
        cloudBase: 560,
        cloudTop: 940,
        cloudDetail: 0.18,
        cloudScale: 0.55,
        cloudDarkness: 0.55,
        silverLining: 0.16,
        fog: 0.26,
      },
    },
    {
      id: "towering",
      label: "Towering",
      note: "deep vertical build, hard light on the tops",
      patch: {
        coverage: 0.5,
        cloudBase: 650,
        cloudTop: 2600,
        cloudDetail: 0.58,
        cloudAbsorption: 0.08,
        cloudDarkness: 0.66,
        silverLining: 0.85,
        cloudScale: 1.5,
      },
    },
  ],
  drizzle: [
    { id: "mist", label: "Mist", note: "low stratus, fine drops, soft everything", patch: {} },
    {
      id: "showery",
      label: "Showery",
      note: "broken cloud, brighter gaps, heavier drops",
      patch: {
        coverage: 0.66,
        cloudTop: 1240,
        cloudDetail: 0.42,
        cloudScale: 0.95,
        rain: 0.48,
        rainLength: 0.26,
        fog: 0.2,
        silverLining: 0.5,
      },
    },
  ],
  thunderstorm: [
    { id: "anvil", label: "Anvil", note: "towering cell, dark base, frequent strikes", patch: {} },
    {
      id: "squall",
      label: "Squall",
      note: "low fast shelf, sheet flashes, driving rain",
      patch: {
        cloudBase: 300,
        cloudTop: 1500,
        cloudScale: 0.9,
        cloudSpeed: 3.2,
        windSpeed: 26,
        cloudDarkness: 0.9,
        lightning: 0.85,
        rain: 1,
        rainLength: 0.8,
        fog: 0.42,
      },
    },
    {
      id: "distant",
      label: "Distant",
      note: "cell on the horizon, glow inside the cloud, light rain",
      patch: {
        coverage: 0.62,
        cloudBase: 900,
        cloudTop: 3400,
        cloudDarkness: 0.7,
        silverLining: 0.75,
        rain: 0.28,
        lightning: 0.3,
        fog: 0.14,
      },
    },
  ],
  snow: [
    { id: "calm", label: "Calm", note: "still air, large slow flakes", patch: {} },
    {
      id: "heavy",
      label: "Heavy",
      note: "dense fall, flat grey lid",
      patch: {
        coverage: 0.92,
        cloudTop: 980,
        cloudDetail: 0.2,
        snow: 0.85,
        snowSize: 2.8,
        fog: 0.44,
        windSpeed: 8,
      },
    },
  ],
  blizzard: [
    { id: "whiteout", label: "Whiteout", note: "visibility gone, near-flat field", patch: {} },
    {
      id: "driven",
      label: "Driven",
      note: "hard horizontal wind, streaked flakes, sky still readable",
      patch: {
        fog: 0.6,
        windSpeed: 38,
        snowSize: 2.1,
        coverage: 0.88,
        cloudSpeed: 3.6,
        cloudDarkness: 0.42,
      },
    },
  ],
};

export function variantsFor(condition: Condition): Variant[] {
  return VARIANTS[condition];
}

export function conditionLabel(condition: Condition): string {
  return CONDITION_PROFILE[condition].label;
}

export function phaseLabel(phase: Phase): string {
  return PHASE_LIGHT[phase].label;
}

/**
 * Composes one state from three independent axes. The phase supplies light and
 * colour, the condition supplies weather and attenuates that light, the variant
 * overrides whatever it names.
 */
export function buildParams(condition: Condition, phase: Phase, variantId?: string): SkyParams {
  const L = PHASE_LIGHT[phase];
  const C = CONDITION_PROFILE[condition];

  const grey = (c: RGB): RGB => desaturateRGB(scaleRGB(c, C.skyDarken), C.desaturate);

  const base: SkyParams = {
    sunElevation: L.sunElevation,
    sunAzimuth: L.sunAzimuth,
    sunColor: desaturateRGB(L.sunColor, C.desaturate * 0.5),
    sunIntensity: L.sunIntensity * C.sunAttenuation,
    sunSize: L.sunSize,
    glowStrength: L.glowStrength * (0.35 + 0.65 * C.sunAttenuation),
    glowPower: L.glowPower,

    moonIntensity: L.moonIntensity * C.sunAttenuation,
    moonPhase: 0.72,

    zenith: grey(L.zenith),
    horizon: grey(L.horizon),
    ground: grey(L.ground),
    skyExponent: L.skyExponent,
    hazeColor: desaturateRGB(L.hazeColor, C.desaturate * 0.7),
    hazeStrength: L.hazeStrength,
    hazeTightness: L.hazeTightness,

    starIntensity: L.starIntensity * C.starAttenuation,
    starDensity: 1,
    starTwinkle: 1,
    milkyWay: L.milkyWay * C.starAttenuation,

    coverage: C.coverage,
    cloudBase: C.cloudBase,
    cloudTop: C.cloudTop,
    cloudDetail: C.cloudDetail,
    cloudAbsorption: C.cloudAbsorption,
    cloudDarkness: C.cloudDarkness,
    silverLining: C.silverLining,
    cloudLight: desaturateRGB(L.cloudLight, C.desaturate * 0.6),
    cloudAmbient: lerpRGB(L.cloudAmbient, grey(L.horizon), 0.35),
    cloudScale: C.cloudScale,
    cloudSpeed: C.cloudSpeed,

    windAngle: 18 * DEG,
    windSpeed: C.windSpeed,

    rain: C.rain,
    rainLength: C.rainLength,
    snow: C.snow,
    snowSize: C.snowSize,

    lightning: C.lightning,
    flashColor: hexToRGB("#cdd8ff"),

    fog: C.fog,
    fogColor: lerpRGB(L.fogColor, grey(L.horizon), 0.4),

    exposure: 1,
    saturation: 1,
    vignette: 0.2,
  };

  const variant = VARIANTS[condition].find((v) => v.id === variantId);
  if (!variant) return base;

  const patched = { ...base };
  for (const [key, value] of Object.entries(variant.patch)) {
    if (value !== undefined) {
      (patched as Record<string, unknown>)[key] = value;
    }
  }
  return patched;
}
