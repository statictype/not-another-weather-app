import { useSyncExternalStore } from "react";
import { createSubscription } from "@/lib/external-store";

/**
 * Subscribes to a single URL search param via `useSyncExternalStore`.
 *
 * Re-renders when the browser fires `popstate` (back / forward
 * navigation) or when another subscriber updates the URL via the
 * exported `setSearchParam` helper. `popstate` does NOT fire for
 * programmatic `pushState` / `replaceState`, so we notify subscribers
 * manually from `setSearchParam`.
 *
 * Cross-tab updates are not handled — URL state is inherently per-tab.
 * See `docs/rfcs/007-url-driven-city.md`.
 */

const urlSubscription = createSubscription((onChange) => {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
});

function readSnapshot(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get(name);
}

export function useSearchParam(name: string): string | null {
  return useSyncExternalStore(
    urlSubscription.subscribe,
    () => readSnapshot(name),
    () => null, // SSR snapshot — no URL params on the server
  );
}

/**
 * Update a single search param and notify subscribers.
 *
 * Pass `null` to remove the param. Uses `pushState` so back / forward
 * navigation works — each user-initiated city change gets its own
 * history entry. The one-time bootstrap in `main.tsx` uses
 * `replaceState` directly because it's a cold-load bootstrap and
 * shouldn't grow the history stack.
 */
export function setSearchParam(name: string, value: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (value === null) {
    url.searchParams.delete(name);
  } else {
    url.searchParams.set(name, value);
  }
  window.history.pushState(null, "", url.toString());
  urlSubscription.notify();
}
