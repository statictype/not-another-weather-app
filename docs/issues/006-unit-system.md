# Issue 006 — Unit system switch

**Status:** Done
**Depends on:** 002
**Source:** original item 5 (marked low priority)

## Problem

Every reading is metric with no way to change it. A US reader gets `18°`,
`24 km/h` and `1013 mb`.

A switch labelled °C/°F that converts only temperature produces `72°` beside
`24 km/h` — a mixed system, which reads as a bug to the only audience the switch
serves.

The clock has the same problem in reverse. `hero-card.tsx:86` hardcodes
`toLocaleTimeString("en-US", { hour12: true })`, so every viewer gets a
12-hour clock and a `Fri Aug 15` date regardless of locale.

### Where units render today

The card layout changed after this issue was first written. `air-comfort-card`
and the hero precipitation strip no longer exist.

| Quantity    | Site                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| Temperature | `now-card.tsx:42,47,54,60,62` — 5 dialog rows, all bare `°`             |
| Temperature | `hourly-card.tsx:34,40` — 2 rows × 24 columns                           |
| Temperature | `forecast-card.tsx:77,78` — high and low per day                        |
| Wind        | `wind-card.tsx:18` gusts, `wind-card.tsx:113` dial centre               |
| Visibility  | `now-card.tsx:75`                                                       |
| Pressure    | `pressure-card.tsx:82`                                                  |
| Precip      | `precip-strip.tsx:29,17` per forecast day; `now-card.tsx:69` dialog row |

Both gauges are already unit-agnostic: `PressureCard`'s arc prints band words
and `WindCard`'s dial prints cardinal letters. Neither draws a numeral.

## Decision

One toggle, labelled °C/°F, that flips the whole system — temperature, wind,
visibility, pressure, precipitation, snow, and the clock.

### Both systems arrive on the wire, pre-formatted

The original version of this issue converted at the client's format boundary and
kept the DTO metric. It does not. Upstream returns both systems in one response,
so the Worker formats both and the client picks one.

Every display quantity becomes a pair of ready-made strings:

```ts
// src/lib/schemas.ts
const MeasureSchema = z.object({
  text: z.string(), //   "24 km/h"
  value: z.string(), //  "24"
  suffix: z.string(), // "km/h"
  spoken: z.string(), // "24 kilometres per hour"
});

const MeasurePairSchema = z.object({
  metric: MeasureSchema,
  imperial: MeasureSchema,
});
```

Four members rather than one because the two dials style the figure and the unit
apart — `wind-card.tsx:112` is a 24px figure beside a 14px suffix at 70% opacity,
and `pressure-card.tsx:81` is the same pairing. Those read `value` and `suffix`;
the six flat sites read `text`. `spoken` is the accessible reading, which
`precip-strip.tsx:60` already composes today and which the two dials gain
(`inHg` is announced letter by letter with no `aria-label`).

Switching is then `d.temp[system]`. No refetch, no conversion, no arithmetic on
the client.

### The Worker reads upstream's imperial fields; it computes one thing

WeatherAPI returns `temp_f` beside `temp_c`, `wind_mph` beside `wind_kph`,
`pressure_in`, `vis_miles`, `precip_in`, `mintemp_f`, `maxtemp_f`,
`totalprecip_in`. Those are read, not derived, so the three upstream schemas in
`weather-api.ts` grow by roughly 15 fields.

Snow is the exception. The `day` object has `totalsnow_cm` and the `hour` object
has `snow_cm`, with no `_in` counterpart, so `cmToIn` is the only conversion
function in the codebase. It lives in the Worker with everything else.

### Classification is unit-independent

The cross-cutting rule in `docs/issues/README.md` currently reads "thresholds
stay metric". Metric is the arbitrary half of that; the load-bearing half is
that a classification reads **one** canonical field, so its output cannot change
when a viewer flips a display preference.

The reason is not theoretical. The published Beaufort tables are independently
rounded per unit: force 3 is 12–19 km/h and 8–12 mph, force 4 is 20–28 km/h and
13–17 mph. 12 mph is 19.3 km/h and 13 mph is 20.9 km/h, so any wind in that
1.6 km/h gap gets a different force from the two official tables — the same wind
reading "Gentle breeze" to one viewer and "Moderate breeze" to the other. The
`airComfort` bands have the same shape: −5/4/10/16/22/29/35/40 °C are round
Celsius numbers, and someone writing in Fahrenheit would have picked
25/40/50/60/72/85/95/105 rather than 23/39.2/50/60.8/71.6/84.2/95/104.

