# Issue 005 — Hourly Temp/Precip switch

**Depends on:** 002
**Source:** original item 4

## Problem

Each hourly slot (`hourly-card.tsx:97`) crams four readings into 80px: hour,
condition icon, a temperature pair, and rain chance. Precipitation is a
percentage with no amount, and snow is not represented — a slot at −4°C with
`chance_of_rain: 0` shows a struck-through droplet while 3cm of snow falls.

The temperature pair was written as a high and a low: it prints
`Math.max(tempC, feelsLikeC)` large and the minimum small, and collapses to one
number when the two are within 2°. Both halves are wrong. They are not a high
and a low — they are the temperature and the feels-like — so a windy hour puts
the feels-like where the temperature belongs, an unlabelled second number reads
as a low, and a reader cannot tell an omitted feels-like from an equal one.

All 24 columns are 80px with a hairline between each pair and 6px between all
four rungs, so nothing anchors the eye and reading one rung across the strip
means counting columns.

## Decision

Two modes on a switch in the card header. Each mode gets the slot's full
vertical space.

### Why two, not three

Snow is not a dimension of an hour the way temperature and precipitation are —
it is a property of that hour's precipitation, and `will_it_snow` is a per-hour
flag. A Snow mode would be blank for 22 of 24 slots on a typical snowy day, and
a control whose option count depends on the payload changes shape under the
reader.

### Modes

**Temp** — the temperature large, the feels-like under it. Both, every hour.

The temperature always leads: the second reading is an interpretation of the
first, not a bound on it. Neither is ever dropped. The old `< 2°` collapse hid
a real 1° gap and left "omitted" and "equal" indistinguishable, and dropping
the line only on equality has the same defect in smaller form — an hour where
the two agree says so by printing the same number twice, which is a fact about
the hour rather than a gap in the table.

The feels-like carries the `PersonStandingIcon` the Now tile puts beside
`Feels like`, not the word. The reader learns the glyph from the tile above,
and the row does not spend 24 repetitions of `Feels` saying what one icon says.

**Precip** — chance large, amount small. Each slot picks its own icon and unit
from that hour's flags:

| Hour                          | Renders                             |
| ----------------------------- | ----------------------------------- |
| `willItSnow`                  | `chanceOfSnow`, snowflake, `snowCm` |
| `willItRain`                  | `chanceOfRain`, droplet, `precipMm` |
| `chanceOfSnow > chanceOfRain` | `chanceOfSnow`, no amount           |
| neither flag                  | `chanceOfRain`, no amount           |

`willItSnow` wins when both flags are set — a reader planning around sleet cares
about the snow. The chance comparison is what catches the failure in the
problem statement: upstream reports `chanceOfRain: 0` for the −4°C hour with
snow falling, so the flags alone would still call it a dry hour.

A dry hour prints `0%`, at the same size and in the same place as every other
chance, rather than the `DropletOffIcon` it shows today. The value rung is the
row the eye runs along; a glyph in the middle of it breaks the run, and a
stretch of zeros is the shape of "nothing until this evening".

### The control

Extract `TabButton` from `astro-card.tsx:58` into a shared component and use it
in both cards. Two round icon buttons with `aria-pressed`, right-aligned against
the `Hourly` label. The astro tile already teaches this gesture in the same
grid; a second toggle idiom would teach a competing one, and copy-pasting the
component would leave two places to fix.

`ThermometerIcon` and `DropletIcon`, matching `now-card.tsx`'s existing icon
vocabulary.

Default mode is Temp.

### The strip

Modes alone do not fix the packing. The strip becomes a table, so that reading
one rung across the hours is as easy as reading one hour down its column:

- **Wider columns.** 88px rising to 104px at `sm`, up from a flat 80px.
- **Rules are the structure.** A hairline between every pair of columns and one
  under every column head, meeting at the corners into a grid. 8% of the
  foreground in day, 7% white in night — declared directly rather than through
  the `divide-foreground/6` utility, whose night override is `!important` and
  would flatten the day-break rule with it.
- **No column has a field of its own.** Every hour sits on the tile's own
  surface. Nothing in the grid is picked out over anything else, and no reading
  is encoded in a background.
- **Two groups.** 8px between the hour and its condition icon, 4px inside the
  reading, 24px between the two with the head rule through the middle of it.
  Both reading rungs are fixed-height boxes, so a column whose precipitation
  has no amount holds itself open.
- **The date rollover takes a heavy rule**, roughly three times the weight of
  the hairlines around it, and its column takes the weekday in place of the
  hour label at full foreground. The hour stays in the accessible name.

The scroll edges fade rather than hard-cutting a column mid-word, on whichever
side has hours behind it, and the arrows page by 80% of the visible width
instead of a fixed 180px.

### Mode persistence

The mode is component state. After 009 removes the grid's remount key, it
persists across city changes — the same as the astro tile's sun/moon view. That
is intended: switching cities should not reset how you are reading the data.

## Acceptance criteria

- Switching modes does not change the card's height or the strip's scroll
  position.
- `TabButton` has exactly one definition, imported by both cards.
- Every slot has an accessible name for its reading in both modes; the icons are
  `aria-hidden`.
- The temperature leads in every column, including hours where the feels-like
  is higher, and both readings print in every column.
- A slot with `willItSnow` renders cm, never mm.
- The precipitation amount is formatted by one function shared with the hero's
  chips.
- No column carries a background of its own in either cascade.
- The column rules, the head rule, and the day-break rule are each defined in
  the day and the night cascade.

## Out of scope

Charting the hourly series. Extending the window beyond 24 hours. Wind or
humidity modes.
