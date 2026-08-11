/**
 * Wire types for the Oasis frontend.
 *
 * DTOs are defined once in `src/lib/schemas.ts` and re-exported here
 * as type-only imports. The frontend never value-imports from schemas,
 * so zod's runtime is tree-shaken out of the client bundle — verified
 * by the build-size check in docs/rfcs/008-zod-wire-boundaries.md.
 */

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

export type { WeatherErrorKind } from "@/lib/errors";

/** Autocomplete suggestion — frontend-only, never validated at a wire boundary. */
export interface SuggestionItem {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
}
