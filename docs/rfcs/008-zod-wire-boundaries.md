# RFC 008 — Zod at wire boundaries

## Problem

Two places in the codebase cross a wire and lie about type safety:

1. **Worker upstream parsing.** `src/worker/weather-api.ts` fetches
   WeatherAPI.com's JSON and does `return body as UpstreamCurrentResponse`
   (and the equivalent for forecast + history). That `as` is an
   unchecked cast. If WeatherAPI ever renames a field, drops a sub-object,
   or returns a slightly different shape, the bug manifests as an
   `undefined.something` crash inside a card component, far from the
   actual problem. Debugging means tracing the NaN or missing string
   back through the DTO shaping code and the handler and finally to
   the upstream response.

2. **Shared DTO types duplicated by hand.** `src/api/types.ts` and
   `src/worker/types.ts` both declare `WeatherLocation`,
   `CurrentConditions`, `ForecastDay`, `Astro`, `WeatherCurrent`,
   `WeatherForecast`, and `WeatherYesterday` — the same shapes,
   maintained in two places, with a comment saying "if you change one,
   change the other." The duplication is an active hazard. Every
   RFC 001 change had to touch both files.

Neither zod nor any other validator is currently in use.

## Goals

- Runtime validation of WeatherAPI.com responses inside the worker, so
  upstream schema drift fails loudly at the boundary with a precise
  error instead of silently corrupting the DTO.
- Single source of truth for the shared DTO shapes. Both the frontend
  and worker import the same types, derived from the same schema.
- **Zero frontend bundle impact.** This is a hard constraint — we're
  aiming for a 10/10 Lighthouse score and the app's JS budget is tight.

## Proposal

Add zod to the worker side only. Use `z.infer` to derive the shared
DTO types from a single schema file at `src/lib/schemas.ts`, and have
both the frontend and worker import types (not values) from there.

### Dependency

Add `zod@^4` (or the latest v3 if v4 isn't stable by the time this
ships) as a dependency. Its runtime code is only referenced by
worker-side code, so Vite tree-shakes it out of the client bundle
automatically — verified in D3 below.

### New file: `src/lib/schemas.ts`

A single file with `z.object(...)` schemas for every DTO our worker
returns. Each schema exports both the runtime validator and the
inferred type:

```ts
import { z } from "zod";

export const WeatherLocationSchema = z.object({
  name: z.string(),
  region: z.string(),
  country: z.string(),
  localTime: z.string(),
  tz: z.string(),
  lat: z.number(),
  lon: z.number(),
});
export type WeatherLocation = z.infer<typeof WeatherLocationSchema>;

export const CurrentConditionsSchema = z.object({
  tempC: z.number(),
  feelsLikeC: z.number(),
  conditionText: z.string(),
  conditionCode: z.number(),
  timeOfDay: z.enum(["day", "night"]),
  // ...full shape
});
export type CurrentConditions = z.infer<typeof CurrentConditionsSchema>;

export const WeatherCurrentSchema = z.object({
  location: WeatherLocationSchema,
  current: CurrentConditionsSchema,
});
export type WeatherCurrent = z.infer<typeof WeatherCurrentSchema>;

// ... WeatherForecast, WeatherYesterday, ForecastDay, Astro
```

`src/lib/schemas.ts` is added to `tsconfig.worker.json`'s `include`
array alongside `lib/errors.ts` and `lib/query.ts`, so both tsconfigs
see it.

### Worker upstream validation

`src/worker/weather-api.ts` defines a second family of schemas for the
**upstream** WeatherAPI.com shapes (separate from our own DTO shapes).
These are private to that file — not exported, not shared, not
imported by the frontend.

```ts
const UpstreamLocationSchema = z.object({
  name: z.string(),
  region: z.string(),
  country: z.string(),
  localtime: z.string(),
  tz_id: z.string(),
  lat: z.number(),
  lon: z.number(),
});

const UpstreamCurrentSchema = z.object({
  location: UpstreamLocationSchema,
  current: z.object({
    temp_c: z.number(),
    feelslike_c: z.number(),
    is_day: z.union([z.literal(0), z.literal(1)]),
    condition: z.object({ text: z.string(), code: z.number() }),
    // ... all fields we use
  }),
});
```

