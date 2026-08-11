---
name: Weather App
description: A view onto one city's sky, read through frosted panes that track that city's local time.
colors:
  cobalt-glass: "oklch(0.6800 0.1500 235.0000)"
  sea-glass: "oklch(0.8200 0.1100 200.0000)"
  wet-slate: "oklch(0.2600 0.0700 245.0000)"
  frosted-pane: "oklch(0.9750 0.0180 235.0000)"
  pane-white: "oklch(0.9950 0.0040 230.0000)"
  haze: "oklch(0.9550 0.0180 230.0000)"
  haze-ink: "oklch(0.5200 0.0500 245.0000)"
  hairline: "oklch(0.9288 0.0126 255.5078)"
  signal-red: "oklch(0.6368 0.2078 25.3313)"
  focus-violet: "oklch(0.5854 0.2041 277.1173)"
  smoked-glass: "oklch(0.1300 0.0080 250.0000)"
  smoked-glass-raised: "oklch(0.2000 0.0150 250.0000)"
  night-ink: "oklch(0.9500 0.0080 240.0000)"
  night-haze-ink: "oklch(0.7000 0.0100 240.0000)"
  ink-well-near: "#01132b"
  ink-well-far: "#00060f"
  rim-light: "oklch(1 0 0 / 0.8)"
  rim-light-night: "oklch(1 0 0 / 0.10)"
typography:
  display:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "clamp(2.125rem, 4.5vw, 3.5rem)"
    fontWeight: 300
    lineHeight: 1.05
    letterSpacing: "-0.055em"
  headline:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2vw, 1.75rem)"
    fontWeight: 300
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.055em"
  body:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 300
    lineHeight: 1.5
    letterSpacing: "-0.03em"
  label:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.18em"
  label-micro:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.18em"
rounded:
  sm: "0.75rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "1.75rem"
  2xl: "2.25rem"
  3xl: "2.75rem"
  4xl: "3.25rem"
spacing:
  base: "0.25rem"
  tile-gap: "1.25rem"
  tile-gap-lg: "1.5rem"
  tile-pad: "1.75rem"
  hero-pad: "3rem"
  page-x: "1.25rem"
  page-x-lg: "2rem"
components:
  tile:
    backgroundColor: "{colors.pane-white}"
    textColor: "{colors.wet-slate}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
  tile-hero-day:
    textColor: "#ffffff"
    rounded: "2rem"
    padding: "{spacing.hero-pad}"
    typography: "display"
  tile-hero-night:
    backgroundColor: "{colors.ink-well-far}"
    textColor: "#ffffff"
    rounded: "2rem"
    padding: "{spacing.hero-pad}"
    typography: "display"
  search-surface:
    textColor: "{colors.wet-slate}"
    rounded: "{rounded.xl}"
    padding: "0.875rem 1.25rem"
  dropdown-panel:
    textColor: "{colors.wet-slate}"
    rounded: "{rounded.2xl}"
    padding: "1rem 0.75rem 0.75rem"
  button-primary:
    backgroundColor: "{colors.cobalt-glass}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-ghost:
    textColor: "{colors.wet-slate}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-ghost-hover:
    backgroundColor: "{colors.sea-glass}"
    textColor: "{colors.wet-slate}"
  input-search:
    textColor: "{colors.wet-slate}"
    rounded: "{rounded.md}"
    padding: "0"
    height: "auto"
    typography: "headline"
---

# Design System: Weather App

> The product name is unresolved. `README.md` says "Oasis"; `index.html` and
> `package.json` say "not another weather app". This file uses a neutral name
> and takes no position. Resolve it before it reaches any visible surface.

## Overview

**Creative North Star: "The Window Seat"**

The page is a view onto one city's actual sky. A fixed, full-bleed gradient
sits behind everything and crossfades over 1.2 s between a day and a night
composition, driven by that city's local time — not the viewer's OS
preference. That layer is the subject. Everything above it is the pane you
read the subject through.

Every surface therefore admits some of what is behind it. Tiles, the search
field, the dropdown, and the mobile overlay are all translucent, blurred,
and saturated (`backdrop-filter: blur(20–28px) saturate(140–160%)`). Nothing
in the composition is opaque. The one exception proves the rule: the hero is
not frosted, because the hero is not a pane — it is the view itself, and it
carries a saturated gradient of its own.

Depth comes from the edge of the glass, not from a shadow under it. A pane is
present because its rim catches light (`1px oklch(1 0 0 / 0.8)` top edge, plus
an inset highlight), and because the atmosphere behind it goes soft through
its thickness. Shadows are reserved for surfaces that genuinely stack over
other content.

