/**
 * Wire types for the Oasis frontend.
 *
 * These mirror the proxy DTO at `src/worker/types.ts`. They live in their
 * own file (rather than being imported from the worker) so the frontend
 * stays cleanly buildable without pulling worker types into the app
 * tsconfig. If you change one shape, change the other — they're tiny on
 * purpose so duplication is cheap and explicit.
 */

export type WeatherErrorKind =
  | "not_found"
  | "quota_exceeded"
  | "invalid_query"
  | "upstream"
  | "network";

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

export interface WeatherResponse {
  location: {
    name: string;
    region: string;
    country: string;
    localTime: string;
    tz: string;
    lat: number;
    lon: number;
  };
  current: {
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
  };
  today: {
    minC: number;
    maxC: number;
    chanceOfRain: number;
  };
  forecast: ForecastDay[];
  yesterday: ForecastDay | null;
  astro: Astro;
}
