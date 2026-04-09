import { useQuery } from "@tanstack/react-query";
import type { SuggestionItem } from "@/api/types";
import type { WeatherClientError } from "@/api/weather";
import { fetchSearch } from "@/api/weather";
import { useDebouncedValue } from "./use-debounced-value";

const DEBOUNCE_MS = 300;
const MIN_LENGTH = 3;

export interface UseSuggestionsResult {
  data: SuggestionItem[];
  isLoading: boolean;
}

export function useSuggestions(input: string): UseSuggestionsResult {
  const debounced = useDebouncedValue(input, DEBOUNCE_MS);
  const trimmed = debounced.trim();
  const enabled = trimmed.length >= MIN_LENGTH;

  const result = useQuery<SuggestionItem[], WeatherClientError>({
    queryKey: ["search", trimmed.toLowerCase()],
    queryFn: ({ signal }) => fetchSearch(trimmed, signal),
    enabled,
    staleTime: 60_000,
  });

  return {
    data: result.data ?? [],
    isLoading: enabled && result.isFetching,
  };
}
