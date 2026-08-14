# Issue 006 — Unit system switch

**Depends on:** 002
**Source:** original item 5 (marked low priority)

## Problem

Every reading is metric with no way to change it. A US reader gets `18°C`,
`24 km/h` and `1013 mb`.

A switch labelled °C/°F that converts only temperature produces `72°F` beside
`24 km/h` — a mixed system, which reads as a bug to the only audience the switch
serves.

## Decision

One toggle, labelled °C/°F, that flips the whole system.

| Quantity    | Metric | Imperial | Where rendered                                 |
| ----------- | ------ | -------- | ---------------------------------------------- |
| Temperature | °C     | °F       | now-card, hourly-card, forecast-card, air tile |
| Wind        | km/h   | mph      | air-comfort-card:68                            |
| Visibility  | km     | mi       | air-comfort-card:75                            |
| Pressure    | mb     | inHg     | exposure-card:139                              |
| Precip      | mm     | in       | hero strip (004), hourly precip mode (005)     |
| Snow        | cm     | in       | hero strip (004), hourly precip mode (005)     |

### Conversion happens at the format boundary only

This is the load-bearing rule. The DTO stays metric, nothing refetches, and
**every threshold in the codebase stays in Celsius/kph/mb**:

- `airComfort` thermal and air bands, and the damp override (RFC 012)
- `beaufort(windKph)` — already returns a description, not a number
- `PressureGauge`'s 980–1050 mb arc mapping and `pressureLabel`'s bands
  (`exposure-card.tsx:78`, `:201`)
- `uvScale`, `aqiScale`
- the `< 2°` hourly collapse (005)

Only the rendered string converts. No band can drift between systems, and no
existing test changes.

Implementation: a `formatTemp` / `formatWind` / `formatDistance` /
`formatPressure` / `formatPrecip` family that reads the current system. Not a
`convert()` sprinkled at call sites.

### State

A third store built on `createSubscription` (`src/lib/external-store.ts`), the
same primitive behind the history store and the URL-param store: localStorage
plus the native `storage` event, so it syncs across tabs for free.

Not the URL. RFC 007 makes `?city=` the source of truth for the _active city_;
units are a viewer preference, not view state. A shared `?city=` link should
read in the recipient's units, not the sender's.

### Default

Derived once from `navigator.language`'s region: `US`, `LR`, `MM` → imperial,
everything else metric. Derivation stops permanently the first time the user
touches the toggle — the stored value wins from then on, including when it
matches the derived default.

Guard the read: `navigator.language` can be absent or malformed in test
environments. Fall back to metric.

### Rendering behaviour

Components subscribe to the store directly where they format. Switching does not
refetch, does not remount, and does not touch any component that renders no
units — the hero's city, clock, condition text and comfort sentence are
untouched, and the sky/tile treatment does not re-run.

### Placement

The toggle sits in the header row beside the search bar. It must not enter the
mobile search overlay's stacking context (`search-bar.tsx:150`) or shift the
input's geometry when the menu opens — see 010.

## Acceptance criteria

- Store unit tests: default derivation for US/LR/MM and for a metric locale, a
  missing `navigator.language`, persistence, and cross-tab `storage` sync.
- Formatter unit tests including negatives, zero, and rounding at boundaries
  (`-40°C` = `-40°F`).
- Toggling does not trigger a network request — assert against MSW.
- Every `airComfort` and gauge test passes unmodified.
- Toggle has an accessible name and reflects state via `aria-pressed`.

## Out of scope

Wind direction as degrees vs compass points. 12/24-hour clock. Locale-aware
number formatting or decimal separators. Translating any copy.