`fetchUpstream<T>` becomes `fetchUpstream<S extends z.ZodTypeAny>(url, schema, signal)`
and internally calls `schema.parse(body)`. Parse failures throw `ZodError`,
which the caller catches and maps to `WeatherApiError("upstream", ...)`
— the existing error class, no change to the public error surface.

The shape-to-DTO translation (`shapeLocation`, `shapeCurrent`, etc.)
stays as is. Its job is renaming fields (snake_case → camelCase) and
numeric rounding. Those responsibilities are separate from
validation.

### `src/api/types.ts` and `src/worker/types.ts`

Both files collapse to thin re-exports from `@/lib/schemas`:

```ts
// src/api/types.ts
export type {
  WeatherCurrent,
  WeatherForecast,
  WeatherYesterday,
  WeatherLocation,
  CurrentConditions,
  ForecastDay,
  Astro,
} from "@/lib/schemas";

// Frontend-only types that are NOT in the wire schema
export interface SuggestionItem { ... }

export type { WeatherErrorKind } from "@/lib/errors";
```

`src/worker/types.ts` does the same for its side. The hand-maintained
duplication is deleted.

## Design decisions

### D1. Zod v3 vs. zod v4

**Chosen: whichever is stable at implementation time, preferring v4.**

zod v4 (released Nov 2024) is significantly smaller (~5 KB gzipped vs.
~12 KB for v3) and has the same API surface for what we need. If v4
is stable at implementation time, use it. If stability is in question,
use v3 — the bundle difference is academic here because **zod runtime
code is not included in the frontend bundle** (D3), so the only cost
is on the worker side where a few KB doesn't matter.

### D2. Shared schemas vs. separate schemas per side

**Chosen: shared schemas for the DTO types, private schemas for the
upstream shapes.**

Considered but rejected: one big schemas file covering both the
upstream (WeatherAPI.com) shapes and our DTO shapes.

The upstream schemas are an **implementation detail** of the worker —
they describe what we currently accept from WeatherAPI.com. If we
ever swap providers, they get replaced entirely. They don't belong in
`@/lib/schemas.ts` alongside the public DTO shapes the frontend
consumes.

Keeping them private to `src/worker/weather-api.ts` means:

- ✅ The public `schemas.ts` file stays focused on the wire contract
  between our worker and our frontend.
- ✅ Swapping providers touches one file.
- ✅ Frontend build never sees the upstream schemas even as types.

### D3. Frontend bundle impact

**Chosen: verify "type-only imports from schemas.ts" tree-shakes zod
out of the client bundle. Fail the RFC if it doesn't.**

The theory: if `src/api/types.ts` does `export type { WeatherCurrent }
from "@/lib/schemas"`, TypeScript's `isolatedModules` / Vite's esbuild
erases the import at compile time. The resulting JS has zero reference
to zod. Vite's tree-shaking then drops zod from the client bundle
entirely.

**But** this depends on call-site discipline. If any frontend file
accidentally does `import { WeatherCurrentSchema } from "@/lib/schemas"`
(value import, not type), zod enters the client bundle. The bundle
size check is the regression test.

Concrete verification step during implementation:

1. Run `pnpm run build` before the change; note the client bundle
   gzipped size (currently ~122 KB).
2. Run `pnpm run build` after the change.
3. **Fail the implementation** if the delta is more than ~1 KB
   gzipped. A small delta from whatever TypeScript helpers get
   emitted is acceptable; a 5+ KB delta means zod leaked in.

ESLint rule as a belt-and-suspenders check:

```js
// eslint.config.js
{
  files: ["src/api/**/*.ts", "src/hooks/**/*.ts", "src/components/**/*.tsx"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{
        group: ["zod"],
        message: "zod must not be imported from frontend code — use type imports from @/lib/schemas instead",
      }],
    }],
  },
}
```

This is belt-and-suspenders because the bundle size check already
catches the problem; the lint rule just flags it earlier during dev.

### D4. Parse at the client side too?

**Chosen: no.**

Considered: `fetchCurrent` (in `src/api/weather.ts`) could call
`WeatherCurrentSchema.parse(await res.json())` to validate responses
from our own worker. This would catch bugs where the worker returns
an unexpected shape despite the types.

Rejected because:

- It would pull zod's runtime code into the **client** bundle, blowing
  the zero-impact constraint.
- We control both sides of the wire. The worker's type-safe return
  path (post-zod-parse from upstream, through `shapeX()` functions
  that enforce our schema) is trustworthy enough.
- The cost/benefit doesn't justify the bundle impact.

