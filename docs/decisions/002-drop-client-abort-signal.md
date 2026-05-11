# 002 — Drop client-side `AbortSignal` from the API client

**Status:** accepted
**Date:** 2026-04-09

## Context

`src/api/weather.ts` originally accepted an `AbortSignal` and forwarded it
into `fetch`, with TanStack Query passing its per-query signal into the
`queryFn`. The pattern is idiomatic v5 and gives in-flight requests
cancellation when a query key changes.

Under Vitest + jsdom on **Node 24**, the signal handed to `queryFn` is
constructed in a different realm than the one undici (Node's `fetch`
implementation) brand-checks against. Node 24's undici hardened that brand
check and now rejects the cross-realm signal outright, failing tests with
an opaque `TypeError` originating inside `fetch`.

The same setup works under Node 22 (looser brand check) and on real
browsers (single realm). The only failure mode is the jsdom test
environment.

## Decision

Drop the signal pass-through in `src/api/weather.ts` entirely. The frontend
`request<T>()` helper no longer takes a `signal` parameter, and the
`useWeather*` hooks no longer destructure one out of `queryFn`'s context.

While there, resolve all fetch paths against `window.location.origin` —
undici-on-jsdom also stumbles on relative URLs in some Node versions, and
this removes the second compatibility paper-cut at the same point.

Engines range widened back to `>=22 <25` so we don't have to pin away from
Node 24.

## Why this is acceptable

Cancellation matters when the cancelled work is expensive or contentious.
Our `queryFn`s call our own Worker, which serves cached responses in
~10–50 ms and uncached ones in ~200–400 ms. By the time the cancellation
would have propagated, the response has already arrived (or is about to).
TanStack Query's `placeholderData: keepPreviousData` still handles the UX
of "previous card stays visible during the next fetch" — that doesn't need
network-level cancellation.

The **worker** side still receives `request.signal` and forwards it to
upstream (`src/worker/weather-api.ts`), so if the edge cancels the worker
request the upstream call is cancelled too. The dropped piece is purely
the client-side cancellation; the server-side chain is intact.

## Alternatives considered

- **Polyfill / patch undici's brand check in tests.** Brittle; ties the
  test harness to a specific undici internal. Rejected.
- **Pin Node to 22 in CI.** Works today, but lets the divergence rot. Node
  24 will eventually be the floor; pinning just delays. Rejected.
- **Construct the signal in the realm undici expects.** Tried — requires
  reaching into TanStack Query's internals to substitute the signal at
  `queryFn` entry. Rejected as fragile.

## Revisit if

- TanStack Query exposes a non-realm-tied cancellation primitive.
- The upstream latency or backpressure profile changes such that
  cancellation has real value (e.g. if we ever cache-bust during typing).
- A different jsdom or undici release fixes the cross-realm issue.

In any of those cases, restoring `signal` is a localized change — one
parameter through `request()`, one option on `fetch`, one destructure in
each `queryFn`.
