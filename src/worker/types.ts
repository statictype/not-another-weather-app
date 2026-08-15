export interface Env {
  ASSETS: Fetcher;
  WEATHER_API_KEY: string;
}

import type { WeatherErrorKind } from "@/lib/errors";

export type {
  AirComfort,
  AlertSeverity,
  Astro,
  CurrentConditions,
  DayPrecip,
  ForecastDay,
  HourlyForecast,
  Measure,
  MeasurePair,
  WeatherAlert,
  WeatherCurrent,
  WeatherForecast,
  WeatherLocation,
} from "@/lib/schemas";

export interface ErrorResponse {
  error: {
    kind: WeatherErrorKind;
    message: string;
  };
}
