# Issue 004 — Precipitation strip in the hero

**Status:** Done — `fb485d4`
**Depends on:** 002
**Source:** original item 3

## Problem

`Chance of rain` is the fourth row of the Now card (`now-card.tsx:56`). It is a
**daily** figure — `day.daily_chance_of_rain` — sitting under a heading that
says `Now`, between two readings that are genuinely instantaneous. It is in the
wrong tile.

The snow fields the API returns are not used at all.

### The conflict this has to resolve

`now-card.tsx:14` records why the Now card exists: _"The four readings that used
to sit in the hero's foot. They moved out so the hero carries only what it says
in words."_ `hero-card.tsx:12` describes three rungs — PEAK, SPOKEN, CLOCK — all
typographic.

Moving a percentage into the hero reverses that decision. It is only defensible
if the reading arrives in a **different register** than the label/value
definition list that was evicted. Otherwise the eviction is undone one row at a
time.

## Decision

A chip strip in the hero's left column, directly under the clock/date line.

The left column is already the "where and when" column — city, country, local
time, date. A whole-day precipitation figure belongs to the same scope. The
right column stays purely "what the sky is doing".

```
Reykjavík
9:42 pm · Tuesday, Aug 12
[droplet] 20% · 4mm   [snowflake] 15% · 2cm
```

Chips, not `<dt>`/`<dd>` rows. Icon plus value, no label text — the icon is the
label. This is a different family from both the Now card's list and the Air
tile's list.

### What renders

| Chip | Visible when            | Chance                               | Amount                                              |
| ---- | ----------------------- | ------------------------------------ | --------------------------------------------------- |
| Rain | always                  | `today.chanceOfRain`, including `0%` | `today.totalPrecipMm`, only when `today.willItRain` |
| Snow | `today.willItSnow` only | `today.chanceOfSnow`                 | `today.totalSnowCm`, always when the chip shows     |

The booleans gate the **amount**, not the chance. This uses every field and
avoids printing `0mm`, which is a second way of saying `0%`. It also degrades
correctly when the vendor disagrees with itself — `chanceOfRain: 70` with
`willItRain: 0` renders `70%` with no amount rather than a contradiction.

Rain chance shows at `0%` deliberately: "no rain today" is an answer, and its
absence would be ambiguous with a missing payload.

### Late arrival

The hero paints from the `current` tier. These fields arrive with the
`forecast` tier. The strip is therefore a late-arriving element inside the LCP
element.

Reserve the row's height from first paint and shimmer the values, exactly as
`now-card.tsx:79` does today. LCP must not move and CLS must stay at 0.004.

Do not conditionally mount the strip on data arrival — that is a layout shift
inside the largest contentful element.

Because the snow chip's visibility depends on data, its slot is reserved too:
the strip's height is the same whether one chip or two render.

### Now card

Drop the `Chance of rain` row and the `chanceOfRain` prop. The card becomes
three metrics — Temperature, Feels like, Wind — plus the alert row from 003.

## Acceptance criteria

- LCP and CLS unchanged against the current build.
- Rain chip renders at `0%`.
- Snow chip is absent when `willItSnow` is false, at any `chanceOfSnow`.
- Strip height is identical with one chip and with two.
- Icons are `aria-hidden`; each chip has an accessible name
  ("Chance of rain, 20 percent, 4 millimetres").
- `now-card.tsx` no longer accepts `chanceOfRain`.

## Out of scope

Precipitation on the 3-day forecast cards. Hourly precipitation — that is 005.
