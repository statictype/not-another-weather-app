# Issue 010 — Input-to-menu container transform

**Status:** Not started
**Depends on:** 008
**Source:** original item 1

## Problem

The menu does not come out of the input. `search-bar.tsx:179` renders the input
surface, and `:254` renders the menu as a separate sibling that fades and scales
in at `top-full mt-3`. Two elements, two backgrounds, no relationship between
them — the panel simply appears below.

`layoutId="search-focus-pill"` (`menu.tsx:165`) is the row highlight _inside_
the menu. It is not an input-to-menu transform.

## Decision

One element. The pill grows into the panel; the input stays inside it.

### The constraint that shapes everything

`search-bar.tsx:51` records the existing invariant: _"single Input element kept
in document flow on every state, one `useSearchMenu` state machine, one
`<Menu>` renderer shared across breakpoints."_ The input must not remount —
remounting loses focus, caret position and in-progress IME composition, which is
unacceptable on a field the user is typing into when the menu opens.

This rules out the obvious implementation (`layoutId` shared between a closed
pill and an open panel), because the two states would own different `Input`
instances.

### Structure

The input row and the menu body become children of a single `motion.div` with
`layout`. It animates in one spring:

- height, from the pill to the panel
- `border-radius`, `1.75rem` → `2rem`
- background treatment, `search-surface` → `search-dropdown-desktop`

The `Input` element sits at the top of that container in both states and is
never conditionally rendered.

Menu contents fade in on a short delay after the grow starts, so text is not
stretched by the parent's height animation.

### Not shifting the page

An in-flow container that grows pushes the header's siblings down. The surface
becomes absolutely positioned over a fixed-height placeholder that holds the
header's space in flow. Opening and closing then changes nothing outside the
search bar's own box.

### Mobile

The same transform, at mobile geometry: the pill grows into a near-fullscreen
sheet.

It stays `position: absolute` with a computed `height: calc(100dvh - offset)`
rather than switching to `fixed`. RFC 011 built the current mobile behaviour
specifically so the input's wrapper never becomes fixed and its y position is
stable across focus/blur; animating across a position change is where FLIP
layout animations most reliably produce a visible jump, and the mobile keyboard
resizing the viewport mid-animation makes it worse. `document.body` is already
`overflow-hidden` while the menu is open (`search-bar.tsx:121`), so absolute and
fixed resolve to the same visual box.

The existing leftward slide (`animate={{ marginLeft: -slideLeft }}`, the
`SLIDE_XS`/`SLIDE_SM`/`SLIDE_MD` constants) composes into the same spring rather
than running as a separate animation.

The backdrop and the Cancel button keep their current treatment.

### Closing

The reverse, on the same spring. Contents fade out first, then the container
shrinks. Closing must be interruptible — reopening mid-close animates from
wherever the container currently is, not from the closed geometry.

## Acceptance criteria

- Focus, caret position and selection survive open and close, asserted with a
  test that types, opens the menu, and checks `selectionStart`.
- No page content outside the search bar moves when the menu opens.
- The input never has `position: fixed` at any point, on any breakpoint.
- Under reduced motion the panel crossfades at full size instead of growing.
- Existing keyboard navigation, `useSearchMenu` behaviour and the search-menu
  tests pass unchanged — this is a presentation change only.
- Opening, closing, and reopening within 100 ms produces no jump.

## Out of scope

Changing the menu's contents, sections, or the `MenuModel`. Changing the state
machine in `use-search-menu.ts`. The unit toggle's placement in the header
(see 006) must not enter this container.
