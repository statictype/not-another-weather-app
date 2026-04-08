import { FileTextIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { HistoryItem } from "@/hooks/use-history";

const DEBOUNCE_MS = 500;
const MIN_LENGTH = 3;

interface SearchBarProps {
  value: string;
  onValueChange: (next: string) => void;
  onCommit: (query: string) => void;
  onActiveQueryChange: (query: string | null) => void;
  inlineError?: string | null;
  recentItems: HistoryItem[];
  onRecentSelect: (item: HistoryItem) => void;
  onRecentRemove: (item: HistoryItem) => void;
  onRecentClearAll: () => void;
}

/**
 * Search input with a recent-searches dropdown.
 *
 * The dropdown opens whenever the input is focused and there is at least
 * one recent item. Items use mousedown+preventDefault so clicking them
 * doesn't blur the input before the click registers.
 */
export function SearchBar({
  value,
  onValueChange,
  onCommit,
  onActiveQueryChange,
  inlineError,
  recentItems,
  onRecentSelect,
  onRecentRemove,
  onRecentClearAll,
}: SearchBarProps) {
  const inputId = useId();
  const errorId = useId();
  const debounced = useDebouncedValue(value, DEBOUNCE_MS);
  const [hasFocus, setHasFocus] = useState(false);

  useEffect(() => {
    const trimmed = debounced.trim();
    onActiveQueryChange(trimmed.length >= MIN_LENGTH ? trimmed : null);
  }, [debounced, onActiveQueryChange]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length >= MIN_LENGTH) {
      onCommit(trimmed);
    }
  }

  function handleBlur() {
    setHasFocus(false);
    const trimmed = value.trim();
    if (trimmed.length >= MIN_LENGTH) {
      onCommit(trimmed);
    }
  }

  const showError = !!inlineError && !hasFocus;
  const showDropdown = hasFocus && recentItems.length > 0;

  return (
    <search>
      <form onSubmit={handleSubmit}>
        <label htmlFor={inputId} className="sr-only">
          Search city
        </label>
        <div className="relative">
          <div
            className={`card-surface flex items-center gap-4 rounded-3xl px-6 py-4 transition-all ${
              hasFocus ? "ring-4 ring-sky-300/40" : ""
            }`}
          >
            <SearchIcon
              className="size-7 shrink-0 text-sky-500"
              strokeWidth={2}
              aria-hidden="true"
            />
            <Input
              id={inputId}
              type="search"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search a city…"
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              onFocus={() => setHasFocus(true)}
              onBlur={handleBlur}
              aria-invalid={showError ? true : undefined}
              aria-describedby={showError ? errorId : undefined}
              className="font-display font-light h-auto flex-1 border-0 bg-transparent p-0 text-xl tracking-tight shadow-none placeholder:font-light placeholder:text-foreground/35 focus-visible:ring-0 sm:text-2xl"
            />
            <kbd className="text-foreground/60 hidden rounded-lg bg-white/80 px-2.5 py-1.5 font-mono text-xs sm:inline-block">
              ↵
            </kbd>
          </div>

          {showDropdown && (
            <RecentDropdown
              items={recentItems}
              onSelect={onRecentSelect}
              onRemove={onRecentRemove}
              onClearAll={onRecentClearAll}
            />
          )}
        </div>
        {showError && (
          <p id={errorId} role="alert" className="text-destructive mt-2 pl-6 text-sm">
            {inlineError}
          </p>
        )}
      </form>
    </search>
  );
}

function RecentDropdown({
  items,
  onSelect,
  onRemove,
  onClearAll,
}: {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onRemove: (item: HistoryItem) => void;
  onClearAll: () => void;
}) {
  return (
    <div className="bg-popover text-popover-foreground absolute left-0 right-0 top-full z-20 mt-2 max-h-[60vh] overflow-y-auto rounded-3xl border border-border p-3 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.25)]">
      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <span className="font-display font-normal text-foreground/55 text-[11px] uppercase tracking-[0.18em]">
          Recent
        </span>
        <ClearAllButton onConfirm={onClearAll} />
      </div>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            key={item.id}
            className="group hover:bg-muted flex items-center gap-3 rounded-2xl px-3 py-2.5"
          >
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
              className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none"
              aria-label={`Load weather for ${item.displayName}`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-foreground/15 text-foreground/60">
                <FileTextIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="font-display font-normal text-base text-foreground tracking-tight">
                {item.displayName}
              </span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onRemove(item);
              }}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-foreground/40 opacity-0 transition hover:bg-foreground/10 hover:text-foreground/80 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
              aria-label={`Remove ${item.displayName} from history`}
            >
              <XIcon className="size-4" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClearAllButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          className="text-foreground/55 hover:text-destructive h-7 px-2 text-xs uppercase tracking-wider"
        >
          <Trash2Icon className="size-3.5" aria-hidden="true" />
          Clear
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all recent searches?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes every entry from your history. You'll be able to undo for a few seconds.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Clear all</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
