export interface Env {
  ASSETS: Fetcher;
  WEATHER_API_KEY: string;
}

import type { WeatherErrorKind } from "@/lib/errors";

export type {
  AlertSeverity,
  Astro,
  CurrentConditions,
  ForecastDay,
  HourlyForecast,
  WeatherAlert,
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
