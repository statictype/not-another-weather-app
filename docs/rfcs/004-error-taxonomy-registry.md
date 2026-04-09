# RFC 004 — Single source of truth for error kinds

## Problem

The error taxonomy is spread across four files that must stay in lock-step
by convention alone:

1. **`src/worker/types.ts`** — declares the `WeatherErrorKind` union
   (`not_found | quota_exceeded | invalid_query | upstream | network`).
2. **`src/api/types.ts`** — declares the _same_ `WeatherErrorKind` union,
   with a comment saying "if you change one, change the other".
3. **`src/worker/errors.ts`** — `statusForKind(kind)` — kind → HTTP status.
4. **`src/api/weather.ts`** — `statusToKind(status)` — the manual inverse,
   used when the error response has no JSON body. Also `defaultMessage(kind)`
   for client-side fallback text.

A change to any single rule (e.g. "quota should return 503 not 429") requires
edits in two places. A change to the union (add a new kind) requires edits in
four. Nothing enforces consistency at compile time. The `statusToKind` switch
is a hand-maintained inverse of `statusForKind` — drift is silent.

## Proposal

One table, both sides import from it.

### New file

`src/lib/errors.ts` — pure, no I/O, no framework dependencies, importable by
worker and frontend alike.

```ts
export const WEATHER_ERRORS = {
  invalid_query: { status: 400, message: "Invalid query." },
  not_found: { status: 404, message: "City not found." },
  quota_exceeded: { status: 429, message: "Weather service quota exceeded." },
  upstream: { status: 502, message: "Weather service is unavailable." },
  network: { status: 504, message: "Could not reach the weather service." },
} as const;

export type WeatherErrorKind = keyof typeof WEATHER_ERRORS;

export function statusForKind(kind: WeatherErrorKind): number {
  return WEATHER_ERRORS[kind].status;
}

export function defaultMessage(kind: WeatherErrorKind): string {
  return WEATHER_ERRORS[kind].message;
}

/**
 * Reverse lookup used when an error response has no JSON body.
 * Unknown statuses fall through to "upstream" (5xx family is the sane default).
 */
export function kindForStatus(status: number): WeatherErrorKind {
  for (const [kind, def] of Object.entries(WEATHER_ERRORS)) {
    if (def.status === status) return kind as WeatherErrorKind;
  }
  return "upstream";
}
```

`WeatherErrorKind` is derived from the table, so the table is the only place
that lists kinds. Adding `"rate_limited"` means adding one row — the union,
both mappings, and the default message all update together.

### Call-site changes

- **`src/worker/types.ts`** — delete the local `WeatherErrorKind` union,
  re-export from `@/lib/errors`. `ErrorResponse` keeps its shape.
- **`src/api/types.ts`** — same: delete the duplicate union, re-export from
  `@/lib/errors`.
- **`src/worker/errors.ts`** — delete `statusForKind`, import from
  `@/lib/errors`. `WeatherApiError` class stays.
- **`src/api/weather.ts`** — delete `statusToKind` and `defaultMessage`,
  import `kindForStatus` and `defaultMessage` from `@/lib/errors`. Replace
  the two call sites.

### Behavior preservation

The proposed table exactly matches the current mappings:

| kind           | current worker status | current default message                |
| -------------- | --------------------: | -------------------------------------- |
| invalid_query  |                   400 | "Invalid query."                       |
| not_found      |                   404 | "City not found."                      |
| quota_exceeded |                   429 | "Weather service quota exceeded."      |
| upstream       |                   502 | "Weather service is unavailable."      |
| network        |                   504 | "Could not reach the weather service." |

No response bodies or statuses change. The existing worker and client tests
should pass unmodified.

## What is NOT changing

- No new error kinds.
- No runtime error class changes. `WeatherApiError` (worker) and
  `WeatherClientError` (frontend) keep their identities — they're useful as
  type guards in `instanceof` checks and shouldn't be merged.
- No localization layer. Messages are plain English strings; i18n is not on
  the table.
- `ErrorResponse` wire shape is unchanged.

## Testing

- `src/lib/errors.test.ts` — tiny test asserting `kindForStatus` is the
  inverse of `statusForKind` for every known kind, and that an unknown
  status falls back to `"upstream"`.
- Existing worker tests (status code assertions) and frontend tests
  (per-error-kind rendering) pass unchanged.

## Migration

Single PR:

1. Create `src/lib/errors.ts` with the table and helpers.
2. Update the 4 call sites listed above.
3. Add the inverse-lookup test.
4. Run existing tests — no other edits expected.
