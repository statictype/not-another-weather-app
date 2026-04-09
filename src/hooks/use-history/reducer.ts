import { type HistoryItem, MAX_HISTORY } from "./types";

export function generateId(): string {
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
