# Issue 003 — Weather alerts badge and modal

**Depends on:** 002
**Source:** original item 2

## Problem

Severe-weather alerts are the one piece of weather information that is
actionable. Nothing in the app surfaces them today.

### Plan tier

WeatherAPI documents alerts as limited on the free plan. Behaviour on a free key
is an empty `alerts.alert[]`, not an error. The feature is therefore built to
render nothing when the array is empty, which is also its behaviour for the
majority of locations on any plan. It must be provable without a live alert —
see Testing.

## Decision

One badge row in the Now card, at the top of the tile. It opens a modal listing
every active alert.

### Badge

Sits above the four metric rows in `now-card.tsx`, inside the same tile, below
the `Now` section label. Absent entirely when `alerts.length === 0` — no empty
state, no placeholder.

Content: a severity icon, the `event` string of the worst alert, and a `+N`
suffix when `alerts.length > 1`.

```
[!] Flood Warning  +2
```

Severity drives the icon and colour:

| Severity   | Icon                | Treatment |
| ---------- | ------------------- | --------- |
| `extreme`  | `OctagonAlertIcon`  | strongest |
| `severe`   | `TriangleAlertIcon` | strong    |
| `moderate` | `TriangleAlertIcon` | medium    |
| `minor`    | `InfoIcon`          | quiet     |
| `unknown`  | `InfoIcon`          | quiet     |

Colour must clear WCAG AA against both the day and night tile surfaces. Commit
584af39 brought day-mode text to AA; an alert row is the highest-stakes text on
the page and cannot be the one thing that fails. Severity is never encoded by
colour alone — the icon and the event text carry it too.

The tile's height must not depend on `alerts.length`. One row, always, or none.
The Now card sits beside the hero in a shared grid row.

### Modal

Radix Dialog, not AlertDialog. `src/components/ui/` has `alert-dialog.tsx` but
no `dialog.tsx`; AlertDialog is `role="alertdialog"` and expects a decision from
the user, which is the wrong semantics for an informational panel. Vendor
shadcn's `dialog.tsx` into `src/components/ui/` unmodified — that directory is
ESLint-ignored and is not reformatted.

All alerts, worst first (the worker already sorts). Per alert:

| Field                   | Rendering                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `event`                 | title                                                                                                                 |
| `severity`              | chip beside the title                                                                                                 |
| `effective` → `expires` | one line, formatted in the **location's** timezone via the same `Intl` treatment as the hero clock — not the viewer's |
| `areas`                 | one line, quiet                                                                                                       |
| `desc`                  | body, `whitespace-pre-line`                                                                                           |
| `instruction`           | body, visually separated; omitted when empty                                                                          |

`desc` from US NWS runs several hundred words with hard line breaks. The modal
body scrolls; the title and close control do not.

Empty-string fields are omitted, not rendered as blank rows. Several providers
send `instruction: ""` and `areas: ""`.

Dropped: `msgtype`, `category`, `certainty`, `urgency`, `note` — constant across
almost all alerts (`Alert`, `Met`, `Likely`) and of no use to a reader deciding
whether to leave the house.

## Testing

The demo key will not produce an alert on demand. Prove it two ways:

- MSW fixtures in the frontend project covering: no alerts, one alert, three
  alerts of mixed severity, an alert with empty `instruction`/`areas`, and a
  multi-paragraph `desc`.
- A dev-only override so the rendered result can be inspected in a browser.
  Follow the precedent of the retired `/moods` editor: dev-only, and not tested
  itself.

## Acceptance criteria

- Zero alerts renders zero additional DOM in the Now card.
- The Now card's height is identical with 0 and with 3 alerts.
- Badge and modal both clear AA in day and night modes.
- Modal traps focus, closes on Escape, and returns focus to the badge.
- Severity is not communicated by colour alone.

## Out of scope

Alert notifications, alert history, filtering by severity, deduplicating
near-identical alerts from overlapping provider zones (the cap of 5 in 002 is
the only bound).
