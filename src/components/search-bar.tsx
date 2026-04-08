import { SearchIcon } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const DEBOUNCE_MS = 500;
const MIN_LENGTH = 3;

interface SearchBarProps {
  /** Controlled current input value. Allows the parent to inject history clicks. */
  value: string;
  onValueChange: (next: string) => void;
  /** Fires when the user explicitly commits (Enter or blur with valid value). */
  onCommit: (query: string) => void;
  /** Fires whenever the debounced search query changes. Drives `useWeather`. */
  onActiveQueryChange: (query: string | null) => void;
  /** Inline validation error to render under the input (e.g. 404 for current input). */
  inlineError?: string | null;
}

/**
 * Search input.
 *
 * Owns the immediate input value (controlled by parent so history clicks
 * can populate it). Debounces with `useDebouncedValue` and lifts the
 * debounced value via `onActiveQueryChange` so the parent's useWeather
 * picks it up. Enter and blur both `onCommit` so the parent can write
 * to history once the user has settled on a query.
 *
 * The inline error is rendered as a `role="alert"` element wired to the
 * input via aria-describedby and aria-invalid.
 */
export function SearchBar({
  value,
  onValueChange,
  onCommit,
  onActiveQueryChange,
  inlineError,
}: SearchBarProps) {
  const inputId = useId();
  const errorId = useId();
  const debounced = useDebouncedValue(value, DEBOUNCE_MS);
  const [hasFocus, setHasFocus] = useState(false);

  // Push debounced query upstream whenever it changes.
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

  return (
    <search>
      <form onSubmit={handleSubmit}>
        <label htmlFor={inputId} className="sr-only">
          Search city
        </label>
        <div
          className={`card-surface flex items-center gap-4 rounded-3xl px-6 py-5 transition-all ${
            hasFocus ? "ring-4 ring-sky-300/40" : ""
          }`}
        >
          <SearchIcon
            className="size-8 shrink-0 text-sky-500"
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
            className="font-display font-light h-auto flex-1 border-0 bg-transparent p-0 text-2xl tracking-tight shadow-none placeholder:font-light placeholder:text-foreground/35 focus-visible:ring-0 sm:text-3xl"
          />
          <kbd className="text-foreground/60 hidden rounded-lg bg-white/80 px-2.5 py-1.5 font-mono text-xs sm:inline-block">
            ↵
          </kbd>
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