### What the Worker classifies, and what stays on the client

`airComfort` and `beaufort` move to the Worker. They return prose, they read
payload, and nothing about them belongs to a component. The wire gains
`comfort: { thermal, air, sentence }` and `beaufort: string` on the `current`
tier.

What stays on the client is what feeds a colour, a bar width or an SVG angle:

- `bandFor` — returns `color: "#27B98CFF"` and 20 words of tooltip prose.
  Design tokens do not ride a 10-minute edge cache.
- `angleFor` — derived from `CX`/`CY`/`R` and the 220×116 viewBox.
- `uvScale`, `aqiScale`, `uvLabel`, `aqiLabel` — same, and UV and the US EPA
  index are dimensionless, so no unit system touches them.

Each of those needs its raw number regardless, which is why the boundary and the
surviving-field list are the same fact. `pressureMb`, `uv`, `airQualityIndex`
and `windDegree` stay as numbers. `humidity` and `cloud` stay as numbers because
they render as `%`.

### What comes off the wire

`tempC`, `feelsLikeC`, `heatIndexC`, `windchillC`, `dewpointC`, `windKph`,
`gustKph`, `visibilityKm`, `precipMm`, `minC`, `maxC`, `totalPrecipMm` and
`totalSnowCm` lose their last client consumer once the strings and the
classifications arrive ready-made. The readings still render; their raw form
stops shipping.

Four fields are already dead payload and go with them — no component reads
`WeatherForecast.today`, `ForecastDay.avgC`, `HourlyForecast.precipMm` or
`HourlyForecast.snowCm`. They appear only in fixtures and Worker tests.

`conditionCode` and `HourlyForecast.cloud` stay: 007 needs the first and neither
is a unit question.

### The format table

| Quantity                                                                | Metric      | Imperial | Decimals             |
| ----------------------------------------------------------------------- | ----------- | -------- | -------------------- |
| `temp`, `feelsLike`, `heatIndex`, `windchill`, `dewpoint`, `max`, `min` | `°`         | `°`      | 0                    |
| `wind`, `gust`                                                          | `km/h`      | `mph`    | 0                    |
| `visibility`                                                            | `km`        | `mi`     | 0                    |
| `pressure`                                                              | `mb`        | `inHg`   | 0 metric, 2 imperial |
| `precip`, `snow`                                                        | `mm` / `cm` | `in`     | see below            |

Temperature carries no letter in either system. The toggle is the system
indicator, it is persistently visible in the header, and repeating `C` or `F`
across 59 sites restates what one control already says. Keeping the two rows
identical apart from the number also makes the switch read as one reading
changing rather than a different reading appearing.

`text` joins with a space before an alphabetic suffix and nothing before `°`.
This changes `precip-strip.tsx`'s lines from `9mm` to `9 mm`, and resolves an
inconsistency already shipping: the Now dialog renders `10 km` for visibility
and `0mm` for precipitation, two rows apart in the same list.

### Precipitation: one null, decided for the pair

`precipAmount` returns `null` when an amount rounds to zero, and
`precip-strip.tsx:31` uses that to decide whether the amount renders at all.
Decided per system, that is the Beaufort bug in a new place — 0.4 mm is 0.016 in,
so the metric viewer sees `0.4 mm` and the imperial viewer sees an element that
is not there.

So the null is decided once for the pair: the amount renders only if **both**
figures are non-zero at their own precision. Precision is shared — 0 decimals at
10 and above, 1 below 10, 2 below 1, trailing zeros dropped as they already are.
That gives `4 mm` / `0.16 in`, `31 cm` / `12.2 in`, `0.4 mm` / `0.02 in`.

The floor moves. 0.1 mm renders as `0.1mm` today; it is 0.0039 in, rounds to
zero, and under the joint rule both systems suppress the amount while the chance
percentage still renders. Visible amounts start at 0.13 mm.

### The clock is the one thing the Worker cannot own

`hero-card.tsx` ticks every second through `useTicker`. A string baked into a
body cached for 10 minutes cannot show the current time, so that formatter is
client-side by necessity. Astro times, hourly labels and alert stamps _are_
payload and the Worker could format them — but two producers implementing one
rule is how three conventions got here already:

