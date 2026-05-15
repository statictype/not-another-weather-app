import { useSyncExternalStore } from "react";
import { addHistoryItem, clearHistory, removeHistoryItem, restoreHistoryItems } from "./reducer";
import { getServerSnapshot, getSnapshot, subscribe, writeToStorage } from "./store";
import type { HistoryItem } from "./types";

/**
 * Search history hook backed by localStorage.
 *
 * Plumbing only: subscribe to the module store, and forward each mutator
 * to the matching pure transition in `./reducer`. The semantics
 * (newest-first, dedupe, cap at MAX_HISTORY, restore-by-id) live in
 * the reducer functions so they can be tested without React.
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

  return {
    history,
    add: (item) => writeToStorage(addHistoryItem(getSnapshot(), item)),
    remove: (id) => writeToStorage(removeHistoryItem(getSnapshot(), id)),
    clear: () => writeToStorage(clearHistory()),
    restore: (items) => writeToStorage(restoreHistoryItems(getSnapshot(), items)),
  };
}
