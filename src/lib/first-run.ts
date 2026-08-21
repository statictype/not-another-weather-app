/**
 * Separates a first visit from a visit that cleared its history. History alone
 * cannot tell them apart — both read as an empty list — so this flag is written
 * once, on the first city that loads, and never removed.
 */
export const VISITED_STORAGE_KEY = "air:visited";

/** Read at call time, not module load: the flag is written during the session. */
export function hasVisitedBefore(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(VISITED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function __resetFirstRunForTests(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(VISITED_STORAGE_KEY);
}

export function markVisited(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VISITED_STORAGE_KEY, "1");
  } catch {
    // Quota exceeded or storage disabled — the first-run state shows again.
  }
}