| Site                                           | Now                                       |
| ---------------------------------------------- | ----------------------------------------- |
| `hero-card.tsx:86` time, ticks every second    | `en-US`, `hour12: true` → `3:45 PM`       |
| `hero-card.tsx:99` date                        | `en-US` → `Fri Aug 15`                    |
| `astro-card.tsx:342` × 4 rise/set times        | hand-rolled from `"06:23 AM"` → `6:23 am` |
| `hourly-card.tsx:315` × 24 column labels       | hand-rolled → `3pm`                       |
| `hourly-card.tsx:328` spoken hour              | hand-rolled → `3 pm`                      |
| `hourly-card.tsx:325`, `forecast-card.tsx:107` | `toLocaleDateString(undefined, …)`        |
| `alerts-card.tsx:256,264`                      | `en-US`, `hour12: true`                   |

So the rule is: **the Worker formats what comes from the payload, the client
formats what comes from the clock.** All 11 sites move to one client module
driven by one constant:

```ts
const CLOCK_LOCALE: Record<UnitSystem, string> = { metric: "en-GB", imperial: "en-US" };
```

`en-GB` yields a 24-hour clock and `Fri 15 Aug`; `en-US` yields 12-hour and
`Fri Aug 15`. The two hand-rolled formatters are replaced by `Intl` calls, which
is what makes 24-hour work at all — `astro-card`'s `formatClock` currently only
lowercases the AM/PM that upstream sent.

Hourly column labels render hour-only in both systems, `3pm` and `15`, because
`--hour-col-w` is a fixed `4rem` below the breakpoint and `15:00` is five
characters. Hour-only is the European convention for an hourly strip anyway.

`astro-card.tsx:362` `parseClockMinutes` and `alerts-card.tsx:246` `formatDay`
are not display — they compute day length and a date comparison key — and stay
as they are.

Tying a 12/24-hour clock to a °C/°F toggle misfits the UK, which is
metric-leaning and reads a 12-hour clock. It is still an improvement: today every
viewer gets `en-US` 12-hour regardless of locale, so metric viewers only gain.

### State

`UnitSystem = "metric" | "imperial"` is named once in `src/lib/units.ts`,
mirroring how `WeatherTier` lives in `src/lib/tiers.ts`. `schemas.ts` keys the
measure pair off it and the store's literals come from the same file.

The store is a third `createSubscription` (`src/lib/external-store.ts`) over
localStorage plus the native `storage` event, the same construction as
`src/hooks/use-history/store.ts`, with a `getServerSnapshot` returning metric.

Not the URL. RFC 007 makes `?city=` the source of truth for the _active city_;
units are a viewer preference, not view state. A shared `?city=` link should
read in the recipient's units, not the sender's.

The stored string is validated against the union on read, not trusted. It
indexes the DTO now, so a hand-edited or renamed value would make
`d.temp[system]` `undefined` at every call site.

### Default

Derived from `new Intl.Locale(navigator.language).region`: `US`, `LR`, `MM` →
imperial, everything else metric. Wrapped in try/catch falling back to metric —
`navigator.language` can be absent or malformed in test environments.

Derivation stops permanently the first time the user touches the toggle. The
stored value wins from then on, including when it matches the derived default.

### Stale bodies during the switch-over

`tiers.ts:56` sends `max-age=600` on `current` and `3600` on `forecast`. That
instructs the browser to reuse its own copy without contacting the server, so
after a deploy a returning browser serves a pre-bump body for up to an hour and
the edge `CACHE_VERSION` bump never comes into play.

Today that is soft: a missing field reads as `undefined` and arithmetic yields
`NaN`, which `precip.ts:14` documents and guards. After this change the client
reads `d.temp[system]`, a property access on `undefined`, which throws during
render. There is no error boundary anywhere in `src`, so it unmounts the tree.

A `read(pair, system)` helper returns `"—"` when a pair is absent, and every
call site goes through it. Dashes for the length of the window, not a blank page.

Carrying `CACHE_VERSION` into the client-facing URL would fix the class rather
than the instance, and an error boundary would contain any render throw. Both
are out of scope here — see "Out of scope".

### Placement

The toggle is a third child of the header in `App.tsx`, to the right of the
search bar.

Stacking is already safe: the mobile overlay backdrop is `fixed inset-0 z-30`
and a positioned `z-30` element paints above a later `z-auto` sibling, so the
toggle sits under the scrim and is not clickable during search.

Width is the problem. At 390px, `px-5` leaves 350px, the emoji takes ~56px, two
`gap-2` take 16px and the control takes ~72px, so the search surface gets 206px
and its placeholder gets 136px — `"Search a city…"` at `text-lg` runs about
120px. It fits. But the mobile overlay spans the full header by animating
`marginLeft: -56` over the emoji (`SLIDE_XS`, `search-bar.tsx:107`), and a
persistent toggle would cap its right edge 72px short of what RFC 011 designed.

