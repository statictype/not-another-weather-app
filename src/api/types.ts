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

export interface WeatherResponse {
  location: {
    name: string;
    region: string;
    country: string;
    localTime: string;
  };
  current: {
    tempC: number;
    feelsLikeC: number;
    conditionText: string;
    conditionCode: number;
    timeOfDay: "day" | "night";
    windKph: number;
    windDir: string;
    humidity: number;
  };
  today: {
    minC: number;
    maxC: number;
    chanceOfRain: number;
  };
}
