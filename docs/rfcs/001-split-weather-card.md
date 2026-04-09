# RFC 001 — Split WeatherCard into independent cards

## Problem

`src/components/weather-card.tsx` is 546 LOC. It destructures the entire
`WeatherResponse` DTO and renders 7 sections (hero, atmosphere, local time,
astro, wind, UV, forecast) plus ~10 inline helper functions (`beaufort`,
`compassDegrees`, `formatClock`, `uvLabel`, `uvTint`, `forecastLabel`,
`pickConditionIcon`, …). Every section re-renders whenever any field in the
DTO changes, every helper is untestable in isolation, and adding a card means
editing a 546-line file.

## Proposal

Keep one backend endpoint, one upstream call, one cache entry. Split the UI
into seven sibling card components that each subscribe to their own slice of
the cache via TanStack Query's `select` option.

### File layout

```
src/components/weather/
  grid.tsx             # layout shell; renders the 7 cards, passes only `query`
  hero-card.tsx
  atmosphere-card.tsx
  local-time-card.tsx
  astro-card.tsx
  wind-card.tsx
  uv-card.tsx
  forecast-card.tsx
```

`src/components/weather-card.tsx` is deleted. The outer state-machine
component that today wraps `<WeatherCard>` now wraps `<WeatherGrid query=...>`
instead.

### Shared selector hook

Add one tiny wrapper next to `useWeather` in `src/hooks/use-weather.ts`:

```ts
export function useWeatherSlice<T>(
  query: string | null,
  select: (w: WeatherResponse) => T,
): UseQueryResult<T, WeatherClientError> {
  const trimmed = query?.trim() ?? "";
  return useQuery({
    queryKey: ["weather", trimmed.toLowerCase()],
    queryFn: ({ signal }) => fetchWeather(trimmed, signal),
    enabled: trimmed.length >= 3,
    placeholderData: keepPreviousData,
    select,
  });
}
```

All cards share the same `queryKey`, so there is exactly one network request
and one cache entry regardless of how many cards subscribe. TanStack Query
runs each `select` per subscriber and bails out of re-render when the selected
slice is `Object.is`-equal to the previous value.

### Per-card responsibility

Each card is an independent component that:

- takes a single `{ query: string }` prop (the grid shell passes it through),
- calls `useWeatherSlice` with a narrow selector,
- owns its private formatters inline (no shared format library),
- renders its own loading skeleton from `result.isPending`.

Rough slice assignments:

| Card            | Selected slice                                                                                     | Inline helpers owned              |
| --------------- | -------------------------------------------------------------------------------------------------- | --------------------------------- |
| hero-card       | `{ location, current.tempC, current.feelsLikeC, current.conditionText, current.timeOfDay, today }` | `conditionIcon`                   |
| atmosphere-card | `{ humidity, cloud, pressureMb, dewpointC, visibilityKm }`                                         | —                                 |
| local-time-card | `{ tz: location.tz }`                                                                              | `formatLocalTime`, `useLocalTime` |
| astro-card      | `astro`                                                                                            | `formatClock`                     |
| wind-card       | `{ windKph, windDir, gustKph }`                                                                    | `beaufort`, `compassDegrees`      |
| uv-card         | `{ uv, timeOfDay }`                                                                                | `uvLabel`, `uvTint`               |
| forecast-card   | `{ forecast, yesterday }`                                                                          | `forecastLabel`, `conditionIcon`  |

`conditionIcon` is small enough (a regex chain returning a `LucideIcon`) to
duplicate between `hero-card` and `forecast-card`, or co-locate with one and
import from the other — decide during implementation.

### Grid shell

```tsx
export function WeatherGrid({ query }: { query: string }) {
  return (
    <div className="grid ...">
      <HeroCard query={query} />
      <AtmosphereCard query={query} />
      <LocalTimeCard query={query} />
      <AstroCard query={query} />
      <WindCard query={query} />
      <UvCard query={query} />
      <ForecastCard query={query} />
    </div>
  );
}
```

The shell owns layout (Tailwind grid classes) and nothing else.

## What this is NOT

- Not a backend split. One upstream call, one DTO, one cache entry.
- Not a shared `lib/weather` format library. Formatters stay inline next to
  their single caller.
- Not a view-model / façade / `presentWeather(data)` layer.
- Not parallel queries across cards. Flagged as a possible future follow-up
  if we ever want `current` and `forecast` to refresh on different cadences,
  but that's a quota / worker change out of scope here.

## Testing

- Existing `use-weather` hook test stays as is; add a case for `select`.
- Each card becomes prop-drivable by `query` and can be rendered against an
  MSW-mocked fetch for a focused test (still optional — the existing
  integration test covers the render path).
- Inline helpers stay un-exported by default. If a specific formatter grows
  enough to warrant its own test, export it from its card file and test it
  directly — no shared module needed.

## Migration

Single PR, roughly:

1. Add `useWeatherSlice` to `src/hooks/use-weather.ts`.
2. Create `src/components/weather/` with the grid shell and seven card files,
   copying section JSX + the relevant helpers out of `weather-card.tsx`.
3. Replace the `<WeatherCard data={...}>` call site with
   `<WeatherGrid query={...}>` (parent no longer passes the DTO).
4. Delete `src/components/weather-card.tsx`.
5. Update the integration test's imports if it referenced `WeatherCard`.

No behavior change expected. Snapshot-free visual diff should be nil.
