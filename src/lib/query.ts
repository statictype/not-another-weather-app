/**
 * Canonical query normalization shared by the frontend and the worker.
 *
 * Collapsing "London", " london ", "LONDON", and "New  York" into stable
 * canonical forms is load-bearing in two places:
 *
 *  - the worker's edge-cache key, and
 *  - the frontend's TanStack Query key.
 *
 * Keeping both sides on the same function guarantees that a single
 * underlying entry isn't fetched twice because one side collapsed
 * whitespace and the other didn't.
 *
 * Rules:
 *   - trim leading/trailing whitespace
 *   - lowercase
 *   - collapse internal whitespace runs to a single space
 *
 * Returns `null` if the result is empty — callers treat that as
 * "no query, don't fetch / 400".
 */
export function normalizeQuery(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const collapsed = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return collapsed.length > 0 ? collapsed : null;
}
