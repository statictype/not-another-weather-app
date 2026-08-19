# RFC 011 — Unify mobile/desktop search menu, fix focus model

> **Status note (issue 010).** The core result stands: one `<Input>`, one
> `useSearchMenu`, one `<Menu>` renderer, `buildMenuModel` as a pure ladder.
> Superseded is narrower — the mobile overlay geometry, the `SLIDE_*` slide over
> the mark, the Cancel button, and the focus-derived open model. `useSearchMenu`
> is now controlled: it takes `onClose`, reports selections through `onCommit`,
> and `isFocused` is gone from it entirely. The field lives in the nav panel and
> unmounts with it, so the no-remount constraint this RFC was built around no
> longer applies.

## Context

After RFC 002 split `search-bar.tsx` by responsibility, a follow-up pass
added a dedicated **desktop** dropdown (keyboard-navigable list with a
spring `FocusPill` highlight) without folding the mobile chip-grid path
into the same abstraction. The result was:

- **Two `<Input>` elements** — one inside the mobile-overlay
  `motion.div`, one inside the desktop-inline branch — gated by a top-
  level `AnimatePresence`. Whenever `isMobileOpen` flipped, an entire
  subtree (including its input) unmounted and the other one mounted,
  with focus rebinding to a freshly-rendered DOM node.
- **Two render trees** that re-implemented the same branching ladder
  (`len === 0 → show recents`, `len < MIN → keep-typing`, `len ≥ MIN →
suggestions or no-results`). The desktop tree (`desktop-list.tsx`,
  ~370 LOC) consumed a flat `NavigableItem[]` for keyboard nav; the
  mobile tree (`dropdown.tsx` + `recent-section.tsx` + `suggestions-
list.tsx`, ~350 LOC) consumed the raw section data. Hint copy lived
  as duplicated string literals.
- **Three booleans** modelling the same state — `hasFocus`,
  `isMobileOpen` (derived), `showSelectPrompt` — plus `explicitKey`
  gated by `isDesktop` so mobile would intentionally fall through to a
  "Select a city from the list" alert prompt on Enter.

The user-visible symptoms tracked the structure exactly:

1. **Dropdown didn't reopen after a successful commit.** `closeSearch()`
   blurred the input, but the input the user was typing into post-commit
   was a different DOM element (the inline desktop input) than the one
   that had been focused (the mobile-overlay input). Focus events fired
   against an element that had just unmounted.
2. **"Select a city from the list" prompt felt off.** Mobile
   intentionally had no auto-focused row, so Enter on free-form input
   raised a validation alert instead of just running the top match.
3. **No way to express "Enter when there are no results"** as a distinct
   UX state.

## Decision

A single state machine, a single Input element, a single menu model,
two layout adapters.

### Module layout

```
src/components/search-bar/
  search-bar.tsx        # composition: one Input, one form, mobile-overlay backdrop
  use-search-menu.ts    # state machine: value, isFocused, selectedKey, isDialogOpen
  menu-model.ts         # types + pure buildMenuModel(args)
  menu.tsx              # <Menu variant="desktop" | "mobile" /> over the same model
  constants.ts          # MIN_SUGGESTION_LENGTH
  section-header.tsx    # shared label primitive
  clear-all-button.tsx  # alert-dialog confirmation (lazy-loaded)
```

Deleted: `dropdown.tsx`, `desktop-dropdown.tsx`, `desktop-list.tsx`,
`recent-section.tsx`, `suggestions-list.tsx`, `navigable.ts`. Their
content folded into `menu.tsx` (renderer) and `menu-model.ts` (types +
nav builder).

### One Input

The `<Input>` element lives in a fixed JSX position. The wrapping `<div>`
changes className between inline (`relative`) and mobile-overlay
(`fixed inset-0 z-50 flex flex-col`) — same DOM node, restyled. The
mobile backdrop and Cancel button are siblings of the input row, not
parents of a clone. `useSearchMenu` owns the single `inputRef`.

This is the **structural cause** behind the deletion test for the three
bugs: collapsing two inputs into one makes the symptoms vanish because
focus has nowhere to drop between transitions.

### `buildMenuModel` — the test surface

Pure function. Takes `{ value, recentItems, suggestions,
isSuggestionsLoading }`, returns `{ sections, actions, navigable,
defaultFocusKey }`:

- `sections`: ordered renderable strips (recent / suggestions /
  suggestions-loading / empty-results / keep-typing). The branching
  ladder lives here — there is exactly one place to change it.
- `actions`: the always-present `[location, random]` footer pair.
- `navigable`: flat list of all city rows followed by actions, used by
  `useSearchMenu` for keyboard nav.
- `defaultFocusKey`: first recent or suggestion key, or `null` when
  none exist. **Always non-null when results exist** — no platform
  gating. Enter has something to run on both desktop and mobile.

10 unit tests at `menu-model.test.ts` cover each rung of the ladder.

### `useSearchMenu` — the state machine

Owns `value`, `isFocused`, `selectedKey`, `isDialogOpen`. Exposes
`{ model, focusedKey, inputProps, formProps, cancel, hoverKey, ... }`.

- `focusedKey = selectedKey (if still in navigable) ?? model.defaultFocusKey`.
- `isOpen = isFocused || isDialogOpen` — the clear-all confirmation
  dialog steals focus from the input; we keep the menu mounted so the
  user returns to the same state.
