# Issue 007 — Condition code table and intensity standards

**Status:** Not started
**Blocks:** 011
**Source:** original item 7 — the mapping and documentation half

## Problem

Two things depend on knowing what a condition code means: the icon picker, and
the background video in 011. Neither has a code table.

### The icon picker is matching on prose

`condition-icon.tsx:26` runs regexes over `condition.text`. The vendor has since
added a family of dust and smoke codes that no branch catches, so they fall
through to the final `return isDay ? SunIcon : MoonStarIcon`:

| Code | Text             | Currently renders |
| ---- | ---------------- | ----------------- |
| 1018 | Blowing dust     | Sun / Moon        |
| 1021 | Dust storm       | Sun / Moon        |
| 1024 | Sandstorm        | Sun / Moon        |
| 1027 | Severe sandstorm | Sun / Moon        |
| 1033 | Smoke            | Sun / Moon        |
| 1039 | Smog             | Sun / Moon        |
| 1042 | Severe smog      | Sun / Moon        |
| 1045 | Saharan dust     | Sun / Moon        |
| 1048 | Dust             | Sun / Moon        |

A sandstorm renders as a sun. Text matching is also fragile against any future
wording change, and `conditionCode` — a stable closed set, already on the DTO
and already unused — is the correct key.

## Decision

### `src/lib/conditions.ts`

One exhaustive table over all 60 published codes, mapping each to a
`ConditionGroup`:

```ts
export type ConditionGroup =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "dust-smoke"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "thunder"
  | "sleet"
  | "snow"
  | "heavy-snow";
```

| Group           | Codes                                                                  | n   |
| --------------- | ---------------------------------------------------------------------- | --- |
| `clear`         | 1000                                                                   | 1   |
| `partly-cloudy` | 1003                                                                   | 1   |
| `cloudy`        | 1006, 1009                                                             | 2   |
| `fog`           | 1030, 1135, 1147                                                       | 3   |
| `dust-smoke`    | 1012, 1015, 1018, 1021, 1024, 1027, 1033, 1036, 1039, 1042, 1045, 1048 | 12  |
| `drizzle`       | 1072, 1150, 1153, 1168, 1171                                           | 5   |
| `rain`          | 1063, 1180, 1183, 1186, 1189, 1198, 1240                               | 7   |
| `heavy-rain`    | 1192, 1195, 1201, 1243, 1246                                           | 5   |
| `thunder`       | 1087, 1273, 1276, 1279, 1282                                           | 5   |
| `sleet`         | 1069, 1204, 1207, 1237, 1249, 1252, 1261, 1264                         | 8   |
| `snow`          | 1066, 1210, 1213, 1216, 1219, 1255                                     | 6   |
| `heavy-snow`    | 1114, 1117, 1222, 1225, 1258                                           | 5   |

Grouping is by **what the sky looks like**, not by meteorological family — the
twelve dust/smoke/smog/haze codes are one visual regardless of what is
suspended in the air.

The table is `Record<number, ConditionGroup>` with a `Record<ConditionGroup, …>`
consumer on the other side, so adding a code is a one-row change and dropping a
group is a compile error — the pattern already used by `WEATHER_TIER_PATHS` and
`WEATHER_ERRORS`.

Unknown codes resolve to `cloudy`. The vendor has added codes before and will
again; an unknown code must not crash and must not render a sun.

### Rewire the icon picker

`pickConditionIcon` takes `conditionCode` and reads the table. Keep the `isDay`
split for `clear` and `partly-cloudy`. The text-regex implementation is deleted,
not kept as a fallback — a fallback that only fires on unknown codes is a
fallback that is never exercised.

`ConditionIcon`'s props change from `{ text, isDay }` to `{ code, isDay }`.
Call sites: `hero-card.tsx:83`, `hourly-card.tsx:109`, `forecast-card.tsx`.
`conditionText` stays on the DTO — the hero prints it as prose.

### `docs/conditions.md`

The vendor publishes no thresholds for any code. The document records, per
group, whether an external standard exists, and marks the rest as
vendor-defined. Being explicit about which is which is the point of the
document.

Standards that do exist:

| Group        | Standard                                                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cloud cover  | WMO okta scale: clear 0, partly cloudy 1–4, broken/cloudy 5–7, overcast 8                                                                                       |
| `fog`        | WMO: fog is visibility < 1 km; mist is 1–2 km with RH ≥ 95%; below 95% the obscuration is haze                                                                  |
| `dust-smoke` | WMO SYNOP `ww` 30–35: dust/sandstorm at visibility < 1000 m, severe at < 200 m                                                                                  |
| `drizzle`    | WMO: droplet diameter < 0.5 mm; rates below roughly 0.5 mm/h                                                                                                    |
| rain rate    | US NWS: light < 2.5 mm/h, moderate 2.5–7.6, heavy > 7.6. WMO uses light < 2.5, moderate 2.5–10, heavy > 10 — the two disagree and the vendor says which neither |
| snow rate    | US NWS, by visibility: light ≥ 1 km, moderate 0.5–1 km, heavy < 0.5 km                                                                                          |
| `heavy-snow` | US NWS blizzard: sustained wind or gusts ≥ 56 km/h with blowing snow reducing visibility below 400 m for ≥ 3 h                                                  |
| freezing     | Liquid precipitation falling through a sub-freezing surface layer and freezing on contact                                                                       |
| `thunder`    | Presence of thunder. No intensity standard exists                                                                                                               |

Ambiguities to record rather than resolve:

- **Sleet** means ice pellets in US usage and a rain/snow mix in UK usage. The
  vendor is UK-based and ships both `Sleet` (1204/1207) and `Ice pellets`
  (1237) as distinct codes, so its own usage is not internally consistent.
- **`… possible` / `Patchy …` / `… at times`** (1063, 1066, 1069, 1072, 1087,
  1180, 1186, 1192, 1210, 1216, 1222) are forecast-confidence qualifiers, not
  intensity levels. Undocumented; they co-occur with lower `chance_of_*` values
  but the vendor publishes no threshold.
- The vendor's `current.condition` and its `forecast.day.condition` are produced
  differently — the day condition is a summary of the whole day, so a day can be
  `Sunny` while the current hour is `Light rain`.

## Acceptance criteria

- The table covers all 60 published codes; a test asserts the count and that
  every code maps to a group.
- A test asserts an unmapped code resolves to `cloudy`.
- Every code in `dust-smoke` renders a fog/haze icon, not a sun.
- `condition-icon.test.tsx` is rewritten against codes.
- No call site passes `text` to `ConditionIcon`.

## Out of scope

Rewriting the comfort sentence to mention conditions. Changing what the hero
prints as prose. Anything to do with video — that is 011.
