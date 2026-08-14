# Issue 008 — Motion foundation

**Blocks:** 009, 010, 011
**Source:** original item 1 — the shared plumbing

## Problem

Three separate pieces of motion work are queued. All three need the same four
things, none of which exist: a way to keep components mounted across a city
change, a reduced-motion policy, an assistive-technology policy for text that
animates, and the value-animation primitives themselves.

### No dependency is being added

`motion` v12 is already in `package.json` and already used in `search-bar.tsx`
and `menu.tsx`. GSAP became free including MorphSVG and ScrambleText, so
licensing is not a blocker, but it would be a second animation library at
roughly +30 KB gz against a 93 KB gz main chunk that ADR 001 fought to reduce
from 122 KB. Scramble is ~30 lines. Path interpolation is available in `motion`.
One vocabulary, no new bytes.

### The remount blocker

`grid.tsx:31` sets `key={swapKey}` on the grid container, where `swapKey` is
derived from the city name. Every city change destroys and recreates every card,
replaying the `.swap-in` CSS cascade. That is a teardown, which is precisely the
appearance being designed away.

Removing it changes behaviour: card-local state now survives a city change —
the astro tile's sun/moon view, and the hourly mode from 005. That is intended.
Switching cities should not reset how the reader is reading.

### No reduced-motion handling exists anywhere

`index.css:398-421` defines `rise`, `swap-in` and `astro-fade` with no
`prefers-reduced-motion` guard. This is already a gap; adding scrambles, rolls
and morphs on top makes it a live accessibility regression against a project
that holds a Lighthouse accessibility score of 100.

## Decision

### 1. Remove the remount key

Delete `key={swapKey}` and the now-dead `swapKey`. Delete the `.swap-in` /
`.swap-d-*` classes from the seven cards and from `index.css` once 009 replaces
what they did. Keep `aria-busy={isStale}`.

### 2. Reduced-motion policy

`useReducedMotion()` from `motion/react` gates every transform, scale, scramble,
digit roll and path morph. **Opacity crossfades survive** — the guideline
targets movement and scaling, which are the vestibular triggers; fading is not
one.

Retrofit `index.css` in the same commit:

```css
@media (prefers-reduced-motion: reduce) {
  .rise,
  .swap-in,
  .astro-fade {
    animation: none;
  }
}
```

Reduced motion is not a degraded experience here — content still transitions,
it just does not move.

### 3. Assistive technology policy

`App.tsx` puts `aria-live="polite"` on `<main>`, wrapping the entire result.
Any subtree change announces, which is already aggressive and becomes unusable
once values animate: a digit rolling from 4 to 19 would announce fifteen times.

- Remove `aria-live` from `<main>`. Keep `aria-busy`.
- Add one visually-hidden live region that announces the settled state once per
  city, after the `current` tier resolves: `"Weather for Reykjavík, Iceland.
9 degrees, light rain."`
- **Every animating text node is `aria-hidden`** and carries an `sr-only`
  sibling holding the settled value. This is unconditional — it applies
  regardless of the reduced-motion setting, because the two are different users
  with different needs.

### 4. Primitives — `src/lib/motion/`

| Primitive       | Shape                                     | Notes                                                                                                                                                                                       |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useScramble`   | `(target: string) => string`              | Randomises from a charset, settles left to right over ~400 ms. Returns `target` immediately under reduced motion. Preserves length and whitespace so the layout never reflows mid-scramble. |
| `RollingNumber` | `<RollingNumber value={n} format={fn} />` | `animate()` on a `MotionValue` + `useTransform`, rendered as a motion child so the digits update without a React re-render. Under reduced motion, renders `value` directly.                 |
| `AnimatedText`  | `<AnimatedText value={s} />`              | Wraps `useScramble` and owns the `aria-hidden` + `sr-only` pairing so no call site can forget it.                                                                                           |

Springs, durations and stagger step live in one exported constants module.
`search-bar.tsx:30-32` and `menu.tsx:12` already define spring configs inline;
fold them into the same module so the app has one motion vocabulary.

## Acceptance criteria

- No component uses `key` to force a remount on data change.
- With `prefers-reduced-motion: reduce`, no element translates, scales, rotates,
  scrambles or rolls; crossfades still run; the CSS animations are off.
- A screen reader announces a city change once, not per frame, and never
  announces scrambled characters.
- Bundle size does not grow beyond the cost of the new source files — assert no
  new runtime dependency in `package.json`.
- `useScramble` and `RollingNumber` have unit tests using fake timers, including
  their reduced-motion paths.

## Out of scope

Any actual visible transition. 008 lands the plumbing; 009, 010 and 011 spend
it. Landing 008 alone should produce no visual change except the removal of the
`.swap-in` cascade.
