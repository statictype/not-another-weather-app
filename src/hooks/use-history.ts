import { useCallback, useSyncExternalStore } from "react";

/**
 * Search history hook backed by localStorage.
 *
 * Why useSyncExternalStore: localStorage is "external" to React. The
 * `storage` event only fires cross-tab, so we maintain a tiny in-module
 * pub/sub for same-tab updates. Every consumer of useHistory() subscribes
 * to the same store; mutating from one component re-renders all the
 * others without prop drilling or Context.
 *
 * History semantics (locked in during design):
 *   - Items are stored newest-first.
 *   - Adding an existing query (case-insensitive) moves it to the top
 *     instead of duplicating.
 *   - Capped at MAX_HISTORY entries; oldest dropped when exceeded.
 *   - Items are only added on a successful fetch (the caller's job).
 */

export interface HistoryItem {
  /** Stable identifier; survives reordering and rename. */
  id: string;
  /** Raw query the user submitted, used for re-fetching. */
  query: string;
  /** Pretty label for the UI ("London, United Kingdom"). */
  displayName: string;
  /** ms since epoch when the item was added or last refreshed. */
  addedAt: number;
}

export const MAX_HISTORY = 10;
const STORAGE_KEY = "oasis:history:v1";

// ─── External store plumbing ───────────────────────────────────────────

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

function writeToStorage(next: HistoryItem[]): void {
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

function subscribe(listener: Listener): () => void {
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

function getSnapshot(): HistoryItem[] {
  return cachedSnapshot;
}

function getServerSnapshot(): HistoryItem[] {
  return [];
}

// ─── Mutation helpers ──────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `h_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Pure reducer used by `add` — extracted so it can be tested directly
 * and re-used by undo (which has to splice items back into a specific
 * position). Lowercase comparison ensures "London" and "london" dedupe.
 */
export function addHistoryItem(
  current: HistoryItem[],
  next: Omit<HistoryItem, "id" | "addedAt">,
): HistoryItem[] {
  const normalizedQuery = next.query.trim().toLowerCase();
  if (!normalizedQuery) return current;

  const filtered = current.filter((item) => item.query.trim().toLowerCase() !== normalizedQuery);
  const newItem: HistoryItem = {
    id: generateId(),
    query: next.query.trim(),
    displayName: next.displayName,
    addedAt: Date.now(),
  };
  return [newItem, ...filtered].slice(0, MAX_HISTORY);
}

// ─── Public hook ───────────────────────────────────────────────────────

export interface UseHistoryReturn {
  history: HistoryItem[];
  add: (item: Omit<HistoryItem, "id" | "addedAt">) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Restore an array of items at the front of the list. Used by undo. */
  restore: (items: HistoryItem[]) => void;
}

export function useHistory(): UseHistoryReturn {
  const history = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((item: Omit<HistoryItem, "id" | "addedAt">) => {
    writeToStorage(addHistoryItem(cachedSnapshot, item));
  }, []);

  const remove = useCallback((id: string) => {
    writeToStorage(cachedSnapshot.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    writeToStorage([]);
  }, []);

  const restore = useCallback((items: HistoryItem[]) => {
    // Prepend restored items, dedupe by id, cap.
    const existingIds = new Set(cachedSnapshot.map((i) => i.id));
    const fresh = items.filter((i) => !existingIds.has(i.id));
    writeToStorage([...fresh, ...cachedSnapshot].slice(0, MAX_HISTORY));
  }, []);

  return { history, add, remove, clear, restore };
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