**Key Characteristics:**

- One typeface (Work Sans), one weight range (300–500), used at six sizes.
- Hierarchy is built from size and position. Never from opacity below 70%.
- Radius is generous everywhere: 1 rem on the smallest control, 2 rem on the hero.
- Cool blue-violet is the only hue family; `signal-red` is the only exception.
- Two full cascades, day and night, both first-class. Neither is the default.

## Colors

A single cool hue family from 195° to 260° in OKLCH, run at two lightness
extremes. Chroma stays low on every surface (≤ 0.04) and is spent only on the
hero and the sky.

### Primary

- **Cobalt Glass** (`{colors.cobalt-glass}`): the interactive blue. Filled
  buttons, link text, text selection. Appears on well under 10% of any screen —
  the app has almost no filled controls.
- **Sea Glass** (`{colors.sea-glass}`): the hover and highlight wash. Ghost and
  outline button hover, `accent` surfaces. Never used as a text color.

### Neutral — day cascade

- **Frosted Pane** (`{colors.frosted-pane}`): the page ground. Also the literal
  `background` on `html, body`, so the sky layer has a matching base while it
  paints.
- **Pane White** (`{colors.pane-white}`): card and popover fill in the token
  layer. Most real surfaces override this with a white-alpha gradient instead.
- **Wet Slate** (`{colors.wet-slate}`): all body and heading text in day mode.
- **Haze** / **Haze Ink** (`{colors.haze}` / `{colors.haze-ink}`): muted surface
  and muted text.
- **Hairline** (`{colors.hairline}`): `border` and `input` borders in the token
  layer. Glass surfaces override it with white-alpha rims.

### Neutral — night cascade

Scoped under `.night` on the app root. Same roles, inverted.

- **Smoked Glass** (`{colors.smoked-glass}`): the night page ground.
- **Smoked Glass Raised** (`{colors.smoked-glass-raised}`): night card fill.
- **Night Ink** / **Night Haze Ink** (`{colors.night-ink}` /
  `{colors.night-haze-ink}`): foreground and muted foreground.
- **Rim Light Night** (`{colors.rim-light-night}`): every night border is white
  at 6–10% alpha, never a solid color.

### Tertiary — the hero

The hero does not use the token palette. It carries the only two saturated
fields in the product, apart from the alerts tile at `extreme`, which takes
`--alert-fill` across its whole surface. That was the point of the change: at
the top severity the warning outranks the view, and nothing quieter than a
filled field says so beside a hero this size.

- **Day hero**: a top-right linear gradient, `blue-700 → sky-800 → sky-800`,
  with two blurred radial bloom shapes over it (`white/10` upper right,
  `cyan-300/20` lower left).
- **Ink Well** (`{colors.ink-well-near}` → `{colors.ink-well-far}`): the night
  hero, a 135° gradient with a faint 45° white sheen across the diagonal.

### Named Rules

**The Colorless Encoding Rule.** Color never carries a reading that words are
not already carrying. The OKLCH air-comfort mood tint was withdrawn in August
2026 because six hue buckets read as decoration while the sentence beside them
said the same thing in English. Do not reintroduce hue as a data channel — not
for comfort, not for temperature, not for AQI. Binding.

**The One Hue Family Rule.** Every surface, border, text, and shadow color in
the system lands between 195° and 280° in OKLCH. The warm ramp around 27–35°
is the sole exception, and it is licensed for exactly two things:
destructive confirmation (`signal-red`, `{colors.signal-red}`) and
severe-weather alerts (the `--alert-*` ramp). Nothing else may reach for a
warm hue. Amended August 2026 when alerts shipped; the previous wording named
destructive confirmation alone.

**The Alert Ramp.** Severity is drawn at three intensities, not five:
`--alert-fill` (filled, `extreme`), `--alert-wash` + `--alert-ink` (tinted,
`severe`), and `--alert-ink-muted` (muted text, `moderate`). `minor` and
`unknown` stay neutral and take no warm color at all. The icon shape
separates the two severities that share a step — `OctagonAlertIcon` for
`extreme`, `TriangleAlertIcon` for `severe` and `moderate`, `InfoIcon` below
them. This does not reopen The Colorless Encoding Rule: the event text names
the hazard and the severity word is printed as a chip in the modal and spoken
on the plate, so the color repeats a reading rather than carrying one. Both
cascades are declared in `src/index.css` and measured — 5.20–5.86:1 in day,
6.71–8.84:1 in night, against the composited tile grounds.

