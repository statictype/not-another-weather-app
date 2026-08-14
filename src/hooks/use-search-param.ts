import { useSyncExternalStore } from "react";
import { createSubscription } from "@/lib/external-store";

/** `popstate` does not fire for `pushState`, so `setSearchParam` notifies subscribers. */

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
