/**
 * Single source of truth for the wire DTO shapes between the Oasis
 * worker and frontend.
 *
 * Both sides import types from this file via `z.infer`. The worker
 * additionally uses the runtime schemas for upstream validation; the
 * frontend only imports types, so `isolatedModules` erases the zod
 * reference at compile time and zod's runtime is tree-shaken out of
 * the client bundle.
 *
 * Hard constraint: nothing in `src/api`, `src/hooks`, or
 * `src/components` may value-import from this file. Type imports
 * only. The `no-restricted-imports` eslint rule enforces this and a
 * build-size regression test catches accidental leaks.
 *
 * See docs/rfcs/008-zod-wire-boundaries.md.
 */

import { z } from "zod";

export const WeatherLocationSchema = z.object({
  name: z.string(),
  region: z.string(),
  country: z.string(),
  /** ISO 8601 local time at the queried location. */
  localTime: z.string(),
  /** IANA timezone id, e.g. "America/Anchorage". */
  tz: z.string(),
  lat: z.number(),
  lon: z.number(),
});
export type WeatherLocation = z.infer<typeof WeatherLocationSchema>;

export const CurrentConditionsSchema = z.object({
  tempC: z.number(),
  feelsLikeC: z.number(),
  heatIndexC: z.number(),
  conditionText: z.string(),
  conditionCode: z.number(),
  timeOfDay: z.enum(["day", "night"]),
  windKph: z.number(),
  windDir: z.string(),
  gustKph: z.number(),
  humidity: z.number(),
  pressureMb: z.number(),
  visibilityKm: z.number(),
  uv: z.number(),
  cloud: z.number(),
  dewpointC: z.number(),
  precipMm: z.number(),
});
export type CurrentConditions = z.infer<typeof CurrentConditionsSchema>;

export const HourlyForecastSchema = z.object({
  /** ISO datetime string, e.g. "2026-05-09 14:00". */
  time: z.string(),
  tempC: z.number(),
  feelsLikeC: z.number(),
  conditionText: z.string(),
  conditionCode: z.number(),
  isDay: z.boolean(),
  chanceOfRain: z.number(),
  cloud: z.number(),
});
export type HourlyForecast = z.infer<typeof HourlyForecastSchema>;

export const ForecastDaySchema = z.object({
  /** ISO date (YYYY-MM-DD) at the queried location. */
  date: z.string(),
  minC: z.number(),
  maxC: z.number(),
  avgC: z.number(),
  chanceOfRain: z.number(),
  conditionText: z.string(),
  conditionCode: z.number(),
  isDay: z.boolean(),
});
export type ForecastDay = z.infer<typeof ForecastDaySchema>;

export const AstroSchema = z.object({
  sunrise: z.string(),
  sunset: z.string(),
  moonrise: z.string(),
  moonset: z.string(),
  moonPhase: z.string(),
  /** 0–100 */
  moonIllumination: z.number(),
});
export type Astro = z.infer<typeof AstroSchema>;

/** Response shape for `GET /api/weather` — fast path, LCP-critical. */
export const WeatherCurrentSchema = z.object({
  location: WeatherLocationSchema,
  current: CurrentConditionsSchema,
});
export type WeatherCurrent = z.infer<typeof WeatherCurrentSchema>;

/** Response shape for `GET /api/weather/forecast`. */
export const WeatherForecastSchema = z.object({
  today: z.object({
    minC: z.number(),
    maxC: z.number(),
    chanceOfRain: z.number(),
  }),
  /** US EPA index, 1–6. `null` when upstream omits the air-quality block. */
  airQualityIndex: z.number().nullable(),
  forecast: z.array(ForecastDaySchema),
  astro: AstroSchema,
  hourly: z.array(HourlyForecastSchema),
});
export type WeatherForecast = z.infer<typeof WeatherForecastSchema>;

/** Response shape for `GET /api/weather/yesterday`. */
export const WeatherYesterdaySchema = z.object({
  yesterday: ForecastDaySchema.nullable(),
});
export type WeatherYesterday = z.infer<typeof WeatherYesterdaySchema>;
