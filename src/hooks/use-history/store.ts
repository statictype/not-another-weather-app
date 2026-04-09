/**
 * Module-level store for search history.
 *
 * localStorage is external to React, so we maintain a tiny in-module
 * pub/sub for same-tab updates and rely on the browser's `storage`
 * event for cross-tab sync. This file has no React dependency — the
 * `useHistory` hook is a thin `useSyncExternalStore` wrapper on top.
 */

import { type HistoryItem, STORAGE_KEY } from "./types";

type Listener = () => void;
const listeners = new Set<Listener>();

let cachedSnapshot: HistoryItem[] = readFromStorage();

function readFromStorage(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryItem);
  } catch {
    return [];
  }
}

function isHistoryItem(value: unknown): value is HistoryItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.query === "string" &&
    typeof v.displayName === "string" &&
    typeof v.addedAt === "number"
  );
}

export function writeToStorage(next: HistoryItem[]): void {
  cachedSnapshot = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Quota exceeded or storage disabled — silently keep in-memory state.
    }
  }
  for (const listener of listeners) listener();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  // Cross-tab updates: react to the browser's `storage` event.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cachedSnapshot = readFromStorage();
    for (const l of listeners) l();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getSnapshot(): HistoryItem[] {
  return cachedSnapshot;
}

export function getServerSnapshot(): HistoryItem[] {
  return [];
}

/**
 * Synchronous accessor for callers that need the current history outside
 * of a React render (e.g. lazy `useState` initializers on mount).
 */
export function getHistorySnapshot(): HistoryItem[] {
  return cachedSnapshot;
}

// Test-only escape hatch — lets tests reset state between cases without
// reaching into module internals from outside.
export function __resetHistoryStoreForTests(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  cachedSnapshot = [];
  for (const listener of listeners) listener();
}
