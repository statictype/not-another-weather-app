import { useSyncExternalStore } from "react";
import { addHistoryItem } from "./reducer";
import { getServerSnapshot, getSnapshot, subscribe, writeToStorage } from "./store";
import { type HistoryItem, MAX_HISTORY } from "./types";

/**
 * Search history hook backed by localStorage.
 *
 * History semantics (locked in during design):
 *   - Items are stored newest-first.
 *   - Adding an existing query (case-insensitive) moves it to the top
 *     instead of duplicating.
 *   - Capped at MAX_HISTORY entries; oldest dropped when exceeded.
 *   - Items are only added on a successful fetch (the caller's job).
 */

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

  const add = (item: Omit<HistoryItem, "id" | "addedAt">) => {
    writeToStorage(addHistoryItem(getSnapshot(), item));
  };

  const remove = (id: string) => {
    writeToStorage(getSnapshot().filter((item) => item.id !== id));
  };

  const clear = () => {
    writeToStorage([]);
  };

  const restore = (items: HistoryItem[]) => {
    // Prepend restored items, dedupe by id, cap.
    const current = getSnapshot();
    const existingIds = new Set(current.map((i) => i.id));
    const fresh = items.filter((i) => !existingIds.has(i.id));
    writeToStorage([...fresh, ...current].slice(0, MAX_HISTORY));
  };

  return { history, add, remove, clear, restore };
}
