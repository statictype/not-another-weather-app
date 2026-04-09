# RFC 002 — Split search-bar.tsx by responsibility

## Problem

`src/components/search-bar.tsx` is 401 LOC in one file. The dropdown is
already decomposed internally (`SearchDropdown`, `RecentSection`,
`SuggestionsList`, `SuggestionsLoading`, `ClearAllButton`, `SectionHeader`),
but they all share a file, so finding anything requires scrolling past
unrelated concerns.

## Proposal

Move each responsibility to its own file. No behavior change, no API change
to `SearchBar`'s props.

```
src/components/search-bar/
  index.tsx              # SearchBar — owns input, focus, submit, select-prompt state
  dropdown.tsx           # SearchDropdown — routes by trimmed length to the right section
  recent-section.tsx     # RecentSection + ClearAllButton (tightly coupled, same file)
  suggestions-list.tsx   # SuggestionsList + SuggestionsLoading
  section-header.tsx     # SectionHeader (shared by Recent + Suggestions)
```

`search-bar/index.tsx` re-exports `SearchBar`, so the existing import path
(`@/components/search-bar`) keeps working.

### Responsibilities

- **`index.tsx`** — `SearchBar`. Owns `useState` for `hasFocus` and
  `showSelectPrompt`, the `useRef` for the input, `handleChange`,
  `handleSubmit`, `handleRecentSelect`, `handleSuggestionSelect`. Renders the
  `<form>` + `<Input>` and delegates the dropdown to `SearchDropdown`.
- **`dropdown.tsx`** — `SearchDropdown`. Pure presentational. Takes the full
  prop set. Contains the length-based branching (empty / 1–2 chars /
  3+ chars) and composes `RecentSection` + `SuggestionsList` +
  `SuggestionsLoading`. Owns the `MIN_SUGGESTION_LENGTH` constant since it's
  the only thing that reads it for the branching. (Or lift to a shared
  `constants.ts` if `SearchBar` also needs it for `handleSubmit` — it does,
  so put the constant in `index.tsx` and import from `dropdown.tsx`.)
- **`recent-section.tsx`** — `RecentSection` + `ClearAllButton`. The
  alert-dialog confirmation for "Clear all" is only used here, so it stays
  co-located with the list it clears.
- **`suggestions-list.tsx`** — `SuggestionsList` + `SuggestionsLoading`. The
  loading skeleton mimics the list shape, so they share a file.
- **`section-header.tsx`** — `SectionHeader`. Tiny shared label used by both
  Recent and Suggestions.

### What is NOT changing

- `SearchBar`'s prop interface is unchanged.
- No new abstractions, hooks, or context. No extracted "dropdown state
  manager". The length-based branching stays as three inline JSX branches
  inside `SearchDropdown` — it reads fine once the file is 90 LOC instead of
  being buried in a 401-LOC sibling.
- `MIN_SUGGESTION_LENGTH` stays a plain module constant, not a prop or
  config.

## Migration

Single PR:

1. Create `src/components/search-bar/` directory.
2. Move each function to its file, adjust imports.
3. Add `src/components/search-bar/index.tsx` as the entry point. Verify the
   existing import `@/components/search-bar` still resolves (TypeScript /
   Vite will pick up `index.tsx` automatically).
4. Delete `src/components/search-bar.tsx`.
5. Run the existing integration test — it exercises the full search flow and
   will catch any accidental import or prop drift.

No test changes expected.
