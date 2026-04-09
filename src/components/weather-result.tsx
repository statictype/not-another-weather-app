import { WeatherClientError } from "@/api/weather";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { QuotaExceededState } from "@/components/quota-exceeded-state";
import { WeatherGrid } from "@/components/weather/grid";
import { WeatherSkeleton } from "@/components/weather-skeleton";
import type { UseWeatherResult } from "@/hooks/use-weather";

interface WeatherResultProps {
  query: UseWeatherResult;
  activeQuery: string | null;
  onRetry: () => void;
}

/**
 * State-machine container for the result area.
 *
 * Drives off the fast `current` query only. The forecast and yesterday
 * tiers fire inside `WeatherGrid` and stream in independently.
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
export function WeatherResult({ query, activeQuery, onRetry }: WeatherResultProps) {
  const { data, error, isLoading, isFetching, isPlaceholderData, source } = query;

  if (error instanceof WeatherClientError && error.kind === "quota_exceeded") {
    return <QuotaExceededState />;
  }

  if (
    error instanceof WeatherClientError &&
    (error.kind === "network" || error.kind === "upstream") &&
    !data
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

  if (isLoading) {
    return <WeatherSkeleton />;
  }

  if (data) {
    return (
      <WeatherGrid query={activeQuery} current={data} isStale={isFetching || isPlaceholderData} />
    );
  }

  return <EmptyState />;
}