If this ever becomes a real problem (e.g. a version-skew issue where
an old client talks to a new worker), we could add a runtime validator
that's tiny and zod-free — but that's speculative.

### D5. Schema-first vs. type-first

**Chosen: schema-first.**

Alternatives considered:

- **Type-first**: define `interface WeatherCurrent` by hand, also
  define `WeatherCurrentSchema = z.object(...) satisfies z.ZodType<WeatherCurrent>`,
  rely on the `satisfies` to keep them in sync. Rejected because the
  `satisfies` error messages are opaque and one side ends up
  authoritative in practice anyway. Schema-first with `z.infer` is
  cleaner.

- **JSON Schema + `json-schema-to-ts`**: standard format, works with
  OpenAPI tooling. Rejected because it's 10× the ceremony for a
  single-service app with no OpenAPI obligations.

- **io-ts / ArkType / Valibot**: all fine choices with smaller bundles
  than zod v3. Valibot in particular is ~1 KB gzipped. But zod v4 has
  closed most of the size gap, and zod is the de facto standard in
  the React/TanStack ecosystem — lower cognitive cost for anyone
  joining the project.

### D6. Handling parse failures

**Chosen: map to the existing `WeatherApiError("upstream", ...)`.**

When `UpstreamCurrentSchema.parse(body)` throws a `ZodError`:

1. Catch it in the calling `fetchCurrent` / `fetchForecast3` /
   `fetchYesterday` function.
2. Log the `ZodError.issues` to `console.error` (Cloudflare captures
   worker console output).
3. Throw `new WeatherApiError("upstream", "Weather service returned an unexpected response.")`.

No new error kind, no new `WeatherErrorKind` entry. The user sees the
same "service unavailable" message; the detailed structured error is
in the worker logs where an operator can see it.

### D7. Yesterday's non-fatal behavior

**Chosen: keep `{ yesterday: null }` as the fallback, extend to zod
failures.**

Today's `fetchYesterday` already swallows upstream failures and
returns `{ yesterday: null }` so the UI can omit the column. After the
zod change, a parse failure on history data also returns `null` —
it's non-fatal for the same reason the upstream fetch failure is.
Forecast and current still throw (they're load-bearing).

## What this is NOT

- Not a migration to a validated request body. We don't have user-submitted
  JSON anywhere; all inputs are query strings.
- Not a migration to schema-generated OpenAPI. Single-service app,
  no external consumers.
- Not client-side response validation. See D4.
- Not a replacement for the TypeScript type system. zod augments it at
  the boundary; the rest of the code stays plain TS.

## Testing

- `src/lib/schemas.test.ts` — tiny smoke test asserting each schema
  parses a representative fixture and rejects a plausibly-broken one
  (e.g. wrong-type field, missing required field). ~8 cases total.
- `src/worker.test.ts` — add one case per endpoint: upstream returns
  a structurally invalid body (e.g. `temp_c: "hot"`) → handler
  responds 502 with `upstream` kind. Validates that parse failures
  are mapped correctly.
- Existing tests stay green unchanged — the schema-derived types are
  structurally identical to what's there now.

## Migration

One PR, roughly:

1. `pnpm add zod`.
2. Create `src/lib/schemas.ts` with all shared DTO schemas + inferred
   type exports.
3. Add `src/lib/schemas.ts` to `tsconfig.worker.json`'s `include`.
4. Rewrite `src/api/types.ts` and `src/worker/types.ts` as thin
   re-exports from `@/lib/schemas`.
5. Add upstream schemas (private) to `src/worker/weather-api.ts`,
   pipe parses through `fetchUpstream`, handle `ZodError` in the
   three `fetchX` functions.
6. Add `no-restricted-imports` eslint rule for `zod` from frontend
   directories.
7. `pnpm run build` — verify client bundle delta is under ~1 KB
   gzipped. Fail and investigate if not.
8. `pnpm run ci` — all existing tests pass.
9. Add the schemas.test.ts smoke tests and worker parse-failure tests.

## Scope / order with RFC 006 and RFC 007

RFC 007 ships first (URL-driven city state) because it unblocks the
test simplification in RFC 006. RFC 008 (this doc) ships second
because it rewrites DTO types that test fixtures depend on — doing it
before 006 means 006's new tests are written against the final shape
once. RFC 006 ships last with the revised test plan on top of the
URL-driven app and zod-validated boundary.
