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
  onLocationRequest: () => void;
  onRandomSelect: () => void;
  onCitySelect: (query: string) => void;
}

/** `not_found` / `invalid_query` are input errors, surfaced under the search input. */
export function WeatherResult({
  query,
  activeQuery,
  onRetry,
  onLocationRequest,
  onRandomSelect,
  onCitySelect,
}: WeatherResultProps) {
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

  return (
    <EmptyState
      onLocationRequest={onLocationRequest}
      onRandomSelect={onRandomSelect}
      onCitySelect={onCitySelect}
    />
  );
}
