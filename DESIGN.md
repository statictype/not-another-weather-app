---
name: air
description: A view onto one city's sky, read through frosted panes that track that city's local time.
colors:
  cobalt: "oklch(0.6800 0.1500 235)"
  sea-glass: "oklch(0.8200 0.1100 200)"
  wet-slate: "oklch(0.2600 0.0700 245)"
  frosted-pane: "oklch(0.9750 0.0180 235)"
  hairline: "oklch(0.9288 0.0126 255.5078)"
  focus-violet: "oklch(0.5854 0.2041 277.1173)"
  signal-red: "oklch(0.6368 0.2078 25.3313)"
  smoked-glass: "oklch(0.13 0.008 250)"
  night-ink: "oklch(0.95 0.008 240)"
  sky-day: "#D2EEF9"
  sky-day-far: "#B4D9EF"
  hero-day: "oklch(0.6152 0.2108 256.10)"
  hero-day-deep: "oklch(0.4550 0.1850 264)"
  hero-lamp: "#00C4FF"
  ink-well: "oklch(0.1871 0.0557 253.85)"
  ink-well-far: "oklch(0.1176 0.0289 243.78)"
  sev-extreme: "oklch(0.485 0.215 22)"
  sev-severe: "oklch(0.565 0.215 32)"
  sev-moderate: "oklch(0.734 0.179 56)"
typography:
  display:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "2.125rem → 3.5rem"
    fontWeight: 300
    lineHeight: 1.05
    letterSpacing: "-0.055em"
  headline:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 300
    lineHeight: 1.25
    letterSpacing: "-0.055em"
  title:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 300
    lineHeight: 1.375
    letterSpacing: "-0.055em"
  figure:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.055em"
  body:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.03em"
  caption:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.03em"
  label:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.18em"
  label-sub:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.18em"
rounded:
  well: "0.75rem"
  control: "1rem"
  tile: "1.75rem"
  hero: "2rem"
  panel: "2.25rem"
  pill: "999px"
spacing:
  base: "0.25rem"
  tile-pad: "1.25rem"
  tile-pad-sm: "1.5rem"
  hero-pad: "1.5rem"
  hero-pad-xl: "3rem"
  page-x: "1.25rem"
  page-x-sm: "2rem"
components:
  tile:
    textColor: "{colors.wet-slate}"
    rounded: "{rounded.tile}"
    padding: "{spacing.tile-pad}"
  tile-now:
    textColor: "{colors.wet-slate}"
    rounded: "{rounded.tile}"
    padding: "{spacing.tile-pad}"
  hero:
    backgroundColor: "{colors.hero-day}"
    textColor: "#ffffff"
    rounded: "{rounded.hero}"
    padding: "{spacing.hero-pad}"
    typography: "display"
  search-surface:
    textColor: "{colors.wet-slate}"
    rounded: "{rounded.tile}"
    padding: "0.75rem 1.25rem"
    typography: "title"
  panel:
    textColor: "{colors.wet-slate}"
    rounded: "{rounded.panel}"
    padding: "1.5rem"
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-ghost:
    textColor: "{colors.wet-slate}"
    rounded: "{rounded.control}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  tab-button:
    textColor: "{colors.wet-slate}"
    rounded: "{rounded.pill}"
    height: "2.25rem"
---

# Design System: air

> **Wordmark unresolved.** The name is `air`; a logo is planned. The header
> shows a 😶‍🌫️ emoji in a fixed box (56 / 80 / 96 px by breakpoint) that
> `SLIDE_XS/SM/MD` in `search-bar.tsx` slide across — a logo that changes the box
> changes those constants too. `README.md`, `index.html`, `package.json` and
> `wrangler.jsonc` still carry older names.

## Overview

**Creative North Star: "The Window Seat"**

The page is a view onto one city's actual sky. A fixed, full-bleed gradient sits
behind everything and crossfades over 1.2 s between a day and a night
composition, driven by that city's local time — never the viewer's OS
preference. That layer is the subject. Everything above it is the pane you read
the subject through.

Every surface therefore admits some of what is behind it: tiles, the search
field, the dropdown and the mobile overlay are translucent, blurred and
saturated (`backdrop-filter: blur(20–28px) saturate(140–160%)`). Two surfaces
are exempt, and both because they are pictures rather than panes — the hero,
which is the view itself, and the astro tile, which draws a sky of its own.

**Key Characteristics:**

