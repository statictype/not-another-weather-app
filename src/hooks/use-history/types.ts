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
export const STORAGE_KEY = "oasis:history:v1";