- Commit helpers (`selectRecent`, `selectSuggestion`, `requestLocation`,
  `selectRandom`) call the caller's handler then close (clear value +
  blur). One ordering invariant, one place.
- `onValueChange?` callback fires from inside the hook so the parent
  (App.tsx) can mirror the value into `useSuggestions` without owning
  it.

11 unit tests at `use-search-menu.test.tsx`.

### Menu renderer

One `<Menu>` component, no `variant` prop. Both breakpoints render the
same DOM tree; visual divergence is purely CSS (`lg:` responsive
classes where needed). The chrome around it — dropdown panel on
desktop, fixed glass overlay on mobile — is the parent's concern
(`SearchBar`), not the menu's.

Visual rules:

- **Recents and suggestions are list rows on every breakpoint.** The
  earlier chip-grid mobile design was dropped in favour of the newer
  desktop list-row design across the board.
- **Suggestion rows always show the map-pin icon.** No CSS toggle —
  the icon's tone tints to sky-blue on the day theme, white on night.
- **`FocusPill`** — the springy `layoutId` highlight on the default-
  focused row — runs on both breakpoints. Single `LayoutGroup` wraps
  the menu so the pill animates across row changes regardless of
  whether the user is using a mouse or a virtual keyboard.
- **Remove X button** is always visible on touch (no hover state to
  discover it from), hover-to-reveal on desktop (`opacity-100
lg:opacity-0 lg:group-hover:opacity-100`). When the row is the
  focused one on desktop, the X also stays visible.
- **Action footer** is inline with a divider on both breakpoints;
  mobile gets slightly larger tap targets (`py-4 lg:py-3.5`).

Row click handlers use `onMouseDown` + `preventDefault` to keep focus
on the input while the wrapped commit handler closes the menu.

### Chrome around the menu (SearchBar)

The visible-everywhere requirements split the overlay model:

- **Input wrapper stays in document flow at every state.** No swap
  between `relative` and `fixed inset-0`. The y-jump that earlier
  versions had on mobile focus/blur was caused by that swap; it's gone
  because the wrapper never repositions.
- **Cancel button slides in beside the input** when the mobile menu
  opens. The button's appearance is animated with motion `layout` so
  the input's resulting width change is interpolated rather than an
  instant jump.
- **Glass backdrop sits _below_ the header.** A separate fixed
  element starting at the page header's bottom edge (`top-[5rem]
sm:top-[7rem]`) — the 😶‍🌫️ emoji and the input row stay visible
  above it, and the weather card is still partially perceivable
  through the blur. Translucent enough (`oklch(... / 0.55)`) that the
  backdrop reads as a soft scrim, not an opaque cover.
- **Menu panel** uses the same glass chrome (`.search-dropdown-
desktop` class, now serving both breakpoints) — `absolute top-full`
  dropdown on desktop, `fixed inset-x-4 bottom-4 top-[5.5rem]` panel
  on mobile.

### Behavioural changes the user will notice

- **Post-commit:** value clears, input blurs, menu closes. (Both
  platforms.) To search again, click/tap the input — focus event opens
  the menu.
- **No more "Select a city from the list" alert.** When there are rows
  to run, Enter runs the first one (already true on desktop, now true
  on mobile). When there are no rows, Enter is a silent no-op — the
  inline "No cities found" hint that already lives in the menu is the
  user-facing signal.
- **Mobile Enter (virtual keyboard) commits the first match** instead
  of falling through to the alert.

### What is NOT changing

- The `SearchBar` outer prop interface (only the obsolete `value` /
  `onValueChange` pair changed: `onValueChange` stays as the
  side-channel App.tsx needs for autocomplete debounce; `value` is
  gone because the hook owns it).
- App.tsx's URL contract (`?city=` source of truth, RFC 007) or any of
  RFC 009's debouncing decisions.
- The visible layouts on each breakpoint — chips on mobile, list on
  desktop. Same animation curves.
- The clear-all confirmation alert dialog flow.

## Test surface

- `menu-model.test.ts` — 10 pure cases (recents-only, keep-typing,
  suggestions-loading, suggestions-with/without header, empty-results,
  no-empty-results-when-recents-match, action invariants, navigable
  ordering, default-focus rules).
- `use-search-menu.test.tsx` — 11 hook cases (open/close, dialog keeps
  menu open, onValueChange firing, default focus, submit runs first
  row, submit-with-no-rows is no-op, ArrowUp/Down, Escape, the three
  commit helpers, value-change resets selectedKey).
- `integration.test.tsx` — the existing "selecting a city suggestion …"
  end-to-end case and the rewritten "Enter with no match is a silent
  no-op" case both pass against the new code.

## Migration

Single PR. App.tsx prop change (`value` removed, `onValueChange`
remains) is the only public-surface change. ~700 LOC of search-bar
files collapsed into 3 new files totalling ~720 LOC, but the new files
include the test surface and the state-machine documentation — actual
duplicated code is gone.

## Note on scope

Deeper polish — animating the input's _position_ during the inline ↔
overlay transition (today the wrapper restyles via class swap rather
than `layout` animation), and any further refinement of the
mobile-overlay `<body>` scroll-lock — are out of scope. Both are
orthogonal to the structural deepening and easy to add on top later.
