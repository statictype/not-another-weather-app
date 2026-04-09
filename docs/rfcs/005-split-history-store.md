# RFC 005 — Split use-history.ts by responsibility

## Problem

`src/hooks/use-history.ts` is 189 LOC and mixes three concerns in one file:

1. **Pure reducer** — `addHistoryItem(current, next)` (and the dedupe /
   cap logic). Already exported, already testable in isolation.
2. **Module-level store** — `localStorage` read/write, in-memory
   `cachedSnapshot`, `listeners` Set, `subscribe` (with cross-tab
   `storage` event listener), `getSnapshot`, `writeToStorage`. Not
   React-coupled — this is a plain pub/sub on top of localStorage.
3. **React binding** — the `useHistory` hook: a thin
   `useSyncExternalStore` wrapper that exposes `{ history, add, remove,
clear, restore }`.

Nothing is architecturally wrong here — the existing test file covers
this cleanly. But finding any single concern means scrolling past the
other two, and the file is the biggest hook in the codebase.

## Proposal

Same pattern as RFC 002: move each responsibility to its own file. No
behavior change, no API change to `useHistory`.

```
src/hooks/history/
  types.ts         # HistoryItem type, MAX_HISTORY, STORAGE_KEY
  reducer.ts       # addHistoryItem (pure) + generateId
  store.ts         # module-level store: read/write/subscribe/snapshot
  use-history.ts   # useSyncExternalStore wrapper + returned action callbacks
  index.ts         # re-exports useHistory, HistoryItem, MAX_HISTORY, addHistoryItem, __reset…
```

### File contents

- **`types.ts`** — `HistoryItem` interface, `MAX_HISTORY`, `STORAGE_KEY`.
  Plain data, no imports.
- **`reducer.ts`** — `addHistoryItem(current, next)` and the tiny
  `generateId()` helper it depends on. Pure, no window, no storage.
  Directly unit-testable without any mocks.
- **`store.ts`** — owns `cachedSnapshot`, `listeners`, `readFromStorage`,
  `writeToStorage`, `subscribe`, `getSnapshot`, `getServerSnapshot`,
  `getHistorySnapshot`, `isHistoryItem`, `__resetHistoryStoreForTests`.
  Imports `types.ts`. Does not import React. This is the module that
  `useSyncExternalStore` subscribes to, but it's usable standalone —
  e.g. a future non-hook caller could call `writeToStorage` directly.
- **`use-history.ts`** — the `useHistory` hook: calls
  `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` and
  constructs the `{ history, add, remove, clear, restore }` object. Imports
  `reducer.ts` for `addHistoryItem` and `store.ts` for the store functions.
  Likely ~40 LOC.
- **`index.ts`** — re-exports the public surface so existing imports
  (`@/hooks/use-history`) resolve via the directory entry point with no
  caller changes.

### Import-path compatibility

Callers currently do `import { useHistory, type HistoryItem } from "@/hooks/use-history"`.
After the split, `@/hooks/use-history` resolves to the new directory's
`index.ts`. No call-site edits needed.

## What is NOT changing

- `useHistory`'s return shape, function names, or semantics.
- Storage key, `MAX_HISTORY`, cross-tab sync behavior, dedupe rules.
- The test file at `src/hooks/use-history.test.ts` stays as is and keeps
  passing. It may optionally be split to mirror the new file layout, but
  that's cosmetic.

## Migration

Single PR:

1. Create `src/hooks/history/` with the five files described.
2. Move code literally — no logic edits, just relocation.
3. Delete the old `src/hooks/use-history.ts`.
4. Run the existing test suite unchanged.

## Note on scope

If any future caller wants to observe history outside of React (e.g.
a route loader or a worker preflight), the split in this RFC makes that
trivial — `store.ts` is already framework-free. Not a reason to do the
refactor, but a free follow-on benefit.
