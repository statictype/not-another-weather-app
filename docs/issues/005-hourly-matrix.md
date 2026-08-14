# Issue 005 — Hourly reading matrix

**Status:** Done — switch landed in `089490f`, replaced by the table in `2a664b8`
**Depends on:** 002
**Source:** original item 4

## Problem

Each hourly slot crammed four readings into 80px: hour, condition icon, a
temperature pair, and rain chance. Precipitation was a percentage with no
amount, and snow was not represented — a slot at −4°C with `chance_of_rain: 0`
showed a struck-through droplet while 3cm of snow fell.

The temperature pair was written as a high and a low: it printed
`Math.max(tempC, feelsLikeC)` large and the minimum small, and collapsed to one
number when the two were within 2°. Both halves are wrong. They are not a high
and a low — they are the temperature and the feels-like — so a windy hour puts
the feels-like where the temperature belongs, an unlabelled second number reads
as a low, and a reader cannot tell an omitted feels-like from an equal one.

All 24 columns were 80px with a hairline between each pair and 6px between all
four rungs, so nothing anchored the eye and reading one rung across the strip
meant counting columns.

## Decision

All three readings on screen at once, as rows of a table with the 24 hours as
columns.

### Why not a mode switch

The first version of this issue put temperature and precipitation behind a
two-button switch in the card header. It was built (`089490f`) and then removed
(`2a664b8`).

The switch was the problem it was solving. "Will it be warm" and "will it rain"
are one question about an afternoon, and a control that answers half of it at a
time makes the reader hold one answer while fetching the other. Three rows at
once is also the shorter tile: each mode had to fill the slot's full vertical
space to earn the switch above it.

### The rows

Declared once, in `ROWS`. The gutter and the table body both map that array, so
a row cannot exist on one side and not the other, and the icon beside a row is
the icon for the numbers on it by construction rather than by matching indices
by hand.

| Row                     | Icon                 | Cell                     |
| ----------------------- | -------------------- | ------------------------ |
| Temperature             | `ThermometerIcon`    | `round(tempC)°`, leading |
| Feels like              | `PersonStandingIcon` | `round(feelsLikeC)°`     |
| Chance of precipitation | `UmbrellaIcon`       | `precipChance(slot)%`    |

The temperature leads — one size larger, at full foreground. The second reading
is an interpretation of the first, not a bound on it. Neither is ever dropped:
an hour where the two agree says so by printing the same number twice, which is
a fact about the hour rather than a gap in the table. The old `< 2°` collapse
hid a real 1° gap and left "omitted" and "equal" indistinguishable.

Row labels are `<th scope="row">`, screen-reader only. The visible label is the
icon, once, in the gutter — the row does not spend 24 repetitions of `Feels`
saying what one glyph says. `PersonStandingIcon` is the glyph the Now tile puts
beside `Feels like`, so the row is read from a label the reader has met.

### Which chance

`precipChance` takes snow over rain when `willItSnow` is set or when
`chanceOfSnow > chanceOfRain`. The comparison is what catches the failure in the
problem statement: upstream reports `chanceOfRain: 0` for the −4°C hour with
snow falling, so the flags alone would still call it a dry hour.

A dry hour prints `0%`, at the same size and in the same place as every other
chance, rather than a `DropletOffIcon`. The row is what the eye runs along; a
glyph in the middle of it breaks the run, and a stretch of zeros is the shape of
"nothing until this evening".

**No amount is printed.** Beside the chance, `100% 24mm` was the widest cell in
the table and set the pitch for all 24 columns. Under it, every row stayed two
lines tall for the two hours of a normal day that have an amount at all. The
day's total is a chip in the hero (004) either way.

### The element

`<table>`, not a row of flex columns. Three readings against 24 hours is a
table, and the element gives every cell a row name and a column name for
nothing — which is what the previous version hand-rolled with a `role="img"` and
a concatenated `aria-label` per column.

- `<caption class="sr-only">The next 24 hours</caption>` carries the accessible
  name. There is no `.label-section` header: every other tile needs one because
  its contents do not name themselves, and a row of clock times under weather
  icons does.
- Column heads are `<th scope="col">` — the hour label and the condition icon
  visibly, plus an sr-only `3 pm, Partly cloudy`.
- The corner cell is zero-width. The visible gutter is outside the table, but
  the column has to exist for the row headers below it.

### The gutter

Row icons sit in a fixed 1.75rem gutter outside the scroller, `aria-hidden`. The
hours clip at its edge, so nothing has to be painted over glass to hide what
would otherwise slide under a sticky column.

### The grid

- `--hour-col-w` 4.5rem, tightening to 4rem at `sm`. `--hour-head-h` 4.6rem,
  `--hour-row-h` 1.9rem.
- Three rule weights, each defined in both cascades: `--hour-rule` (10%
  foreground / 10% white) under the head and between rows, `--hour-rule-col`
  (6% / 6%) between columns, `--hour-rule-break` (22% / 24%) on the rollover.
- **No column has a field of its own.** Every hour sits on the tile's own
  surface. Nothing in the grid is picked out over anything else, and no reading
  is encoded in a background.
- **The date rollover takes the heavy rule**, and its column takes the weekday
  in place of the hour label at full foreground. The hour stays in the spoken
  name (`Thursday, 12 am, …`).

### The controls

Two chevrons, right-aligned in the header — the slot the mode switch used to
occupy. The tile still has one control family; what changed is that it moves the
strip instead of changing what the strip means.

Each press scrolls a whole number of columns:
`floor(clientWidth × 0.8 ÷ colWidth) × colWidth`. Scrolling by a raw fraction of
the viewport leaves the grid half a column off the edge after every press, and
the reader spends the next press correcting it. The 0.8 leaves one column of
overlap so the reader keeps their place. `prefers-reduced-motion` drops the
smooth behaviour.

Each button is disabled when there is nothing past that edge, and the scroller
fades on whichever side has hours behind it (`--hour-fade-l`, `--hour-fade-r`).

`TabButton` stays. It is still the astro tile's sun/moon control and still the
header-control geometry every tile shares; it has one user now instead of two.

### Skeleton

The same table with the readings withheld, at a fixed 24 columns, so the
scroller's extent does not change under the reader when the forecast tier lands.
The gutter renders either way, so the tile measures the same before and after.

## Acceptance criteria

- All three readings render for every column, with no control that shows one at
  a time, and nothing in the card is `aria-pressed`.
- The temperature row carries `.hour-cell-lead` and the feels-like row does not,
  including hours where the feels-like is higher.
- Two readings that round to the same number both print, and a 1° gap prints as
  a 1° gap.
- Every column has an accessible name giving its hour and its condition; the
  rollover column names the weekday and keeps the hour.
- An hour with `willItSnow`, or with `chanceOfSnow > chanceOfRain`, reads the
  snow chance — including when upstream reports `chanceOfRain: 0`.
- A dry hour prints `0%`.
- No cell prints an amount, on screen or in its accessible name.
- Every icon is `aria-hidden`; querying by `img` role returns nothing.
- Both scroll buttons exist, and each is disabled when there is nothing past
  that edge.
- Before the forecast tier lands the card shimmers at the same 24 columns.
- The column rules, the head rule, and the day-break rule are each defined in
  the day and the night cascade.

## Out of scope

Charting the hourly series. Extending the window beyond 24 hours. Wind or
humidity rows. Per-hour amounts — see above.
