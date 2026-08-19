# Issues

Implementation briefs. One file per unit of work, each landing as its own
commit on the working branch. RFCs in `docs/rfcs/` describe designs; ADRs in
`docs/decisions/` record choices that were closed off. These describe a change
before it lands, and each file keeps its `Status` line current afterwards.

Landing order below is dependency order. Items with no `Depends on` line can
land at any point.

| #                                     | Title                                        | Status      | Depends on | Source item |
| ------------------------------------- | -------------------------------------------- | ----------- | ---------- | ----------- |
| [001](001-moon-phase-geometry.md)     | Fix moon phase geometry                      | Done        | —          | 6           |
| [002](002-forecast-wire-surface.md)   | Extend the forecast wire surface             | Done        | —          | 2, 3, 4     |
| [003](003-weather-alerts.md)          | Weather alerts badge and modal               | Done        | 002        | 2           |
| [004](004-hero-precipitation.md)      | Precipitation strip in the hero              | Done        | 002        | 3           |
| [005](005-hourly-matrix.md)           | Hourly reading matrix                        | Done        | 002        | 4           |
| [006](006-unit-system.md)             | Unit system switch                           | Done        | 002        | 5           |
| [007](007-condition-code-table.md)    | Condition code table and intensity standards | Not started | —          | 7           |
| [008](008-motion-foundation.md)       | Motion foundation                            | Not started | —          | 1           |
| [009](009-city-change-morph.md)       | City-change morph                            | Not started | 008        | 1           |
| [010](010-navigation-bar-and-menu.md) | Navigation bar and menu                      | Not started | —          | 1           |
| [011](011-background-video.md)        | Background video layer                       | Not started | 007, 008   | 7           |

## Cross-cutting constraints

Every issue below is bound by these. They are not restated in each file.

- **`CACHE_VERSION` is bumped by any DTO change.** 002 took it to `"9"` and 006
  to `"10"` — see the gotcha in `CLAUDE.md`.
- **Zod stays out of the client bundle.** New DTO types are type-only imports
  from `@/lib/schemas`; runtime schemas stay worker-side.
- **A classification reads one canonical field.** See 006. Its output cannot
  change when a viewer flips a display preference, because the published
  Beaufort and comfort tables are independently rounded per unit.
- **`pnpm ci` passes**: format:check → lint → typecheck → test:run → build.
- Lighthouse stays at 99/100/100/100 (ADR 001). LCP is 0.7 s and nothing here
  may enter the critical path ahead of the `current` tier.