So the toggle collapses while the overlay is open, using the same
`width: 0` / `opacity: 0` animation as the Cancel button at `search-bar.tsx:181`.
`SearchBar` gains an `onOpenChange` callback and `App` holds one boolean, which
keeps the toggle in the header where it belongs rather than moving a non-search
control into `SearchBar`.

010 reworks the input-to-menu transform and will touch this geometry. This issue
states the constraint; it does not assume the current numbers are permanent.

### The control

`astro-card.tsx:30` already ships this shape — two mutually exclusive options as
buttons with `aria-pressed`, via `TabButton`. Generalize `TabButton` to take text
children, move it to `src/components/`, and use it for both.

APG would prefer `role="radiogroup"` for a mutually exclusive pair, and that is
probably right — but it is right for the astro switch too, so it is its own
issue rather than a second interaction pattern introduced here for the same
shape.

The visible labels are `°C` and `°F`. The accessible names say what actually
happens: group `aria-label="Units"`, buttons `aria-label="Metric units"` and
`"Imperial units"`. The control flips wind, visibility, pressure, precipitation
and the clock, and a screen reader should not hear it as temperature-only.

### Rendering behaviour

Switching does not refetch, does not remount, and does not touch any component
that renders no units — the hero's city, condition text and comfort sentence are
untouched, and the sky and tile treatment do not re-run.

### `CACHE_VERSION`

This is a DTO change, so `src/worker/cache.ts` bumps 9 → 10.

## File moves

`src/lib/air-comfort.ts`, `src/lib/air-comfort.test.ts`, `src/lib/precip.ts` and
`src/lib/precip.test.ts` move to `src/worker/`. `vitest.config.ts` globs by path,
so those suites move from the jsdom `frontend` project to the workerd `worker`
project with no config change. `now-card.tsx` then imports nothing from
`@/lib/air-comfort`.

## Acceptance criteria

- Store unit tests: default derivation for US/LR/MM and for a metric locale, a
  missing `navigator.language`, a stored value outside the union, persistence,
  and cross-tab `storage` sync.
- Worker format tests: the table above at every boundary, including `-40°C` =
  `-40°F`, `29.92 inHg`, and the joint precipitation null at 0.12 mm and
  0.13 mm.
- Toggling triggers no network request — assert against MSW.
- Toggling changes no word, no colour and no needle angle. One assertion
  covering `comfort.sentence`, `beaufort`, the pressure band label and
  `angleFor`, replacing the old "every gauge test passes unmodified" claim.
- A pair missing from the payload renders `—` and does not throw.
- The clock renders `15:45` / `Fri 15 Aug` in metric and `3:45 PM` /
  `Fri Aug 15` in imperial, across the hero, astro, hourly and alert sites.
- The toggle collapses to zero width while the mobile search overlay is open.
- The toggle has an accessible name, reflects state via `aria-pressed`, and its
  group is named `Units`.

Fixtures change across `src/test/msw-handlers.ts`, `src/integration.test.tsx`,
`src/hooks/use-weather.test.tsx`, `src/lib/schemas.test.ts`, `src/worker.test.ts`,
`hourly-card.test.tsx`, `forecast-card.test.tsx` and `precip-strip.test.tsx`.
The original version of this issue claimed no existing test would change; that
was true of a client-side conversion and is not true of this design.

## Out of scope

- Wind direction as degrees vs compass points.
- Locale-aware number formatting or decimal separators. Translating any copy.
- Carrying `CACHE_VERSION` into the client-facing request URL. It would make one
  bump cover the browser cache as well as the edge, which is the general fix for
  the gotcha in `CLAUDE.md`, and it deserves its own issue.
- An error boundary. It converts a render throw into an error screen without
  fixing a cause, and belongs with the item above.
- `role="radiogroup"` semantics for two-option switches, which should land for
  `TabButton`'s existing use at the same time.

## Documentation to update

- `docs/issues/README.md` — the third cross-cutting constraint reads "Thresholds
  stay metric". Replace with the classification rule above.
- `CLAUDE.md` — the gotcha section says `CACHE_VERSION` is `"7"`; it is `"9"`
  and this issue takes it to `"10"`. The "DTO shapes defined once, in zod"
  section gains the measure pair; the architecture summary gains the fact that
  the Worker now formats display strings.
- `docs/architecture.md` — the unit system, and the format boundary moving to
  the Worker.
- `docs/rfcs/012-air-comfort.md` — `airComfort` and `beaufort` now run in the
  Worker.
