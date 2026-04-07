import { useEffect, useState } from "react";

/**
 * Returns a value that lags behind the input by `delay` milliseconds.
 *
 * Used by the search bar so we don't fire a fetch on every keystroke.
 * Each new input value cancels the previous timer, so the consumer
 * only sees the value after the user has stopped typing for `delay`.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return debounced;
}