On the card the ramp is the tile's own field, not a badge sitting on glass:
`.tile-alert-fill` for `extreme`, `.tile-alert-tint` for `severe`, and
`.tile-alert-plain` for `moderate` and below, which take no warm hue and get a
neutral `foreground` rim instead so they still read as their own surface.

**A wash is not a tint at tile scale.** `--alert-wash` is 9% and was
calibrated for a badge on white glass; spread across a whole tile beside the
plain tiles it disappears. The tinted step therefore has its own stops —
`--alert-tile-near` / `--alert-tile-far`, built like `.tile-wind`'s gradient
and held light enough that `--alert-ink` still clears AA over the darker one
(5.13:1 near, 4.95:1 far in day; 7.81:1 and 9.12:1 in night). `--alert-wash`
keeps its original job on the modal chips.

Hover moves along the ramp rather than fading the surface: `extreme` steps to
`--alert-ink` (day 0.55 → 0.52 lightness, night 0.70 → 0.80, so contrast with
`--alert-fill-ink` rises either way — 5.20 → 5.89:1 and 6.71 → 9.02:1). The
tinted and plain steps move their rim only, and the hazard name underlines at
every severity. Deepening the tint on hover was measured first and rejected:
4.34:1 in day, 4.67:1 in night. Element opacity is out for the same reason —
it composites ink and field together toward the page behind and costs contrast
in a state WCAG still applies to.

**The 70% Floor Rule.** Text composited over a glass tile is never faded below
70% alpha of `foreground`. At 70% it measures 5.3–5.5:1 over the day tile
gradients; the 40–60% range this system used previously measured 2.3–4.1:1 and
failed WCAG AA throughout day mode. Lighthouse scored accessibility 100 the
whole time, because axe cannot resolve a background behind `backdrop-filter`
and skips those nodes. Automated tooling will not catch a regression here. Use
the size step to build hierarchy instead.

> **Known drift.** `{colors.focus-violet}` (277°) is the `--ring` token, used by
> every `focus-visible` state on the vendored shadcn primitives. It sits outside
> the 195–260° band the rest of the palette occupies. It is documented, not
> endorsed.

## Typography

**One family: Work Sans** (300, 400, 500, 600, 700), loaded from Google Fonts
with a `media="print"` / `onload` swap. `system-ui, sans-serif` is the fallback.

There is no display face, no serif, and no monospace face. Aliases for all
three previously existed in `@theme` and every one of them resolved back to
Work Sans, so `font-serif` was not a serif and `font-mono` was not monospace.
They were removed. `--font-mono` remains as a real system stack but nothing
uses it.

**Character:** a grotesque with slightly humanist proportions, set light and
tight. Global letter-spacing is `-0.03em`; the display role tightens further to
`-0.055em`. The system's whole personality comes from the gap between very
large light text and very small wide-tracked uppercase labels — there is no
third voice.

### Hierarchy

- **Display** (300, `2.125rem → 3.5rem` across breakpoints, `1.05`,
  `-0.055em`): the hero's city name, temperature, and comfort sentence, plus
  the empty state's question. All three hero items share one declared constant
  so none can be sized independently.
- **Headline** (300, `1.25rem → 1.75rem`, `1.25`): the condition text beside
  the hero icon, and the search input. The middle rung — 28 px against 56 px
  peaks and 16 px support at `xl`.
- **Title** (400, `1.875rem`, `1`, `-0.055em`): forecast day temperatures.
- **Body** (300, `0.875rem → 1rem`, `1.5`): all supporting text. Light weight,
  never regular.
- **Label** (500, `0.75rem`, `0.18em`, uppercase, `foreground` at 70%): tile
  headers and section headers. Class `.label-section`.
- **Label Micro** (500, `0.625rem`, `0.18em`, uppercase, `foreground` at 70%):
  the sub-label under a tile header. Class `.label-sub`.

### Named Rules

**The Two Labels Rule.** The small uppercase label exists in exactly two sizes
and nothing else. It once appeared in eight near-identical variants — three
sizes × five tracking values × six opacities. `.label-section` and `.label-sub`
are the entire vocabulary; they differ by size alone, never by tracking or
alpha. Adding a third is a regression.

**The Equal Peaks Rule.** City, temperature, and comfort sentence are one type
size, declared once. The sentence is the answer, not a caption on the answer.
Sizing any of the three separately is what collapsed the hierarchy before.

