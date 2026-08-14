# Issue 001 — Fix moon phase geometry

**Source:** original item 6 — "shows full moon at 1% illumination"

## Problem

`MoonBodyShapes` in `src/components/weather/astro-card.tsx:248` draws the lit
part of the moon as two arcs: an outer semicircle and a terminator ellipse that
either cuts into it (crescent) or extends it (gibbous). The terminator's
sweep flag is inverted for every case.

`astro-card.tsx:270`:

```ts
const termSweep = (isWaxing && isCrescent) || (!isWaxing && !isCrescent) ? 1 : 0;
```

Consequences, by phase:

| Input              | `termRx` | Drawn                                                                  | Should be          |
| ------------------ | -------- | ---------------------------------------------------------------------- | ------------------ |
| 1% waxing crescent | 0.98r    | right half + left bulge ≈ full disc                                    | thin sliver        |
| 75% waxing gibbous | 0.5r     | right half minus a bite                                                | right half + bulge |
| 100% Full Moon     | r        | left half retraced by the terminator, zero area → unlit disc           | full disc          |
| 50% quarter        | 0        | correct — `rx=0` degenerates to a straight line regardless of the flag |

The reported symptom is the first row. The Full Moon case is the same defect
and is equally wrong.

The geometry was invisible to tests because it lives inside a render function.
`src/lib/air-comfort.ts` is the counter-example in this codebase: pure logic in
`src/lib`, 434 lines of tests against it.

## Decision

Invert the flag, extract the math, and honour the viewer's hemisphere.

### Extract to `src/lib/moon.ts`

A pure module. No JSX, no SVG element construction — it returns the numbers
that the `<path>` needs.

```ts
export type MoonGeometry = {
  /** Terminator ellipse x-radius, 0…r. */
  termRx: number;
  /** SVG sweep flag for the outer semicircle. */
  outerSweep: 0 | 1;
  /** SVG sweep flag for the terminator arc. */
  termSweep: 0 | 1;
};

export function isWaxing(phase: string): boolean;
export function moonGeometry(
  illumination: number,
  phase: string,
  lat: number,
  r: number,
): MoonGeometry;
export function moonLitPath(g: MoonGeometry, cx: number, cy: number, r: number): string;
```

`astro-card.tsx` imports these; `MoonBodyShapes` becomes a thin renderer.

### Southern hemisphere

A waxing moon is lit on the right from Berlin and on the left from Sydney.
`location.lat` is already on `WeatherLocation` but is not currently passed to
`AstroCard`. Thread it: `grid.tsx:55` gains `lat={c.location.lat}`, and
`AstroCard` passes it to both `Arc` and the `MoonGlyph` in the tab button.

`outerSweep` flips when `lat < 0`. `termSweep` flips with it — the terminator
must always sit on the same side as the outer arc's opening.

### Phase strings

WeatherAPI emits eight values: `New Moon`, `Waxing Crescent`, `First Quarter`,
`Waxing Gibbous`, `Full Moon`, `Waning Gibbous`, `Last Quarter`,
`Waning Crescent`. The existing predicate matches `waxing` or `first`, which
classifies all eight correctly. `phaseLower === "new moon"` in that predicate is
inert — at `k=0` the terminator retraces the outer arc and encloses zero area
under either flag — but keep it and document why rather than leaving a reader to
re-derive it.

## Acceptance criteria

- `src/lib/moon.test.ts` asserts geometry for all eight phase strings at their
  representative illuminations, plus `k=0` and `k=100`, in both hemispheres.
- Full Moon renders a fully lit disc. 1% waxing crescent renders a sliver on the
  right in the northern hemisphere, on the left in the southern.
- Illumination is clamped to 0…100 before use, as today.
- No visual change to the sun view.

## Out of scope

Moon rise/set arc position (the glyph sits at the arc's apex regardless of time
of night). Libration, apparent size, eclipse states.
