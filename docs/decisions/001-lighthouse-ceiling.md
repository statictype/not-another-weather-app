# 001 — Stop Lighthouse perf at 99

**Status:** accepted
**Date:** 2026-04-09

## Context

Production Lighthouse (desktop, `pnpm preview`) scores after the initial pass of
fixes are stable across three runs:

```
Performance 99 · Accessibility 100 · Best Practices 100 · SEO 100
FCP 0.7 s · LCP 0.7 s · TBT 0 ms · CLS 0.004
```

The perf gap is a single point. FCP and LCP both *score* 0.98 despite displaying
0.7 s — simulated throttling measures a raw value of ~0.8 s. Weighted:
`0.1·0.98 + 0.25·0.98 + 0.3 + 0.25 + 0.1 = 0.993` → rounds to 99.

## Decision

Ship at 99. Do not pursue the last point.

## Fixes that landed on the way here

- Body background flipped to the day-mode tone (`src/index.css`) so axe no longer
  sees the h1 dark-foreground composited against a dark body → contrast pass.
- `<main>` landmark wraps the result area in `App.tsx`.
- `public/robots.txt` added so the ASSETS binding stops serving the SPA fallback
  for `/robots.txt`.
- `next-themes` dropped (unused — no `ThemeProvider` was wired). `Toaster` now
  hard-codes `theme="system"`.
- `vite.config.ts` splits `radix-ui` and `@tanstack/react-query` into vendor
  chunks.
- `Toaster` and the clear-all `AlertDialog` are lazy-loaded. Neither is visible
  on first paint, so there's no flash risk.

Main chunk: 400 KB → 304 KB (gz 122 → 93).

## Alternatives considered

- **Inline critical CSS.** Would likely push FCP/LCP scores to 1.0, but the 57 KB
  Tailwind bundle is hard to subset correctly. Getting it wrong causes a
  flash-of-unstyled-content on first load, which is worse than a 99 score.
- **Build-time prerender with `renderToString` + `hydrateRoot`.** ~50 lines plus
  a hydration audit of `useSearchParam` / `useHistory` for browser-only reads.
  Likely but not guaranteed to hit 100 — the render-blocking CSS still has to
  download before paint. Rejected as scope creep for one point.
- **Runtime SSR on the Worker.** Same perf ceiling as the prerender but with
  real runtime complexity (streaming, entry-server, hydration edge cases).
  Rejected.
- **Migrate to Next.js.** A rewrite, not a fix. Would lose the tailored
  Cloudflare Worker pipeline (`src/worker.ts`, the split `/api/weather*`
  handlers, edge cache normalization) and doesn't give 100 for free anyway.
  Rejected.

## Next lever (if ever revisited)

The render-blocking CSS is the only remaining thing Lighthouse flags. Either
inline a critical subset or shrink the Tailwind output aggressively. Everything
else is measurement noise.