**The Step-Down Rule.** Every drop in the hierarchy is a size change. Opacity
is not a hierarchy tool in this system (see The 70% Floor Rule).

> **Known drift.** `src/components/empty-state.tsx` uses `font-extralight`
> (200). Only 300–700 are loaded, so the browser synthesizes or snaps to 300.
> Use `font-light` for the intended result.

## Layout

**Container.** `max-w-[1400px]`, centered, `px-5 py-6` rising to `px-8 py-8` at
`sm`. Full viewport height minimum; horizontal overflow hidden so the sky layer
cannot introduce a scrollbar.

**The weather grid.** One column on mobile, twelve columns from `sm` up, with
`auto-rows-[minmax(150px,auto)]` and `gap-5` rising to `gap-6`. The hero takes
`col-span-8` at `xl` beside a 4-wide right column; other tiles take 3, 4, 6, or
12 columns.

**The right column** holds the alerts tile above the Now tile — what is urgent,
then what is current. It is the one place two tiles share a grid cell: a
wrapper carries `contents` below `xl`, so both stay direct grid children and
document order is still the mobile reading order, and becomes
`xl:flex xl:flex-col` at `xl`, where it is the single 4-wide cell they stack
inside. The Now tile takes `xl:flex-1` so the pair fills the hero's height. The
alerts tile is absent whenever there are no alerts, and the column collapses
back to the Now tile alone — the only tile in the system that can disappear.

**Document order is the mobile reading order** — the answer, then the next
hours, then the next days. Desktop composition is restored with `xl:order-*`
only. A new tile is placed by inserting it at the correct point in the reading
order first, then assigning its desktop order.

**Density.** Tile padding is `1.5rem` (`p-6`) or `1.75rem` (`p-7`); the hero
runs `1.75rem → 3rem`. Interior rhythm inside a tile is a `0.25rem` base scale,
usually `mt-1` / `mt-4` between a label and its content.

**Breakpoints.** Tailwind defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280.
The search menu switches from mobile overlay to desktop dropdown at 1024;
`useMediaQuery` reads 640 / 768 / 1024 to compute the mobile input slide.

**One component, two chromes.** The search menu is a single `<Menu>` rendering
in both layouts. The parent picks the chrome — absolute dropdown or fixed
overlay panel. There is no variant prop and no second component.

## Elevation & Depth

This system is **edge-lit, not shadow-lifted**. A surface reads as present
because its rim catches light and because the atmosphere behind it blurs
through its thickness — a `1px` white rim at 80% alpha in day, 6–10% alpha in
night, plus a `0 1px 0 0 inset` highlight along the top edge.

**Shadows indicate stacking, not material.** A shadow means this surface is
over other content the user was just reading. Resting tiles do not stack over
anything, so they do not cast.

### Shadow Vocabulary

- **Overlay** (`0 40px 80px -24px oklch(0.3 0.12 240 / 0.28)`,
  `0 16px 32px -10px oklch(0.3 0.12 240 / 0.14)`): the search dropdown and the
  mobile menu panel. The only fully-earned shadow in the system.
- **Focus ring** (`0 0 0 3px oklch(0.7 0.12 230 / 0.12)`): the search surface
  on `:focus-within`. A state response, not elevation.
- **Token scale** (`--shadow-2xs` through `--shadow-2xl`): generated from
  `--shadow-color: #4f46e5` at `0.08` opacity, `30px` blur, `-5px` spread,
  `10px` y-offset. Present for the vendored shadcn primitives. Do not reach for
  it on app surfaces.

### Named Rules

**The Edge-Lit Rule.** Depth on a resting surface comes from the rim highlight
and the backdrop blur. Reach for a drop shadow only when the surface overlaps
content the user was reading a moment ago.

> **Known drift.** `.card-surface` and `.bento-tile` currently carry always-on
> drop shadows at rest (`0 30px 60px -30px` and `0 12px 30px -18px`
> respectively, both `oklch(0.4 0.15 240 / 0.25)`). These predate the rule above
> and contradict it. New surfaces follow the rule; changing the existing two is
> a deliberate edit, not a cleanup to perform in passing.

## Shapes

Rectangles with generous, uniform corners. No cut corners, no asymmetric radii,
no clipping paths, no non-rectangular silhouettes anywhere in the system.

