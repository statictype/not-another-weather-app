/**
 * Nothing in `src/api`, `src/hooks`, or `src/components` may value-import from
 * this file — type imports only, so zod stays out of the client bundle.
 * See docs/rfcs/008-zod-wire-boundaries.md.
 */

import { z } from "zod";

export const WeatherLocationSchema = z.object({
  name: z.string(),
  region: z.string(),
  country: z.string(),
  localTime: z.string(),
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
  time: z.string(),
  tempC: z.number(),
  feelsLikeC: z.number(),
  conditionText: z.string(),
  conditionCode: z.number(),
  isDay: z.boolean(),
  chanceOfRain: z.number(),
  chanceOfSnow: z.number(),
  /** Upstream's own call on whether precipitation lands, not a threshold on the chance. */
  willItRain: z.boolean(),
  willItSnow: z.boolean(),
  precipMm: z.number(),
  snowCm: z.number(),
  cloud: z.number(),
});
export type HourlyForecast = z.infer<typeof HourlyForecastSchema>;

export const ForecastDaySchema = z.object({
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
  moonIllumination: z.number(),
});
export type Astro = z.infer<typeof AstroSchema>;

export const WeatherCurrentSchema = z.object({
  location: WeatherLocationSchema,
  current: CurrentConditionsSchema,
});
export type WeatherCurrent = z.infer<typeof WeatherCurrentSchema>;

export const ALERT_SEVERITIES = ["extreme", "severe", "moderate", "minor", "unknown"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const WeatherAlertSchema = z.object({
  event: z.string(),
  headline: z.string(),
  severity: z.enum(ALERT_SEVERITIES),
  areas: z.string(),
  effective: z.string(),
  expires: z.string(),
  desc: z.string(),
  instruction: z.string(),
});
export type WeatherAlert = z.infer<typeof WeatherAlertSchema>;

export const WeatherForecastSchema = z.object({
  today: z.object({
    minC: z.number(),
    maxC: z.number(),
    chanceOfRain: z.number(),
    willItRain: z.boolean(),
    chanceOfSnow: z.number(),
    willItSnow: z.boolean(),
    totalPrecipMm: z.number(),
    totalSnowCm: z.number(),
  }),
  airQualityIndex: z.number().nullable(),
  forecast: z.array(ForecastDaySchema),
  astro: AstroSchema,
  hourly: z.array(HourlyForecastSchema),
  alerts: z.array(WeatherAlertSchema),
});
export type WeatherForecast = z.infer<typeof WeatherForecastSchema>;

export const WeatherYesterdaySchema = z.object({
  yesterday: ForecastDaySchema.nullable(),
});
export type WeatherYesterday = z.infer<typeof WeatherYesterdaySchema>;