- One typeface (Work Sans) at 300, 400 and 500, on eight size rungs.
- Two ink levels: `foreground` and `foreground/70`. Nothing between them.
- Hierarchy is size, then weight. Never opacity.
- Cool blue-violet is the only hue family; the severity ramp is the exception.
- Day is lit from the lower right. Night is lit by a diagonal sheen.

## Colors

One cool hue family from 195° to 280° in OKLCH at two lightness extremes. Chroma
stays at or below 0.04 on every pane and is spent only on the pictures: the sky,
the hero, the astro tile.

**Primary.** Cobalt (`{colors.cobalt}`) is the interactive blue — the `primary`
token, so filled buttons, links and selection. It fills exactly one control in
the app, the error state's retry; the only other filled button is the
clear-history confirm, which takes `destructive`. Sea Glass
(`{colors.sea-glass}`) is the `accent` token: the ghost and outline hover wash,
never a text color.

**Neutral, day.** Frosted Pane (`{colors.frosted-pane}`) ground, Wet Slate
(`{colors.wet-slate}`) text, Hairline (`{colors.hairline}`) border.

**Neutral, night.** The same roles under `.night` on the app root: Smoked Glass
(`{colors.smoked-glass}`) ground, Night Ink (`{colors.night-ink}`) text, every
border white at 6–10% alpha.

**The pictures.** Day sky `{colors.sky-day}` → `{colors.sky-day-far}`. Day hero
`{colors.hero-day-deep}` → `{colors.hero-day}`, lit by `{colors.hero-lamp}`
parked past the lower-right corner; the Now tile takes that same lamp at a third
of its strength, which is what ties the two together. Night hero
`{colors.ink-well-far}` → `{colors.ink-well}` under a 45° sheen.

### Named Rules

**The Colorless Encoding Rule.** Color never carries a reading that words are
not already carrying. Not comfort, not temperature, not air quality. Binding.

**The One Hue Family Rule.** Every surface, border, text and shadow color lands
between 195° and 280°. Warm hues are licensed for two things only: destructive
confirmation (`{colors.signal-red}`) and severe-weather alerts.

**The Severity Ramp.** Three hues, not three intensities of one — crimson at
`extreme`, red at `severe`, orange at `moderate`; `minor` and `unknown` take no
warm color. The hue never carries the severity alone: the icon shape separates
the two red steps, the word prints on the modal chip, and the card speaks it.

**The Two Inks Rule.** Text and icons are `foreground` or `foreground/70`.
Rules and dividers are `foreground/10`; tracks, wells and icon plates are
`foreground/6`. One emphasis mark exists at `foreground/25`.

**The 70% Floor.** Text over glass is never faded below 70% of `foreground`.
`.label-section`, `.label-sub` and `.hour-cell` set it with `color-mix`; every
other faded string is `foreground/70`. Contrast over a `backdrop-filter` surface
has to be measured by hand.

## Typography

**One family: Work Sans** (300, 400, 500), loaded from Google Fonts with a
`media="print"` / `onload` swap. No display face, no serif, no monospace.

**Character:** a grotesque with slightly humanist proportions, set light and
tight. Global tracking is `-0.03em`; every rung at 20 px and up tightens to
`-0.055em`. The personality is the gap between very large light type and very
small wide-tracked uppercase labels. There is no third voice.

### Hierarchy

| Role      | Weight | Size       | Where                                                                                 |
| --------- | ------ | ---------- | ------------------------------------------------------------------------------------- |
| Display   | 300    | 34 → 56 px | Hero city, empty state. Class `.type-display`                                         |
| Headline  | 300    | 24 px      | The comfort sentence                                                                  |
| Title     | 300    | 20 px      | Hazard name, dialog titles, error/quota headings, hero condition. Search input at 400 |
| Figure    | 400    | 24 px      | Forecast highs, UV, AQI, wind, pressure. Tabular                                      |
| Body      | 400    | 16 px      | Readings, astro times, menu rows                                                      |
| Caption   | 400    | 14 px      | All supporting text                                                                   |
| Label     | 500    | 12 px      | Section headers. Class `.label-section`                                               |
| Label Sub | 500    | 10 px      | Metric row names. Class `.label-sub`                                                  |

Display is declared in CSS rather than utilities: `cn` drops a `leading-`
written before a `text-`.

### Named Rules

**Words Outrank Figures.** One rung at 24 px holds both the sentence that
answers the question (300) and the numbers supporting it (400). Never a figure
above a word.

**The Step-Down Rule.** Every drop in the hierarchy is a size change; the weight
step at 24 px is the sole exception. Opacity is not a hierarchy tool.

