/**
 * Shared by the worker's edge-cache key and the frontend's query key, so the
 * two cannot disagree about what is one entry. `null` means don't fetch / 400.
 */
export function normalizeQuery(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const collapsed = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return collapsed.length > 0 ? collapsed : null;
}
