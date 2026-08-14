# Issue 009 — City-change morph

**Status:** Not started
**Depends on:** 008
**Source:** original item 1

## Problem

Changing city currently reads as a page reload: the grid remounts, every card
replays a fade-and-rise, and the whole surface dims to `opacity-60` while the
fetch is in flight (`grid.tsx:34`). The information is the same shape before and
after — only the values change — so a teardown misrepresents what happened.

## Decision

Nothing unmounts. Each card animates from its old values to its new ones.

### Timing is the data, not a timeline

The three tiers land at different moments and the morph follows them:

| Tier        | Resolves       | Morphs                                                  |
| ----------- | -------------- | ------------------------------------------------------- |
| `current`   | first          | hero, Now card, air comfort tile                        |
| `forecast`  | second         | hourly strip, 3-day forecast, astro tile, exposure tile |
| `yesterday` | last, or never | the yesterday column only                               |

The stagger is real — it is the actual arrival order the three-tier split exists
to produce. It is not a decorative delay, and it must not be replaced by one:
holding the hero until `forecast` lands would discard the LCP advantage the
whole backend architecture is built for.

**Every card gates on `!query.isPlaceholderData`.** With
`placeholderData: keepPreviousData` there is a window where `isSuccess` is true
while `data` still points at the previous city. A morph triggered in that window
animates to the old values and then jumps. This is the same trap documented for
the history-commit effect in `CLAUDE.md` and `docs/architecture.md`.

### Per-element treatment

| Element                                                    | Treatment                                                                                             |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| City name, country                                         | `AnimatedText` scramble, ~400 ms                                                                      |
| Temperature, feels-like, wind, humidity, pressure, UV, AQI | `RollingNumber` from old to new                                                                       |
| Condition icon                                             | Crossfade with a slight scale and rotation between old and new icon                                   |
| Comfort sentence, condition text                           | Crossfade — they are prose, and scrambling a sentence is noise                                        |
| Pressure gauge, UV/AQI bars                                | `animate` on `pathLength` / width from old to new                                                     |
| Sun/moon arc                                               | Animate the glyph's position along the arc; the arc itself does not redraw                            |
| Hourly strip                                               | Values morph in place, stagger ~30 ms per slot left to right; the strip's scroll position resets to 0 |
| Forecast rows                                              | Values morph in place, stagger ~40 ms per row                                                         |
| Sky / tile day-night treatment                             | Crossfade the background when `timeOfDay` flips; never a hard cut                                     |

### The stale dim goes

`isStale && "opacity-60"` is deleted. Dimming the whole surface is the strongest
"this page is reloading" signal on screen, and the morph now carries the same
information. `aria-busy` stays.

### Condition icons are not path-morphed

`ConditionIcon` renders lucide components. `SunIcon` is a `<circle>` plus eight
`<line>` elements; `CloudIcon` is a single `<path>`. There is nothing to
interpolate between them — genuine morphing would require replacing the icon set
with hand-authored single-path SVGs with comparable point counts, which is a
drawing project, not a code change. Crossfade with scale and rotation reads as a
transformation at the sizes used (`size-28` to `size-40` in the hero) and costs
nothing.

If single-path condition icons are ever authored, path morphing becomes a
follow-up against `motion`'s path interpolation — no new dependency needed then
either.

## Acceptance criteria

- No card unmounts on a city change; assert stable element identity across the
  transition.
- No morph is triggered while `isPlaceholderData` is true.
- Under reduced motion: values crossfade, nothing rolls, scrambles or moves.
- Screen reader announces the new city once (per 008), never a digit sequence.
- A city change with a warm edge cache does not flash a skeleton — old values
  morph straight to new ones.
- The hero morphs before the hourly strip does. This is asserted, not assumed.

## Out of scope

Route transitions (there is one route). Animating the search menu — that is 010.
Background video — that is 011.
