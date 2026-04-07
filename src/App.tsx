import { GithubIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { WeatherClientError } from "@/api/weather";
import { HistoryList } from "@/components/history-list";
import { SearchBar } from "@/components/search-bar";
import { Toaster } from "@/components/ui/sonner";
import { WeatherResult } from "@/components/weather-result";
import { type HistoryItem, useHistory } from "@/hooks/use-history";
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

  // ─── Auto-load most-recent on first mount ────────────────────────────
  // Use a ref guard so React Strict Mode's double-effect doesn't fight us.
  const didAutoLoad = useRef(false);
  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;

    const mostRecent = history[0];
    if (mostRecent) {
      setInputValue(mostRecent.query);
      setActiveQuery(mostRecent.query);
      setSource("auto");
    }
    // The ref guard above ensures this body only runs once even though
    // `history` is in the dep array — we just need a value-stable trigger
    // so the linter is happy and we can read the initial snapshot.
  }, [history]);

  // ─── Fetch ───────────────────────────────────────────────────────────
  const query = useWeather({ query: activeQuery, source });

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

  const handleActiveQueryChange = useCallback((next: string | null) => {
    setActiveQuery(next);
  }, []);

  const handleCommit = useCallback((q: string) => {
    setSource("user");
    setActiveQuery(q);
  }, []);

  // ─── History interactions ────────────────────────────────────────────
  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setInputValue(item.query);
    setActiveQuery(item.query);
    setSource("user");
    lastCommittedQuery.current = item.query.toLowerCase();
  }, []);

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

  // ─── Inline error: only `not_found` from a user query, only when the
  //     active query still matches what triggered the error. ───────────
  const inlineError =
    query.error instanceof WeatherClientError &&
    query.error.kind === "not_found" &&
    source === "user"
      ? `No city named "${activeQuery}" found. Check the spelling?`
      : null;

  const handleRetry = useCallback(() => {
    void query.refetch();
  }, [query]);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <div>
            <h1 className="font-serif text-2xl tracking-tight">Oasis</h1>
            <p className="text-muted-foreground text-xs">A small, fast weather forecast.</p>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer noopener"
            className="text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-full"
            aria-label="GitHub repository"
          >
            <GithubIcon className="size-5" aria-hidden="true" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <SearchBar
          value={inputValue}
          onValueChange={handleValueChange}
          onCommit={handleCommit}
          onActiveQueryChange={handleActiveQueryChange}
          inlineError={inlineError}
        />

        <div aria-live="polite" aria-busy={query.isFetching}>
          <WeatherResult query={query} onRetry={handleRetry} />
        </div>

        <HistoryList
          items={history}
          onSelect={handleHistorySelect}
          onRemove={handleHistoryRemove}
          onClearAll={handleClearAll}
        />
      </main>

      <Toaster />
    </div>
  );
}

function formatDisplayName(data: { location: { name: string; country: string } }): string {
  const { name, country } = data.location;
  return country ? `${name}, ${country}` : name;
}
