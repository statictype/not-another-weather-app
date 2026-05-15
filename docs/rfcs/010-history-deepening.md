# RFC 010 — Deepen the history module

## Context

Two findings from the 2026-05-15 architecture review of `src/hooks/use-history/` and `src/App.tsx`:

1. **The reducer extraction (RFC 005) was a file split, not a depth change.**
   `addHistoryItem` lived in `reducer.ts` as a pure function, but `remove`,
   `clear`, and `restore` had their logic inlined in `hook.ts`. The
   `MAX_HISTORY` cap was applied in two places (the reducer's `add` and
   the hook's `restore`); the dedupe rules existed in two flavors
   (lowercase-query in `addHistoryItem`, by-id in `restore`). The test
   surface only covered the one transition that was already pulled out.

2. **The "remove + undo + toast" ceremony was duplicated in App.tsx.**
   Both `handleHistoryRemove` (single-item) and `handleClearAll`
   reimplemented the same four-step sequence: mutate history, stage the
   pending removal with `useUndo`, fire a sonner toast, wire the toast's
   Undo action to `undo.undo()` → `restore()`. `useUndo`'s JSDoc had to
   carry the ordering invariant (_"the items must already be removed
   from the source"_) because callers had to know it.

Both findings are the same shape — modules whose interfaces were nearly
as complex as their implementations. The fix in each case is to push
behaviour behind the interface (deeper module, smaller surface).

## Decision

### Part A — flatten all history transitions into pure functions

`src/hooks/use-history/reducer.ts` now exports four plain pure functions:

```ts
addHistoryItem(state, item)        → HistoryItem[]
removeHistoryItem(state, id)       → HistoryItem[]
clearHistory()                     → HistoryItem[]   // []
restoreHistoryItems(state, items)  → HistoryItem[]
```

A single internal `cap()` helper applies `MAX_HISTORY`; both `add` and
`restore` route through it. The hook becomes plumbing:

```ts
export function useHistory() {
  const history = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    history,
    add: (item) => writeToStorage(addHistoryItem(getSnapshot(), item)),
    remove: (id) => writeToStorage(removeHistoryItem(getSnapshot(), id)),
    clear: () => writeToStorage(clearHistory()),
    restore: (items) => writeToStorage(restoreHistoryItems(getSnapshot(), items)),
  };
}
```

#### Why plain functions over a namespace object or an action union

- **Namespace (`historyReducer.add(...)`).** Tested the same as plain
  functions but adds an extra `.add` of ceremony at every call. The
  grouping earns nothing.
- **Single reducer + discriminated action union.** Would let us write
  sequence-property tests over actions, but no such tests exist or are
  planned. Plain functions match the codebase style (`normalizeQuery`,
  `airComfort`, the old `addHistoryItem`) and the hook stays trivially
  readable.

### Part B — add `useReversibleHistory` to own the remove + undo + toast story

`src/hooks/use-reversible-history.ts`:

```ts
export function useReversibleHistory(): {
  history: HistoryItem[];
  add: (item) => void;
  removeWithUndo: (item: HistoryItem) => void;
  clearAllWithUndo: () => void;
};
```

Internally composes `useHistory()` + `useUndo<HistoryItem>(5000)` and
calls `sonner.toast` with the Undo action bound to the staged removal.
The ordering invariant (mutate → stage → toast → wire) is sealed inside.
`clearAllWithUndo()` is a no-op (and fires no toast) when history is
empty.

#### Why sonner is hard-wired rather than injected

Sonner is the project's only toast library. Hard-wiring keeps the call
site to one function call and makes `useReversibleHistory` the single
seam if the toast library is ever swapped — the only place to touch is
this file. An injected `notify` callback would be more abstractly
testable, but the trade is "the hook can't run without a caller
adapter" for "the unit tests need `vi.mock('sonner', ...)`" — and we
were going to mock toast either way.

## Test surface

- `src/hooks/use-history.test.ts` — pure tests for all four reducer
  transitions, plus the existing hook integration tests. 15 cases.
- `src/hooks/use-reversible-history.test.ts` — 5 cases covering remove +
  undo, clear + undo, the empty-clear no-op, and the second-click
  bounded-undo. Sonner is mocked at the module level; the test captures
  the toast's `action.onClick` and invokes it directly.
- `src/integration.test.tsx` — "removes a history item, shows undo
  toast, and restores it" remains the end-to-end guard.

## What is NOT changing

- `useHistory`'s public surface (`{ history, add, remove, clear, restore }`).
- `useUndo<T>` stays a generic primitive with its own test file.
- The localStorage key, dedupe rules, cap value, or cross-tab sync.
- The remove/clear UX (5 s undo window, identical toast titles).
- App.tsx's URL-as-source-of-truth, the keepPreviousData commit guard,
  or any RFC 007 / RFC 009 decisions.

## Migration

Single PR. No behaviour change; the integration test that exercises the
toast/undo flow is the regression guard.

1. Rewrite `reducer.ts` to export the four pure functions.
2. Rewire `hook.ts` to call them.
3. Add `src/hooks/use-reversible-history.ts`.
4. Swap App.tsx from `useHistory` + `useUndo` + inline ceremony to
   `useReversibleHistory`.
5. Extend the existing test file with reducer cases; add the new hook
   test file.

App.tsx shrinks from 192 LOC to 154 LOC; the duplicated four-step
sequence is gone.

## Note on scope

The `useUndo` primitive's `PendingRemoval.label` field is now only set
for documentation — nothing reads it. Removing it is a follow-on but
out of scope for this RFC; it doesn't affect behaviour today.
