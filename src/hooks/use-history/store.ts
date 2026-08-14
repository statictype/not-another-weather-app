import { createSubscription } from "@/lib/external-store";
import { type HistoryItem, STORAGE_KEY } from "./types";

let cachedSnapshot: HistoryItem[] = readFromStorage();

const subscription = createSubscription((onChange) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cachedSnapshot = readFromStorage();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
});

export const subscribe = subscription.subscribe;

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
      // Quota exceeded or storage disabled — keep in-memory state.
    }
  }
  subscription.notify();
}

export function getSnapshot(): HistoryItem[] {
  return cachedSnapshot;
}

export function getServerSnapshot(): HistoryItem[] {
  return [];
}

export function getHistorySnapshot(): HistoryItem[] {
  return cachedSnapshot;
}

export function __resetHistoryStoreForTests(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  cachedSnapshot = [];
  subscription.notify();
}
