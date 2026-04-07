/**
 * Wire types for the Oasis Worker.
 *
 * The DTO returned to the frontend is intentionally minimal and decoupled
 * from WeatherAPI.com's schema. This is the only place that knows about
 * the upstream vendor; the frontend never sees their field names. Swapping
 * providers means changing the upstream client, not the wire shape.
 */

export interface Env {
  ASSETS: Fetcher;
  WEATHER_API_KEY: string;
}

/** All errors the proxy can return, as a closed discriminated union. */
export type WeatherErrorKind =
  | "not_found"
  | "quota_exceeded"
  | "invalid_query"
  | "upstream"
  | "network";

export interface ErrorResponse {
  error: {
    kind: WeatherErrorKind;
    message: string;
  };
}

export interface WeatherResponse {
  location: {
    name: string;
    region: string;
    country: string;
    /** ISO 8601 local time at the queried location. */
    localTime: string;
  };
  current: {
    tempC: number;
    feelsLikeC: number;
    conditionText: string;
    /** WeatherAPI condition code; the frontend maps this to its own icon set. */
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
