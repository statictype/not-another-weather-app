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
      <form onSubmit={handleSubmit} className="space-y-1.5">
        <label htmlFor={inputId} className="text-sm font-medium tracking-wide">
          City
        </label>
        <div className="relative">
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id={inputId}
            type="search"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Try London, Tokyo, or São Paulo…"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            onFocus={() => setHasFocus(true)}
            onBlur={handleBlur}
            aria-invalid={showError ? true : undefined}
            aria-describedby={showError ? errorId : undefined}
            className="pl-9 h-12 text-base"
          />
        </div>
        {showError && (
          <p id={errorId} role="alert" className="text-destructive text-sm">
            {inlineError}
          </p>
        )}
      </form>
    </search>
  );
}
