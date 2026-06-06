/**
 * A committed map plus an in-memory draft layer of pending edits.
 *
 * The `/moods` editor runs this exact pattern twice — once for per-cell hex
 * overrides, once for per-row hue offsets — so the transitions live here, as
 * pure functions over a single value, rather than inline-and-doubled in the
 * component. The draft is ephemeral; only `committed` is persisted (see
 * `persistence.ts`).
 *
 * `baseline` (on the modified checks) is the value an absent committed entry
 * is treated as: omit it for the cell map (absent = no override), pass `0` for
 * the row-hue map (absent = no rotation), so dragging a slider back to its
 * default reads as "not modified".
 */
export interface StagedMap<K extends string, V> {
  readonly committed: Readonly<Partial<Record<K, V>>>;
  readonly draft: Readonly<Partial<Record<K, V>>>;
}

/** A staged map seeded with `committed` and an empty draft. */
export function staged<K extends string, V>(
  committed: Partial<Record<K, V>> = {},
): StagedMap<K, V> {
  return { committed, draft: emptyLayer<K, V>() };
}

// `{}` isn't assignable to `Partial<Record<K, V>>` when K is a generic type
// parameter (a TS limitation), so the empty layer is built behind one cast.
function emptyLayer<K extends string, V>(): Partial<Record<K, V>> {
  return {} as Partial<Record<K, V>>;
}

/** The value to display/use for a key: the pending edit if any, else committed. */
export function effective<K extends string, V>(s: StagedMap<K, V>, key: K): V | undefined {
  return s.draft[key] ?? s.committed[key];
}

/** Whether `key` has a pending edit that differs from its committed (or baseline) value. */
export function isModified<K extends string, V>(s: StagedMap<K, V>, key: K, baseline?: V): boolean {
  const d = s.draft[key];
  if (d === undefined) return false;
  return d !== (s.committed[key] ?? baseline);
}

/** How many keys carry a pending edit that differs from committed (or baseline). */
export function modifiedCount<K extends string, V>(s: StagedMap<K, V>, baseline?: V): number {
  let n = 0;
  for (const key of Object.keys(s.draft) as K[]) {
    if (isModified(s, key, baseline)) n++;
  }
  return n;
}

/** Stage a pending edit for `key`. Leaves committed untouched. */
export function setDraft<K extends string, V>(
  s: StagedMap<K, V>,
  key: K,
  value: V,
): StagedMap<K, V> {
  return { committed: s.committed, draft: { ...s.draft, [key]: value } };
}

/** Drop the pending edit for `key`, leaving committed as-is. No-op if none staged. */
export function revert<K extends string, V>(s: StagedMap<K, V>, key: K): StagedMap<K, V> {
  if (s.draft[key] === undefined) return s;
  const draft = { ...s.draft };
  delete draft[key];
  return { committed: s.committed, draft };
}

/** Promote the pending edit for `key` into committed. No-op if none staged. */
export function commit<K extends string, V>(s: StagedMap<K, V>, key: K): StagedMap<K, V> {
  const value = s.draft[key];
  if (value === undefined) return s;
  const draft = { ...s.draft };
  delete draft[key];
  return { committed: { ...s.committed, [key]: value }, draft };
}

/** Promote every pending edit into committed and clear the draft. */
export function commitAll<K extends string, V>(s: StagedMap<K, V>): StagedMap<K, V> {
  return { committed: { ...s.committed, ...s.draft }, draft: emptyLayer<K, V>() };
}
