import type { WeatherResponse } from "@/api/types";
import { WeatherClientError } from "@/api/weather";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { QuotaExceededState } from "@/components/quota-exceeded-state";
import { WeatherCard } from "@/components/weather-card";
import { WeatherSkeleton } from "@/components/weather-skeleton";
import type { UseWeatherResult } from "@/hooks/use-weather";

interface WeatherResultProps {
  query: UseWeatherResult;
  /** Last successful result, kept visible when the current query is empty. */
  fallbackData: WeatherResponse | null;
  onRetry: () => void;
}

/**
 * State-machine container for the result area.
 *
 * The asymmetric error policy lives here:
 *  - `not_found` and `invalid_query` are *input* errors. The SearchBar
 *    surfaces them under the input. This component keeps showing the
 *    previous successful result (if any) or the empty state.
 *  - `quota_exceeded` is a global degradation that supersedes whatever
 *    was on screen — full takeover.
 *  - `network` / `upstream` also take over, but only when there's no
 *    prior successful data and the source is "user". For auto-load
 *    failures we silently fall back to the empty state to avoid
 *    starting a returning user's session with an error.
 */
export function WeatherResult({ query, fallbackData, onRetry }: WeatherResultProps) {
  const { data, error, isLoading, isFetching, source } = query;
  // The "current best" view of weather: prefer fresh data, fall back to
  // the last successful result when the current query has nothing.
  const visibleData = data ?? fallbackData;

  // Quota always wins.
  if (error instanceof WeatherClientError && error.kind === "quota_exceeded") {
    return <QuotaExceededState />;
  }

  // Hard system errors take over only when there's nothing else to show.
  if (
    error instanceof WeatherClientError &&
    (error.kind === "network" || error.kind === "upstream") &&
    !visibleData
  ) {
    if (source === "auto") {
      return <EmptyState />;
    }
    return (
      <ErrorState
        title="Couldn't reach the weather service"
        description={error.message}
        onRetry={onRetry}
      />
    );
  }

  // Initial loading with no prior data.
  if (isLoading && !fallbackData) {
    return <WeatherSkeleton />;
  }

  // Success — or stale fallback while a new query loads / fails.
  if (visibleData) {
    return <WeatherCard data={visibleData} isStale={isFetching} />;
  }

  // Idle: no query active, no data, no error worth taking over for.
  return <EmptyState />;
}
