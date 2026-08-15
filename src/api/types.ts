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

export type { WeatherErrorKind } from "@/lib/errors";

export interface SuggestionItem {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
}
