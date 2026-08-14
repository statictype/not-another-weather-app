# Issues

Implementation briefs. One file per unit of work, each landing as its own
commit on the working branch. RFCs in `docs/rfcs/` describe designs; ADRs in
`docs/decisions/` record choices that were closed off. These describe work that
has been specified but not yet done.

Landing order below is dependency order. Items with no `Depends on` line can
land at any point.

| #                                        | Title                                        | Depends on | Source item |
| ---------------------------------------- | -------------------------------------------- | ---------- | ----------- |
| [001](001-moon-phase-geometry.md)        | Fix moon phase geometry                      | —          | 6           |
| [002](002-forecast-wire-surface.md)      | Extend the forecast wire surface             | —          | 2, 3, 4     |
| [003](003-weather-alerts.md)             | Weather alerts badge and modal               | 002        | 2           |
| [004](004-hero-precipitation.md)         | Precipitation strip in the hero              | 002        | 3           |
| [005](005-hourly-mode-switch.md)         | Hourly Temp/Precip switch                    | 002        | 4           |
| [006](006-unit-system.md)                | Unit system switch                           | 002        | 5           |
| [007](007-condition-code-table.md)       | Condition code table and intensity standards | —          | 7           |
| [008](008-motion-foundation.md)          | Motion foundation                            | —          | 1           |
| [009](009-city-change-morph.md)          | City-change morph                            | 008        | 1           |
| [010](010-search-container-transform.md) | Input-to-menu container transform            | 008        | 1           |
| [011](011-background-video.md)           | Background video layer                       | 007, 008   | 7           |

## Cross-cutting constraints

Every issue below is bound by these. They are not restated in each file.

- **`CACHE_VERSION` is bumped exactly once**, in 002. Any later DTO change needs
  its own bump — see the gotcha in `CLAUDE.md`.
- **Zod stays out of the client bundle.** New DTO types are type-only imports
  from `@/lib/schemas`; runtime schemas stay worker-side.
- **Thresholds stay metric.** See 006 — unit conversion happens at the format
  boundary, never in logic.
- **`pnpm ci` passes**: format:check → lint → typecheck → test:run → build.
- Lighthouse stays at 99/100/100/100 (ADR 001). LCP is 0.7 s and nothing here
  may enter the critical path ahead of the `current` tier.