The radius scale derives from a single `--radius: 1.25rem` root, multiplied:
`sm` 0.75rem, `md` 1rem, `lg` 1.25rem, `xl` 1.75rem, `2xl` 2.25rem, `3xl`
2.75rem, `4xl` 3.25rem. Even the smallest control — a 24 px icon button — is
`1rem`.

Observed assignments: hero `2rem`, tile `1.75rem`, search surface `1.75rem`,
dropdown panel `2.25rem`, buttons and inputs `1rem`, list-row icon wells
`0.75rem`.

**Borders** are one of two things: a white-alpha rim on a glass surface, or a
`foreground`-alpha hairline dividing content inside a tile (`divide-y
divide-foreground/10` between metric rows, `border-foreground/6` between
forecast columns). Solid opaque borders do not appear.

### Named Rules

**The Soft Container Rule.** Precise content, forgiving container. Wide-tracked
uppercase labels and exact numerals sit inside high-radius translucent panes.
The tension between the two is the character; flattening either side loses it.

## Components

### Tiles (the signature component)

The system's primary surface. Class pair `.bento-tile` plus an optional
variant.

- **Shape:** `1.75rem` radius, transparent 1px border.
- **Day fill:** `linear-gradient(160deg, oklch(1 0 0 / 0.9), oklch(0.97 0.03 230 / 0.5))`.
  Glass keeps its cool tint in day mode.
- **Night fill:** `linear-gradient(160deg, oklch(0.17 0.012 255 / 0.9), oklch(0.15 0.015 260 / 0.6))`
  with a `oklch(1 0 0 / 0.06)` rim.
- **Variants:** `.tile-wind` (teal-petrol, `200–220°`), `.tile-astro` (indigo
  with a warm low-right sun bloom), `.tile-astro-moon` (the same geometry with
  the bloom shifted to near-white), `.tile-alert-fill`, `.tile-alert-tint` and
  `.tile-alert-plain` (alerts only). Astro tiles transition their background over
  `0.4s ease` when the sun/moon state changes.
- **A variant is declared in `index.css`, never as a utility.** `.bento-tile`
  sets `background` and `border` in an unlayered rule, so a `bg-*` or
  `border-*` utility loses to it whatever the source order. A tile's field
  belongs beside the other variants.
- **Internal padding:** `1.5rem` or `1.75rem`.
- **Anatomy:** a `.label-section` header, then content at `mt-4`. Metric lists
  are `<dl>` with `divide-y divide-foreground/10`.

### Hero

Not a tile. Full-bleed saturated gradient, white text, `2rem` radius,
`1.75rem → 3rem` padding, `col-span-8` at `xl`. Its height is set by the right
column beside it: 334 px with the Now tile alone, and taller when an alerts
tile stacks above it — the alert plate sets its own hazard name in one or two
lines of headline type, so that second figure is not a constant. Day mode adds two
blurred bloom circles (`size-80`, `blur-3xl`) bleeding past the corners; night
mode drops them and uses a diagonal white sheen instead. Text is pure white at
full opacity — the day gradient clears 4.5:1 for white, but not for faded
white.

### Alert Tile

A `.bento-tile` that is itself the button opening the alerts modal — the only
tile in the system that is a control, and the only one that can be absent.
There is no pane around a plate around a row: one surface, and the severity
ramp is that surface's field.

- **Shape:** the tile's own `1.75rem` radius and `p-6` padding. It is a tile,
  and it sits in the grid as one.
- **Fill:** the severity's step from The Alert Ramp — filled, tinted, or a
  neutral rim. Every step gives the tile a surface of its own; none of them
  leaves it looking like the plain tiles around it.
- **Contents:** a `24px` icon at `1.5` stroke, then the hazard name at
  headline size (`text-lg → text-xl`, light, `line-clamp-2`), then the end of
  the window at body-small (`Until 9:00 pm`, the city's time, the date added
  only when the end is not today there). A `+N` count sits at the far right
  when more alerts follow; the rest of them are in the modal.
- **Hover** underlines the hazard name at every severity. `extreme` also steps
  its field along the ramp; the tinted and plain steps move their rim, because
  deepening their field costs contrast (see The Alert Ramp).
- **No section label.** The hazard is named at headline size across the whole
  tile, so a `.label-section` above it would repeat what the tile already is.
  It is the one tile in the system without one.
- **Vertical centring** rather than top alignment: the grid's
  `minmax(150px,auto)` row floor is taller than the content, so below `xl` the
  tile would otherwise hold it against the top edge over a void.

### Search Surface

