# Issue 002 — Extend the forecast wire surface

**Blocks:** 003, 004, 005, 006
**Source:** original items 2, 3, 4 — the shared DTO work behind all three

## Problem

Three separate features need new fields on `GET /api/weather/forecast`. Landing
them separately means three commits touching `src/lib/schemas.ts`,
`src/worker/weather-api.ts` and `src/worker/cache.ts`, and three
`CACHE_VERSION` bumps. This issue lands all of it once so the three UI issues
are independent of each other.

Everything here comes from the existing `forecast.json` call. No new upstream
request, no additional quota cost.

## Upstream fields to consume

Already fetched, currently discarded:

| Upstream path              | Notes       |
| -------------------------- | ----------- |
| `day.daily_will_it_rain`   | 0 or 1      |
| `day.daily_will_it_snow`   | 0 or 1      |
| `day.daily_chance_of_snow` | 0–100       |
| `day.totalprecip_mm`       | millimetres |
| `day.totalsnow_cm`         | centimetres |
| `hour[].will_it_rain`      | 0 or 1      |
| `hour[].will_it_snow`      | 0 or 1      |
| `hour[].chance_of_snow`    | 0–100       |
| `hour[].precip_mm`         | millimetres |
| `hour[].snow_cm`           | centimetres |

Requires a request change: `fetchForecast3` currently sends `alerts=no`
(`weather-api.ts:245`). Flip to `alerts=yes` to receive `alerts.alert[]`.

All new upstream fields are `.nullish()` in the upstream schemas and default to
`0` / `false` in the shaping functions, matching how `gust_kph`, `vis_km` and
the rest are already handled.

## DTO changes — `src/lib/schemas.ts`

### `HourlyForecastSchema`

Add `chanceOfSnow: number`, `willItRain: boolean`, `willItSnow: boolean`,
`precipMm: number`, `snowCm: number`.

### `WeatherForecastSchema.today`

Add `willItRain: boolean`, `chanceOfSnow: number`, `willItSnow: boolean`,
`totalPrecipMm: number`, `totalSnowCm: number`.

### New `WeatherAlertSchema`

```ts
export const ALERT_SEVERITIES = ["extreme", "severe", "moderate", "minor", "unknown"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const WeatherAlertSchema = z.object({
  event: z.string(),
  headline: z.string(),
  severity: z.enum(ALERT_SEVERITIES),
  areas: z.string(),
  /** ISO 8601 with offset, as emitted upstream. */
  effective: z.string(),
  expires: z.string(),
  desc: z.string(),
  instruction: z.string(),
});
```

`alerts: z.array(WeatherAlertSchema)` joins `WeatherForecastSchema`. Empty array
when upstream returns none or when the plan does not supply them — never
`null`, so the client has one shape to render.

Dropped upstream fields: `msgtype`, `category`, `certainty`, `urgency`, `note`.
They are constant or meaningless to a reader. See 003.

## Severity normalization

`severity` is an unconstrained string upstream — the vendor aggregates national
providers, and the documentation enumerates no values. Observed vocabularies
include CAP (`Extreme`, `Severe`, `Moderate`, `Minor`, `Unknown`) from US NWS,
Meteoalarm awareness colours, and empty strings.

Normalize worker-side into the closed union, in the same single-table style as
`src/lib/errors.ts`:

- Case-insensitive exact match against the CAP names.
- Colour vocabulary: `red` → `extreme`, `orange` → `severe`, `yellow` →
  `moderate`, `green` → `minor`.
- Anything else, including `""` → `unknown`.

The worker sorts the array worst-first before responding, so the client renders
`alerts[0]` as the top alert without owning a rank table. `unknown` sorts last.

Cap the array at **5 alerts**. Descriptions run to several kilobytes each and
providers frequently emit near-duplicates for overlapping zones; five bounds the
payload without losing anything a reader would act on.

## Cache

Bump `CACHE_VERSION` in `src/worker/cache.ts` from `"5"` to `"6"`. Entries
cached under `v=5` validate against the old DTO and would render the new fields
as `undefined`.

## Acceptance criteria

- `src/lib/schemas.test.ts` covers the new fields, including upstream omission
  defaulting to `0` / `false`.
- Severity normalization is unit-tested across CAP names, colour names, mixed
  case, empty string, and an unrecognised value.
- Alert sort order is asserted: `extreme` first, `unknown` last.
- Worker tests confirm `alerts=yes` on the outgoing URL and an empty array when
  upstream omits the block entirely.
- No client-side change ships in this issue. Existing UI keeps rendering as-is.

## Out of scope

`ForecastDaySchema` (the 3-day cards and the yesterday column) gains no snow
fields here. If the forecast card should show snow later, that is its own issue
and its own bump.