**One Size Per Role, At Every Width.** A rung may change across breakpoints only
if it changes monotonically. A size that steps down at one breakpoint and back
up at the next is drift, not response.

**The Two Labels Rule.** `.label-section` and `.label-sub` differ by size alone,
never by tracking or alpha. A third is a regression.

## Layout

**Container.** `max-w-[1400px]`, centered, `px-5 py-6` rising to `px-8 py-8` at
`sm`. Full viewport height minimum; horizontal overflow hidden so the sky layer
cannot introduce a scrollbar.

**Grid.** One column on mobile, 4 from `sm`, 8 at `lg`, 4 at `xl`, with
`auto-rows-[minmax(150px,auto)]` and a `1.25rem` gap rising to `1.5rem`. The
hero takes 3 of 4 at `xl` beside a 1-wide right column holding the alerts strip
above the Now tile — what is urgent, then what is current. The alerts strip is
the only tile that can be absent.

**Document order is the mobile reading order** — the answer, then the next
hours, then the next days. Desktop composition is restored with `xl:order-*`
only. Place a new tile in the reading order first, then give it a desktop order.

**Density.** Tile padding comes from `--tile-pad` on `.bento-tile`, so the tiles
cannot drift apart: `1.25rem`, rising to `1.5rem` at `sm`. The hero runs
`1.5rem` → `2.5rem` at `sm` → `3rem` at `xl`. Interior rhythm is a `0.25rem`
base scale. Breakpoints are Tailwind defaults; the search menu switches from
mobile overlay to desktop dropdown at 1024.

## Elevation & Depth

Depth comes from the edge of the glass first — a `1px` white rim at 70–80% alpha
in day and 6–10% in night, a `0 1px 0 0 inset` highlight along the top edge, and
the atmosphere going soft through the pane. Shadows are ambient, not structural:
every resting tile casts a short one, and the difference between resting and
overlapping is the shadow's reach, not its presence.

- **Tile** `0 12px 30px -18px oklch(0.4 0.15 240 / 0.25)`; night `oklch(0 0 0 / 0.6)`.
- **Hero** `0 30px 60px -25px` — deeper, because it is the largest surface.
- **Overlay** `0 40px 80px -24px` + `0 16px 32px -10px` — dropdown, mobile panel,
  dialogs. Surfaces over content the user was reading.
- **Focus ring** `0 0 0 3px oklch(0.7 0.12 230 / 0.12)` on `:focus-within`. A
  state response, not elevation.

### Named Rules

**The Two Lights Rule.** Day surfaces that carry a light carry the same one:
`{colors.hero-lamp}` in a radial parked past the lower-right corner, on
`.hero-day` at 0.46 peak alpha and `.tile-now` at 0.34. Night uses a 45° white
sheen at 0.08 instead, on `.hero-night`. A new lit surface picks the rule for
its cascade rather than inventing a third. The astro tiles are the exception:
their bloom sits at `80% 100%` in day and `78% 0%` in night, following the body
on the arc.

## Shapes

Rectangles with generous, uniform corners. No cut corners, no asymmetric radii,
no clipping paths, no non-rectangular silhouettes.

Icon wells and badges `0.75rem`, buttons and inputs `1rem`, every tile
`1.75rem`, the hero `2rem`, dialogs and the search dropdown `2.25rem`, tab and
step buttons `999px`.

Borders are one of two things: a white-alpha rim on a glass surface, or a
`foreground/10` hairline dividing content inside a tile. Solid opaque borders do
not appear.

**The Soft Container Rule.** Precise content, forgiving container: wide-tracked
uppercase labels and exact numerals inside high-radius translucent panes. Every
tile is `1.75rem` whatever its height — a short tile does not get a smaller
corner.

## Components

### Tiles

The primary surface: `.bento-tile` plus an optional variant. `1.75rem` radius,
transparent 1px border, padding from `--tile-pad`. Day fill
`linear-gradient(160deg, oklch(1 0 0 / 0.9), oklch(0.97 0.03 230 / 0.5))`; night
the same geometry at `oklch(0.17 0.012 255 / 0.9)` → `oklch(0.15 0.015 260 / 0.6)`
with a white 6% rim. Anatomy is a `.label-section` header, then content.

Variants: `.tile-now` (the day lamp on cool white glass), `.tile-astro` /
`.tile-astro-moon` (a drawn sky — sun and moon share one geometry per cascade
and differ by bloom hue), `.tile-alert` (the severity plate).

