import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SuggestionItem } from "@/api/types";
import { SearchBar } from "@/components/search-bar";

// Toaster renders nothing until a toast fires, so deferring it is
// invisible to the user and keeps sonner out of the first-paint chunk.
const Toaster = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));
import { WeatherResult } from "@/components/weather-result";
import type { HistoryItem } from "@/hooks/use-history";
import { useReversibleHistory } from "@/hooks/use-reversible-history";
import { setSearchParam, useSearchParam } from "@/hooks/use-search-param";
import { useSuggestions } from "@/hooks/use-suggestions";
import { useWeather } from "@/hooks/use-weather";
import { pickRandomCity } from "@/lib/random-cities";

export function App() {
  // ─── Search state ────────────────────────────────────────────────────
  // The SearchBar owns its input value via `useSearchMenu`; we only mirror
  // it here so `useSuggestions` can debounce off the current text. The
  // hook fires `onValueChange` on every keystroke and on close-on-commit.
  const [inputValue, setInputValue] = useState("");
  // The URL's `?city=` param is the single source of truth for the
  // active city. The one-time bootstrap in main.tsx seeds it from
  // history on cold load, so returning users still see their last city
  // — but the URL now accurately reflects what's on screen from the
  // first paint. See docs/rfcs/007-url-driven-city.md.
  const activeQuery = useSearchParam("city");

  // ─── History + undo ──────────────────────────────────────────────────
  const { history, add: addHistory, removeWithUndo, clearAllWithUndo } = useReversibleHistory();

  // ─── City suggestions (debounced, 3+ chars) ──────────────────────────
  const suggestions = useSuggestions(inputValue);

  // ─── Fetch ───────────────────────────────────────────────────────────
  const query = useWeather({ query: activeQuery });

  // ─── Add successful fetches to history ───────────────────────────────
  // `useWeather` uses `keepPreviousData`, so on a city switch `query.data`
  // briefly points at the *previous* city's payload while the new fetch
  // is in flight. Committing during that window writes the old
  // `displayName` under the new query key. Gate on `isPlaceholderData` so
  // we only commit once the real payload for `activeQuery` has landed.
  const lastCommittedQuery = useRef<string | null>(null);
  useEffect(() => {
    if (!query.isSuccess || !query.data || query.isPlaceholderData) return;
    if (!activeQuery) return;
    if (lastCommittedQuery.current === activeQuery.toLowerCase()) return;

    lastCommittedQuery.current = activeQuery.toLowerCase();
    addHistory({
      query: activeQuery,
      displayName: formatDisplayName(query.data),
    });
  }, [query.isSuccess, query.data, query.isPlaceholderData, activeQuery, addHistory]);

  // ─── Suggestion / history selection (the only things that trigger a fetch) ──
  const handleSuggestionSelect = (item: SuggestionItem) => {
    const q = item.region
      ? `${item.name}, ${item.region}, ${item.country}`
      : `${item.name}, ${item.country}`;
    setSearchParam("city", q);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setSearchParam("city", item.query);
  };

  const handleLocationRequest = useCallback(() => {
    if (!navigator.geolocation) {
      toast("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Round to ~100m precision (3 decimals). Coarser than typical
        // GPS noise (5–10m) so repeated reads at the same spot dedupe
        // into a single history entry, but tight enough that the
        // rounded point is still inside the user's block and is
        // overwhelmingly likely to reverse-geocode to the same place.
        const lat = position.coords.latitude.toFixed(3);
        const lon = position.coords.longitude.toFixed(3);
        setSearchParam("city", `${lat},${lon}`);
      },
      () => {
        toast("Could not determine your location");
      },
    );
  }, []);

  const handleRandomSelect = useCallback(() => {
    setSearchParam("city", pickRandomCity());
  }, []);

  const handleRetry = () => {
    void query.refetch();
  };

  return (
    <div
      className={`text-foreground relative min-h-screen overflow-x-hidden${
        query.data?.current.timeOfDay === "night" ? " night" : ""
      }`}
    >
      <div
        className={`sky${query.data?.current.timeOfDay === "night" ? " night" : ""}`}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="relative z-30 mb-8 flex items-center gap-2 md:gap-6">
          <h1 className="text-5xl sm:text-7xl shrink-0 leading-none" aria-label="Weather">
            <span aria-hidden="true">😶‍🌫️</span>
          </h1>
          <div className="flex-1 min-w-0">
            <SearchBar
              recentItems={history}
              suggestions={suggestions.data}
              isSuggestionsLoading={suggestions.isLoading || suggestions.isPending}
              error={query.error}
              activeQuery={activeQuery}
              onValueChange={setInputValue}
              onSuggestionSelect={handleSuggestionSelect}
              onRecentSelect={handleHistorySelect}
              onRecentRemove={removeWithUndo}
              onRecentClearAll={clearAllWithUndo}
              onLocationRequest={handleLocationRequest}
              onRandomSelect={handleRandomSelect}
            />
          </div>
        </header>

        <main className="rise rise-3 flex-1" aria-live="polite" aria-busy={query.isFetching}>
          <WeatherResult query={query} activeQuery={activeQuery} onRetry={handleRetry} />
        </main>
      </div>

      <Suspense fallback={null}>
        <Toaster />
      </Suspense>
    </div>
  );
}

function formatDisplayName(data: { location: { name: string; country: string } }): string {
  const { name, country } = data.location;
  return country ? `${name}, ${country}` : name;
}
