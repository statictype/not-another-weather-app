import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SuggestionItem } from "@/api/types";
import { SearchBar } from "@/components/search-bar";

const Toaster = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));
import { WeatherResult } from "@/components/weather-result";
import type { HistoryItem } from "@/hooks/use-history";
import { useReversibleHistory } from "@/hooks/use-reversible-history";
import { setSearchParam, useSearchParam } from "@/hooks/use-search-param";
import { useSuggestions } from "@/hooks/use-suggestions";
import { useWeather } from "@/hooks/use-weather";
import { cn } from "@/lib/utils";
import { pickRandomCity } from "@/lib/random-cities";

export function App() {
  const [inputValue, setInputValue] = useState("");

  const activeQuery = useSearchParam("city");

  const { history, add: addHistory, removeWithUndo, clearAllWithUndo } = useReversibleHistory();

  const suggestions = useSuggestions(inputValue);

  const query = useWeather({ query: activeQuery });

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
        // ~100m, coarser than GPS noise, so repeated reads dedupe in history.
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

  const isNight = query.data?.current.timeOfDay === "night";

  // Dialog scrims, the clear-history confirmation and the toaster all portal
  // onto <body>, outside the subtree below — so they read the day cascade on a
  // night page. Mirroring the class onto <html> is what reaches them.
  useEffect(() => {
    document.documentElement.classList.toggle("night", isNight);
    return () => document.documentElement.classList.remove("night");
  }, [isNight]);

  return (
    <div
      className={cn("text-foreground relative min-h-screen overflow-x-hidden", isNight && "night")}
    >
      <div className={cn("sky", isNight && "night")} aria-hidden="true" />

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
