import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { Nav } from "@/components/nav";
import { mainPadding } from "@/components/nav/contract";
import { useNavPlacement } from "@/components/nav/use-nav-placement";

const Toaster = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));
import { TooltipProvider } from "@/components/ui/tooltip";
import { WeatherResult } from "@/components/weather-result";
import { useReversibleHistory } from "@/hooks/use-reversible-history";
import { useSearchParam } from "@/hooks/use-search-param";
import { useSuggestions } from "@/hooks/use-suggestions";
import { useWeather } from "@/hooks/use-weather";
import { selectCity } from "@/lib/city-selection";
import { markVisited } from "@/lib/first-run";
import { cn } from "@/lib/utils";

export function App() {
  const [inputValue, setInputValue] = useState("");
  // Open state lives here rather than in `Nav` because the empty state's
  // "Search a city" row is a second way in, and `<main>` reads it for `inert`.
  const [isNavOpen, setNavOpen] = useState(false);

  const activeQuery = useSearchParam("city");
  const placement = useNavPlacement();

  const { history, add: addHistory, removeWithUndo, clearAllWithUndo } = useReversibleHistory();

  const suggestions = useSuggestions(inputValue);

  const query = useWeather({ query: activeQuery });

  const lastCommittedQuery = useRef<string | null>(null);
  useEffect(() => {
    if (!query.isSuccess || !query.data || query.isPlaceholderData) return;
    if (!activeQuery) return;
    if (lastCommittedQuery.current === activeQuery.toLowerCase()) return;

    lastCommittedQuery.current = activeQuery.toLowerCase();
    markVisited();
    addHistory({
      query: activeQuery,
      displayName: formatDisplayName(query.data),
    });
  }, [query.isSuccess, query.data, query.isPlaceholderData, activeQuery, addHistory]);

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
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <div
          className={cn(
            "text-foreground relative min-h-screen overflow-x-hidden",
            isNight && "night",
          )}
        >
          <div className={cn("sky", isNight && "night")} aria-hidden="true" />

          <Nav
            isOpen={isNavOpen}
            onOpen={() => setNavOpen(true)}
            onClose={() => setNavOpen(false)}
            activeQuery={activeQuery}
            settle={{
              isFetching: query.isFetching,
              isSuccess: query.isSuccess,
              isPlaceholderData: query.isPlaceholderData,
              hasError: query.error != null,
            }}
            error={query.error}
            recentItems={history}
            suggestions={suggestions.data}
            isSuggestionsLoading={suggestions.isLoading || suggestions.isPending}
            onValueChange={setInputValue}
            onRecentRemove={removeWithUndo}
            onRecentClearAll={clearAllWithUndo}
            onSelectCity={selectCity}
          />

          <div className="relative z-10 min-h-screen" style={mainPadding(placement)}>
            <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-5 py-6 sm:px-8 sm:py-8">
              <main
                className={cn(
                  "rise rise-3 flex flex-1 flex-col",
                  // The left rail leaves a short column; anything that does not
                  // fill it sits in the middle instead of at the top.
                  placement.edge === "left" && "justify-center",
                )}
                aria-live="polite"
                aria-busy={query.isFetching}
                inert={isNavOpen}
              >
                <WeatherResult
                  query={query}
                  activeQuery={activeQuery}
                  onRetry={handleRetry}
                  onSearchRequest={() => setNavOpen(true)}
                  onSelectCity={selectCity}
                />
              </main>
            </div>
          </div>

          <Suspense fallback={null}>
            <Toaster />
          </Suspense>
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}

function formatDisplayName(data: { location: { name: string; country: string } }): string {
  const { name, country } = data.location;
  return country ? `${name}, ${country}` : name;
}