- **Shape:** `1.75rem` radius pill, `px-5 py-3` rising to `py-3.5`.
- **Day:** `oklch(1 0 0 / 0.45)` fill, `blur(24px) saturate(150%)`,
  `oklch(1 0 0 / 0.35)` rim.
- **Night:** `oklch(1 0 0 / 0.06)` fill and rim.
- **Focus-within:** fill and rim step up by ~0.15 alpha, plus a 3px
  `oklch(0.7 0.12 230 / 0.12)` ring. All three transition over `0.3s`.
- **Contents:** a `18px → 20px` search icon at `foreground/55`, then a
  borderless transparent input at headline size.

### Dropdown Panel

Shared by the desktop dropdown and the mobile overlay panel
(`.search-dropdown-desktop`). `2.25rem` radius, `blur(28px) saturate(160%)`,
a `linear-gradient(180deg, oklch(1 0 0 / 0.88), oklch(1 0 0 / 0.74))` fill in
day, and the Overlay shadow. Thin custom scrollbars (`6px`, thumb at
`oklch(0.5 0 0 / 0.12)`).

Rows are `px-3 py-3` list items with a `size-8` rounded-`0.75rem` icon well.
The focused row gets a springy `FocusPill` (`oklch(0.55 0.04 240 / 0.08)` with
a matching inset rim) that animates between rows via a shared motion
`layoutId`. Remove buttons are always visible on touch and hover-revealed on
desktop.

### Buttons

Vendored shadcn primitives in `src/components/ui/`. Do not reformat or refactor
these wholesale.

- **Shape:** `1rem` radius (`rounded-md` against this radius scale).
- **Primary:** `cobalt-glass` fill, white text, `h-9 px-4`; hover drops to 90%
  alpha.
- **Ghost:** transparent; hover takes the `sea-glass` accent wash.
- **Focus:** `3px` ring at `focus-violet / 50` plus a border shift.
- **Sizes:** `xs` 24 px through `lg` 40 px, with square `icon` variants at each.

### Inputs

`h-9`, `1rem` radius, `hairline` border, transparent fill, `3px` focus ring.
The search field overrides nearly all of this — border removed, padding zeroed,
size raised to headline — because it is a search surface, not a form field.

## Do's and Don'ts

### Do:

- **Do** build hierarchy with the size step. Six type roles are declared; use
  one of them.
- **Do** keep text over glass at or above 70% `foreground` alpha, and verify by
  measurement — `backdrop-filter` makes automated contrast checks silently skip
  the node.
- **Do** place a new tile in the correct mobile reading order first, then give
  it an `xl:order-*` for the desktop composition.
- **Do** let a new surface be translucent. `backdrop-filter: blur(20–28px)
saturate(140–160%)` with a white-alpha rim is the system's material.
- **Do** define both cascades. Anything added under `:root` needs its `.night`
  counterpart in the same change.
- **Do** treat the day/night switch as driven by the located city's local time.
  It is never the viewer's OS preference, and `@custom-variant dark` is
  deliberately scoped to a `.dark` class this app never applies.
- **Do** add `prefers-reduced-motion` handling to any motion you introduce. A
  grep across `src/` currently returns nothing, and PRODUCT.md marks this a hard
  requirement. New motion closes the gap rather than widening it.

### Don't:

- **Don't** encode a reading in color. Not comfort, not temperature, not air
  quality. This is binding and was decided by removing a shipped feature.
- **Don't** add a drop shadow to a resting surface. Shadows mean stacking.
- **Don't** introduce a second typeface, a serif, or a monospace face. One
  family, six roles.
- **Don't** add a third small-label variant, or vary the label by tracking or
  opacity.
- **Don't** fade text to create hierarchy.
- **Don't** build generic SaaS card UI — opaque white cards, hairline gray
  borders, 8 px radius, neutral gray text. The large radius and the
  translucency are the system.
- **Don't** illustrate or simulate weather. No animated rain on glass, no 3D sun
  sprites, no drawn cloud scenes, no parallax mountains. Condition is
  communicated by a line icon and a sentence.
- **Don't** read the rule above as banning photographic backdrops. Real footage
  behind the composition is a planned direction: per-condition background video
  with day / night / sunrise / sunset variants, chosen to be neutral enough that
  one clip covers several states. That work is not built and is out of scope
  until specified — see PRODUCT.md. When it lands, the glass keeps its tint
  (decided August 2026) and the contrast floors above still bind over moving
  footage.
- **Don't** treat night as a dark mode. It is a full second cascade, equal in
  standing to day, and the two are the same room at different hours.
