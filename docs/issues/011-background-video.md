# Issue 011 — Background video layer

**Status:** Not started
**Depends on:** 007, 008
**Source:** original item 7 — the video half

## Problem

The background is a CSS gradient with a `night` variant (`App.tsx:110`). It does
not respond to conditions: a thunderstorm and a clear sky render the same sky.

## Constraints this has to survive

| Constraint                               | Source                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| LCP 0.7 s, Lighthouse perf 99            | ADR 001. A 1080p loop is 1–3 MB — an order of magnitude more than the entire 93 KB gz app |
| iOS blocks autoplay in Low Power Mode    | Regardless of `muted`. Needs a still fallback                                             |
| `prefers-reduced-motion` covers video    | A looping background is motion                                                            |
| Day-mode text is AA as of commit 584af39 | Footage behind it invalidates every contrast ratio unless a scrim guarantees them         |
| Workers static assets cap at 25 MiB/file | Not binding at the sizes below, but it is the ceiling                                     |

## Decision

### Layering

```
video          — crossfades in when ready, never blocks anything
LQIP           — blurred first frame, paints with the HTML
scrim          — fixed overlay guaranteeing text contrast
content        — unchanged
```

The video is never in the critical path. It loads after the `current` tier
resolves and crossfades over the LQIP. LCP is unaffected because the LCP element
never waits on it.

### The base layer is an inline LQIP, not the gradient

A 32px-wide blurred WebP of each clip's first frame, base64'd into the
condition-to-video map. Roughly 400–600 bytes each, ~14 KB for the full set of
24, shipped in the JS bundle with **zero additional requests** — it paints in
the same frame as the HTML.

Because it is the clip's own palette, the crossfade has no colour jump; the
video sharpens into focus rather than replacing something else.

The LQIP is also the permanent background for every case where the video is
skipped, so those users get a condition-appropriate backdrop rather than a
fallback that looks like a fallback.

Generated at build time from the clips, not hand-authored. The generator is
committed so the set can be regenerated when a clip is swapped.

### Clip set — 24

The twelve groups from 007, each in a day and a night variant. Day and night are
different footage, not the same clip darkened: a clear night sky is the entire
reason for having one.

Selection key: `(conditionGroup(current.conditionCode), current.timeOfDay)`.
It follows the condition, not only the city — the same city crossing sunset
changes clip.

### Encoding budget

| Property   | Value                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| Resolution | 1280×720                                                                                                                   |
| Duration   | 6–10 s, seamless loop                                                                                                      |
| Audio      | none — the track is stripped, not muted                                                                                    |
| Target     | ≤ 600 KB per clip, ≤ 1.5 MB hard ceiling                                                                                   |
| Formats    | AV1/WebM first, H.264/MP4 fallback, via two `<source>` tags                                                                |
| Flags      | `-movflags +faststart` on the MP4 so the `moov` atom is at the front and playback can start after the first few hundred KB |
| Attributes | `muted`, `loop`, `playsinline`, `preload="none"`, `poster`                                                                 |

At ≤ 600 KB per clip, streaming is largely moot — that is the point of the
budget. `faststart` plus range requests covers the slow-connection case without
a player library. Cloudflare Stream would give true adaptive bitrate but it is a
paid product on an external origin, and 8-second loops do not need it.

Clips live in `public/`: same origin, cached by Cloudflare, one deploy, no CORS.
Only one clip is ever fetched per city, so ~24 × 600 KB is a repository-size
number, not a user-facing one.

### Skip conditions

The video never loads when any of these hold. The LQIP stays as the background.

- `prefers-reduced-motion: reduce`
- `navigator.connection.saveData`
- `navigator.connection.effectiveType` of `slow-2g`, `2g` or `3g`
- The `play()` promise rejects — iOS Low Power Mode. Fail silently to the LQIP;
  do not retry, do not surface an error.

All `navigator.connection` reads are guarded; it is absent in Safari and in
jsdom.

### Scrim

A fixed overlay between video and content whose opacity is tuned so the AA
ratios from commit 584af39 hold against the **brightest frame** of the
brightest clip, not against an average. The scrim is present whether the layer
showing is the video or the LQIP, so contrast does not depend on what loaded.

Verify with an automated contrast check against the extracted brightest frame of
each clip, not by eye.

### Sourcing and licensing

24 clips need a licence permitting commercial use without attribution, or with
attribution the repository actually carries. Record the source and licence of
every clip in `docs/conditions.md` alongside its group. A clip whose provenance
cannot be stated does not ship.

This is the largest single cost in the issue and it is not engineering time.

## Acceptance criteria

- Lighthouse performance stays at 99 and LCP does not regress, measured on
  `pnpm preview` over three runs as ADR 001 did.
- With `prefers-reduced-motion` or `saveData` set, no video request is made at
  all — asserted, not observed.
- Every text/background pair clears AA against each clip's brightest frame.
- A rejected `play()` leaves the LQIP visible with no console error and no
  visible failure state.
- Switching cities crossfades between clips; switching to a city in the same
  condition group does not reload the clip.
- Each clip's licence and source is recorded.

## Out of scope

Video for the 3-day forecast cards. Per-hour video. Time-of-day gradients beyond
the existing day/night split. Any parallax or scroll-linked treatment.
