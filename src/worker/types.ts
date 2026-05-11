/**
 * Wire types for the Oasis Worker.
 *
 * DTOs are defined once in `src/lib/schemas.ts` and re-exported here.
 * The worker also imports the runtime schemas directly (from
 * `weather-api.ts`) for upstream validation, but the types consumed
 * by handler signatures come from here so the frontend and worker
 * share one source of truth via `z.infer`.
 */

export interface Env {
  ASSETS: Fetcher;
  WEATHER_API_KEY: string;
}

import type { WeatherErrorKind } from "@/lib/errors";
export type { WeatherErrorKind };

export type {
  Astro,
  CurrentConditions,
  ForecastDay,
  HourlyForecast,
  WeatherCurrent,
  WeatherForecast,
  WeatherLocation,
  WeatherYesterday,
} from "@/lib/schemas";

export interface ErrorResponse {
  error: {
    kind: WeatherErrorKind;
    message: string;
  };
}
