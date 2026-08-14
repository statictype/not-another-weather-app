import { useSyncExternalStore } from "react";
import { addHistoryItem, clearHistory, removeHistoryItem, restoreHistoryItems } from "./reducer";
import { getServerSnapshot, getSnapshot, subscribe, writeToStorage } from "./store";
import type { HistoryItem } from "./types";

export interface UseHistoryReturn {
  history: HistoryItem[];
  add: (item: Omit<HistoryItem, "id" | "addedAt">) => void;
  remove: (id: string) => void;
  clear: () => void;
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