**A variant is declared in `index.css`, never as a utility.** `.bento-tile` sets
`background`, `border` and `padding` in an unlayered rule, so those three
properties beat any utility whatever the source order.

### Hero

Not a tile. Full-bleed saturated gradient, white text at full opacity, `2rem`
radius. Two blocks — place on the left, sky on the right — a row from `sm` up
and stacked below it, where the words column is too narrow to hold the city name
on one line.

The condition icon sets `stroke-width` from its size, so the drawn line is
constant: `0.83` at `size-36`, `0.68` at `sm:size-44`, `0.53` at `xl:size-56`,
all ≈5 px on a 24-unit viewBox. Card-sized condition icons hold ≈1.75 px the
same way — `1.05` at `size-10` in the forecast, `1.5` at `size-7` in the hourly.

### The two tiles that are buttons

The Now tile and the alerts strip are the only tiles that are controls, and they
respond alike: the surface lifts on hover and focus, over 150–420 ms.

- **Now** carries the answer — the comfort sentence at Headline, then
  temperature, feels-like and wind as a `foreground/10`-divided list.
- **Alerts** carries a 3 px severity rail on the leading edge, the hazard name at
  Title with `line-clamp-2`, the window end at Caption, and a `+N` count at the
  right. No section label; the hazard names the tile. Hover also underlines it.

### Search surface, dropdown, dialogs

The search field is a `1.75rem` pill, `px-5 py-3`, white at 45% in day and 6% in
night; on `:focus-within` fill and rim step up ~0.15 alpha and a 3 px ring
appears, over `0.3s`. Inside: a 20 px icon at `foreground/70`, then a borderless
transparent input at Title size.

The dropdown and all dialogs share one chrome — `2.25rem` radius,
`blur(28px) saturate(160%)`, the Overlay shadow — and become bottom sheets below
`sm`. The dialog scrim is a tinted blur, not a black slab:
`oklch(0.34 0.055 250 / 0.34)` with `blur(6px) saturate(105%)`, and
`oklch(0.09 0.02 255 / 0.58)` in night. Menu rows are `px-3 py-3` with a
`size-8` well at `foreground/6` and a focus pill that springs between rows.

### Buttons and icons

Buttons are vendored shadcn primitives in `src/components/ui/` — do not refactor
them wholesale. `1rem` radius, `h-9 px-4`; primary takes the Cobalt fill, ghost
the Sea Glass hover wash, focus a 3 px ring at `{colors.focus-violet}` (the one
token outside the hue band, kept because it is the primitives' `--ring`). The
unit toggle and astro switch are a separate family: a 36 px round control,
`foreground/10` when active.

Icons are Lucide at `1.75` stroke and `size-4` unless the surface says
otherwise. Condition icons set stroke from size instead.

## Do's and Don'ts

### Do:

- **Do** build hierarchy with the size step. Eight rungs are declared; use one.
- **Do** keep text over glass at or above 70% `foreground`, and verify by
  measurement. Every app surface sits on a `backdrop-filter`, so the composited
  ground is not a value a checker can read off the element.
- **Do** place a new tile in the correct mobile reading order first, then give it
  an `xl:order-*`.
- **Do** let a new surface be translucent. `blur(20–28px) saturate(140–160%)`
  with a white-alpha rim is the material.
- **Do** define every state a variant has. In a two-cascade system a two-state
  tile is four rules, not three.
- **Do** treat the day/night switch as driven by the located city's local time.
  `@custom-variant dark` is scoped to a `.dark` class this app never applies.
- **Do** guard new motion with `prefers-reduced-motion`, as every existing
  animation does.

### Don't:

- **Don't** encode a reading in color.
- **Don't** introduce a second typeface, a serif, or a monospace face.
- **Don't** add a size, weight, ink level or radius that is not on the scales
  above. A one-off `text-[15px]` or `foreground/55` is drift by default.
- **Don't** fade text to create hierarchy.
- **Don't** reach for a raw Tailwind palette color (`sky-500`, `rose-300`).
- **Don't** build generic SaaS card UI — opaque white cards, gray hairlines,
  8 px radius. The large radius and the translucency are the system.
- **Don't** illustrate weather in the card layer. Condition is a line icon and a
  sentence. This does not bind the sky layer: procedural weather effects and
  time-of-day lighting behind the composition are planned, and when they land the
  glass keeps its tint and the contrast floors still hold over moving footage.
- **Don't** treat night as a dark mode. It is a full second cascade, equal in
  standing to day — the same room at a different hour.
