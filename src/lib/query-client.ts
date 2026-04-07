import { QueryClient } from "@tanstack/react-query";
import { WeatherClientError } from "@/api/weather";

/**
 * Single QueryClient for the app.
 *
 * Retry policy:
 *  - 404 / 400 / 429 are user-meaningful and instant; never retry.
 *  - Network / upstream (5xx) get up to 2 retries with exponential backoff.
 *  - AbortError is never retried (it's an intentional cancellation).
 *
 * Stale time matches the proxy's edge cache TTL (10 min) so refetches
 * stay rare and the UI feels snappy.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof WeatherClientError) {
            if (
              error.kind === "not_found" ||
              error.kind === "invalid_query" ||
              error.kind === "quota_exceeded"
            ) {
              return false;
            }
          }
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      },
    },
  });
}
