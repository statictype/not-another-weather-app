# Testing

```bash
pnpm test         # watch mode
pnpm test:run     # single run
```

The suite has two projects:

- **`frontend`** runs in jsdom and tests the React app, hooks, and the API client. Mocks are at the network boundary via **MSW** so the real fetch path is exercised end-to-end.
- **`worker`** runs in workerd via `@cloudflare/vitest-pool-workers` and tests the Worker handler against `fetchMock` (an undici mock agent). Real Worker runtime, real Cache API, real bindings — no Node-side simulation.

## What's covered

- The hooks (`useHistory`, `useUndo`, `useDebouncedValue`, `useWeather`) are tested exhaustively because they hold the branching logic.
- The Worker proxy is tested per branch: happy path, 404, quota, generic upstream, empty query, cache hit, cache normalization.
- The frontend API client is tested per error kind via MSW.
- One integration test exercises the full search → render → history → undo flow against the real composition.

## What isn't

Per-component unit tests are intentionally not written. They tend to re-implement the component in the test and break on every refactor without catching real bugs. The hook tests + integration test cover what matters.

See [RFC 006 — test strategy](./rfcs/006-test-strategy.md) for the longer rationale.
