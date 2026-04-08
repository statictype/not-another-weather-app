import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SuggestionItem, WeatherResponse } from "@/api/types";
import { SearchBar } from "@/components/search-bar";
import { Toaster } from "@/components/ui/sonner";
import { WeatherResult } from "@/components/weather-result";
import { type HistoryItem, useHistory } from "@/hooks/use-history";
import { useSuggestions } from "@/hooks/use-suggestions";
import { useUndo } from "@/hooks/use-undo";
import { useWeather, type WeatherSource } from "@/hooks/use-weather";

export function App() {
  // ─── Search state ────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [source, setSource] = useState<WeatherSource>("user");

  // ─── History + undo ──────────────────────────────────────────────────
  const {
    history,
    add: addHistory,
    remove: removeHistory,
    clear: clearHistory,
    restore,
  } = useHistory();
  const undo = useUndo<HistoryItem>(5000);

  // ─── City suggestions (debounced, 3+ chars) ──────────────────────────
  const suggestions = useSuggestions(inputValue);

  // ─── Auto-load most-recent on first mount ────────────────────────────
  const didAutoLoad = useRef(false);
  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;

    const mostRecent = history[0];
    if (mostRecent) {
      setInputValue("");
      setActiveQuery(mostRecent.query);
      setSource("auto");
    }
  }, [history]);

  // ─── Fetch ───────────────────────────────────────────────────────────
  const query = useWeather({ query: activeQuery, source });

  // ─── Last successful result (kept visible across query transitions) ──
  const [lastResult, setLastResult] = useState<WeatherResponse | null>(null);
  useEffect(() => {
    if (query.isSuccess && query.data) {
      setLastResult(query.data);
    }
  }, [query.isSuccess, query.data]);

  // ─── Add successful user-initiated fetches to history ────────────────
  const lastCommittedQuery = useRef<string | null>(null);
  useEffect(() => {
    if (!query.isSuccess || !query.data) return;
    if (source !== "user") return;
    if (!activeQuery) return;
    if (lastCommittedQuery.current === activeQuery.toLowerCase()) return;

    lastCommittedQuery.current = activeQuery.toLowerCase();
    addHistory({
      query: activeQuery,
      displayName: formatDisplayName(query.data),
    });
  }, [query.isSuccess, query.data, source, activeQuery, addHistory]);

  // ─── SearchBar callbacks ─────────────────────────────────────────────
  const handleValueChange = useCallback((next: string) => {
    setInputValue(next);
    setSource("user");
  }, []);

  // ─── Suggestion / history selection (the only things that trigger a fetch) ──
  const handleSuggestionSelect = useCallback((item: SuggestionItem) => {
    const q = item.region
      ? `${item.name}, ${item.region}, ${item.country}`
      : `${item.name}, ${item.country}`;
    setInputValue("");
    setActiveQuery(q);
    setSource("user");
  }, []);

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setInputValue("");
    setActiveQuery(item.query);
    setSource("user");
  }, []);

  // ─── History management ──────────────────────────────────────────────
  const handleHistoryRemove = useCallback(
    (item: HistoryItem) => {
      removeHistory(item.id);
      undo.stage({ items: [item], label: `Removed ${item.displayName}` });
      toast(`Removed ${item.displayName}`, {
        action: {
          label: "Undo",
          onClick: () => {
            const restored = undo.undo();
            if (restored) restore(restored.items);
          },
        },
      });
    },
    [removeHistory, undo, restore],
  );

  const handleClearAll = useCallback(() => {
    if (history.length === 0) return;
    const snapshot = [...history];
    clearHistory();
    undo.stage({ items: snapshot, label: `Cleared ${snapshot.length} searches` });
    toast(`Cleared ${snapshot.length} recent searches`, {
      action: {
        label: "Undo",
        onClick: () => {
          const restored = undo.undo();
          if (restored) restore(restored.items);
        },
      },
    });
  }, [history, clearHistory, undo, restore]);

  const handleRetry = useCallback(() => {
    void query.refetch();
  }, [query]);

  return (
    <div
      className={`text-foreground relative min-h-screen overflow-x-hidden${
        (query.data ?? lastResult)?.current.timeOfDay === "night" ? " night" : ""
      }`}
    >
      <div
        className={`sky${(query.data ?? lastResult)?.current.timeOfDay === "night" ? " night" : ""}`}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="rise rise-1 relative z-30 mb-8 flex items-center gap-6">
          <h1 className="font-display font-light text-2xl sm:text-3xl tracking-tight shrink-0">
            not another weather app
          </h1>
          <div className="flex-1 min-w-0">
            <SearchBar
              value={inputValue}
              onValueChange={handleValueChange}
              recentItems={history}
              suggestions={suggestions.data}
              isSuggestionsLoading={suggestions.isLoading}
              onSuggestionSelect={handleSuggestionSelect}
              onRecentSelect={handleHistorySelect}
              onRecentRemove={handleHistoryRemove}
              onRecentClearAll={handleClearAll}
            />
          </div>
        </header>

        <div
          className="rise rise-3 flex-1"
          aria-live="polite"
          aria-busy={query.isFetching}
        >
          <WeatherResult query={query} fallbackData={lastResult} onRetry={handleRetry} />
        </div>
      </div>

      <Toaster />
    </div>
  );
}

function formatDisplayName(data: { location: { name: string; country: string } }): string {
  const { name, country } = data.location;
  return country ? `${name}, ${country}` : name;
}
