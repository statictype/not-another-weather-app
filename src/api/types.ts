/**
 * Wire types for the Oasis frontend.
 *
 * These mirror the proxy DTOs at `src/worker/types.ts`. They live in their
 * own file (rather than being imported from the worker) so the frontend
 * stays cleanly buildable without pulling worker types into the app
 * tsconfig. If you change one shape, change the other — they're tiny on
 * purpose so duplication is cheap and explicit.
 *
 * The weather pipeline is split into three independently-cacheable
 * endpoints so the hero can paint as soon as `current` lands without
 * waiting on forecast or historical data. See `docs/rfcs/001-*.md`.
 */

export interface SuggestionItem {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
}

export type { WeatherErrorKind } from "@/lib/errors";

export interface WeatherLocation {
  name: string;
  region: string;
  country: string;
  localTime: string;
  tz: string;
  lat: number;
  lon: number;
}

export interface CurrentConditions {
  tempC: number;
  feelsLikeC: number;
  conditionText: string;
  conditionCode: number;
  timeOfDay: "day" | "night";
  windKph: number;
  windDir: string;
  gustKph: number;
  humidity: number;
  pressureMb: number;
  visibilityKm: number;
  uv: number;
  cloud: number;
  dewpointC: number;
  precipMm: number;
}

export interface ForecastDay {
  date: string;
  minC: number;
  maxC: number;
  avgC: number;
  chanceOfRain: number;
  conditionText: string;
  conditionCode: number;
  isDay: boolean;
}

export interface Astro {
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  moonPhase: string;
  moonIllumination: number;
}

/** Response shape for `GET /api/weather` — fast path, LCP-critical. */
export interface WeatherCurrent {
  location: WeatherLocation;
  current: CurrentConditions;
}

/** Response shape for `GET /api/weather/forecast`. */
export interface WeatherForecast {
  today: {
    minC: number;
    maxC: number;
    chanceOfRain: number;
  };
  forecast: ForecastDay[];
  astro: Astro;
}

/** Response shape for `GET /api/weather/yesterday`. */
export interface WeatherYesterday {
  yesterday: ForecastDay | null;
}
