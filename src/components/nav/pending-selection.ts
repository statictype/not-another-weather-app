import { normalizeQuery } from "@/lib/query";

/**
 * Selecting a row does not close the panel. It holds — field disabled, pending
 * indicator on the row — until the weather query settles. Success collapses;
 * any error keeps the panel up and renders the message inline.
 *
 * The wait has two halves. First the URL has to catch up with the selection
 * (`setSearchParam` is async to this render), then the query behind that URL
 * has to settle. `arrived` is the first half; the rest is the second.
 */
export interface PendingSelection {
  /** Menu row key, for the pending indicator. */
  key: string;
  /** City the row commits to. `null` until `selectCity` resolves, which every
   *  row waits on. */
  query: string | null;
  /** `activeQuery` at the moment of selection. */
  startQuery: string | null;
}

export interface SettleState {
  isFetching: boolean;
  isSuccess: boolean;
  isPlaceholderData: boolean;
  hasError: boolean;
}

export type HoldStatus = "idle" | "holding" | "settled" | "failed";

export function hasArrived(pending: PendingSelection, activeQuery: string | null): boolean {
  const active = normalizeQuery(activeQuery);
  if (pending.query !== null) return active === normalizeQuery(pending.query);
  return active !== normalizeQuery(pending.startQuery);
}

export function resolveHold(
  pending: PendingSelection | null,
  activeQuery: string | null,
  query: SettleState,
): HoldStatus {
  if (!pending) return "idle";
  if (!hasArrived(pending, activeQuery)) return "holding";
  if (query.hasError) return "failed";
  if (query.isFetching) return "holding";
  // During the placeholder window `isSuccess` is true while `data` still points
  // at the previous city. See the gotcha in CLAUDE.md.
  if (query.isSuccess && !query.isPlaceholderData) return "settled";
  return "holding";
}
