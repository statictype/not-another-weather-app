import { normalizeQuery } from "@/lib/query";
import { type HistoryItem, MAX_HISTORY } from "./types";

/**
 * Pure transitions for the history list.
 *
 * All four operations live here so the rules they share — the
 * `MAX_HISTORY` cap, the canonical-query dedupe on add, the by-id dedupe
 * on restore — are centralized and the test surface is one module, not
 * "the reducer plus three inline filters in the hook." The hook is
 * plumbing on top of these functions.
 */

export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `h_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function cap(items: HistoryItem[]): HistoryItem[] {
  return items.slice(0, MAX_HISTORY);
}

/**
 * Prepend a new item. Existing entries that match by canonical query
 * (`normalizeQuery` — the same rule the edge-cache and TanStack keys use,
 * so History can't treat `New  York` and `New York` as distinct entries
 * that the cache already collapses) are removed first, so the new
 * occurrence moves to the top with a fresh id. Empty/whitespace queries
 * normalize to `null` and are rejected without mutation.
 */
export function addHistoryItem(
  state: HistoryItem[],
  next: Omit<HistoryItem, "id" | "addedAt">,
): HistoryItem[] {
  const normalizedQuery = normalizeQuery(next.query);
  if (!normalizedQuery) return state;

  const filtered = state.filter((item) => normalizeQuery(item.query) !== normalizedQuery);
  const newItem: HistoryItem = {
    id: generateId(),
    query: next.query.trim(),
    displayName: next.displayName,
    addedAt: Date.now(),
  };
  return cap([newItem, ...filtered]);
}

export function removeHistoryItem(state: HistoryItem[], id: string): HistoryItem[] {
  return state.filter((item) => item.id !== id);
}

export function clearHistory(): HistoryItem[] {
  return [];
}

/**
 * Prepend restored items, deduping by id against the current list.
 * Used by undo — the items already have their original ids, so an id
 * collision means the same item is still present and we skip it.
 */
export function restoreHistoryItems(state: HistoryItem[], items: HistoryItem[]): HistoryItem[] {
  const existingIds = new Set(state.map((i) => i.id));
  const fresh = items.filter((i) => !existingIds.has(i.id));
  return cap([...fresh, ...state]);
}
