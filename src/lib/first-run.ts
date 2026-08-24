import { createPersistentStore } from "./persistent-store";

/**
 * Separates a first visit from a visit that cleared its history. History alone
 * cannot tell them apart — both read as an empty list — so this flag is written
 * once, on the first city that loads, and never removed.
 */
export const VISITED_STORAGE_KEY = "air:visited";

const firstRunStore = createPersistentStore<boolean>({
  key: VISITED_STORAGE_KEY,
  decode: (raw) => (raw === "1" ? true : null),
  encode: () => "1",
  fallback: () => false,
});

export function hasVisitedBefore(): boolean {
  return firstRunStore.get();
}

export function markVisited(): void {
  firstRunStore.set(true);
}

export function __resetFirstRunForTests(): void {
  firstRunStore.reset();
}
