import { createPersistentStore } from "@/lib/persistent-store";
import { type HistoryItem, STORAGE_KEY } from "./types";

export const historyStore = createPersistentStore<HistoryItem[]>({
  key: STORAGE_KEY,
  decode: (raw) => {
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isHistoryItem);
  },
  encode: (next) => JSON.stringify(next),
  fallback: () => [],
  serverValue: [],
});

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

/** Read outside React by `main.tsx`, to seed `?city=` before the app mounts. */
export function getHistorySnapshot(): HistoryItem[] {
  return historyStore.get();
}

export function __resetHistoryStoreForTests(): void {
  historyStore.reset();
}
