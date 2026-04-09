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
 * Error policy:
 *  - `not_found` and `invalid_query` are *input* errors. The SearchBar
 *    surfaces them under the input. This component keeps showing the
 *    previous successful result (if any) or the empty state.
 *  - `quota_exceeded` is a global degradation that supersedes whatever
 *    was on screen — full takeover.
 *  - `network` / `upstream` take over with a retry CTA whenever there
 *    is no prior successful data to fall back to. The URL is the
 *    source of truth for the active query, so every failed fetch is
 *    legitimately the user's intent — no silent fallback.
 */
export function WeatherResult({ query, activeQuery, onRetry }: WeatherResultProps) {
  const { data, error, isLoading, isFetching, isPlaceholderData } = query;

  if (error instanceof WeatherClientError && error.kind === "quota_exceeded") {
    return <QuotaExceededState />;
  }

  if (
    error instanceof WeatherClientError &&
    (error.kind === "network" || error.kind === "upstream") &&
    !data
  ) {
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
