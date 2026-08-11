# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: a person who wants to know the weather in a named city — their
own, or one they are curious about. They arrive with no account, no setup, and
usually one question. Typical session: type a city, read the answer, leave.
Returning visits reopen the last city automatically.

Secondary reader: an engineer or hiring reviewer evaluating the codebase. The
repository is a portfolio piece and some copy addresses this reader directly
(the quota-exhausted state explains the free-tier limit and links to setup
instructions). This reader never outranks the primary user when the two
conflict.

## Product Purpose

Answer "what is the weather like in X" quickly and completely, then get out of
the way. Success is a correct, legible answer on first paint with no
configuration step, and enough depth (forecast, hourly, astro, air comfort,
yesterday's comparison) that the user does not need a second app.

## Positioning

Two things a neighboring weather app could not truthfully copy:

- **Two-axis air comfort.** Conditions are described as a sentence built from
  thermal (feels-like temperature, 9 labels) × air (dew point, 7 labels, plus a
  damp override at `tempC < 12 AND humidity > 80`). The sentence carries the
  same weight in the hero as the city name and the temperature — it is the
  answer, not a caption on it. `Comfortable` is the one evaluative word and is
  spoken only where the thermal band allows it — `Warm and comfortable`,
  `Hot but comfortable`, and at the extremes the thermal label alone. See
  RFC 012 and `src/lib/air-comfort.ts`.
- **A URL that is the state.** `?city=…` is the single source of truth for the
  active city. Every view is linkable and shareable; there is no internal
  "current city" that the address bar lags behind. See RFC 007.

## Operating Context

- One-shot lookups from a search field. Autocomplete fires 300 ms after idle
  typing at a 3-character minimum; the weather fetch fires only on an explicit
  selection (suggestion, recent, geolocation, or "surprise me").
- Both mobile and desktop are first-class. The search menu is one component
  rendered as a desktop dropdown or a mobile overlay via CSS, no variant prop.
- The rendered surface changes with the location's local time: a `night` class
  on the root swaps the sky and the tile surfaces.
- Recent cities persist in `localStorage` and sync across tabs via the native
  `storage` event. Removal and clear-all are undoable via toast.

## Capabilities and Constraints

Shipped capabilities: current conditions, 3-day forecast, next-24h hourly strip,
sunrise/sunset/moon phase, pressure/UV/AQI, location-local time, yesterday's
comparison column, city autocomplete, geolocation lookup, random-city pick,
recent-city history with undo.

Constraints:

- **No accounts, no server-side user data.** History lives in `localStorage`;
  the URL carries the active city. Binding.
- **Free WeatherAPI.com tier.** Edge caching (10 min / 1 h / 24 h per tier)
  keeps the demo inside quota. When quota is exhausted the app shows a dedicated
  explanatory state rather than an error page — a state real users can hit.
- Single Cloudflare Worker serves both the SPA and the four `/api/*` endpoints;
  one origin, no CORS, upstream key never reaches the browser.
- Stack is fixed by the existing codebase: React 19 (React Compiler on), Vite,
  Tailwind v4, vendored shadcn primitives in `src/components/ui/`, TanStack
  Query, motion, sonner, zod (worker-side only — banned from the client bundle).
- Yesterday's data is non-fatal: the column is omitted when the tier fails, and
  that tier does not retry.
- Terminology is defined once in `CONTEXT.md` (weather tier, active city,
  normalized query, thermal label, air label, damp override, mood card vs.
  metrics card, search overlay). Use those words.

## Brand Commitments

Binding:

- **The day/night sky treatment is the product's signature**, not decoration.
  It is driven by the location's local time, not the viewer's OS preference.
- **The OKLCH air-comfort mood tint was withdrawn** (Aug 2026). Six hue buckets
  read as decoration rather than information, and the sentence beside them
  already said the same thing in words. The palette module, the `/moods` editor
  that tuned it, and the `.ac-{bucket}` custom properties are all deleted. Do
  not reintroduce color as a comfort encoding. Mood is intended to return as a
  background treatment on the hero, driven by condition and time of day — not
  yet built, and out of scope until specified.
- **Lighthouse 99 / 100 / 100 / 100** (performance / accessibility / best
  practices / SEO, desktop, `pnpm preview`) is a standing floor. No design change
  may regress it. The one missing performance point is accepted and closed —
  see `docs/decisions/001-lighthouse-ceiling.md`.

**Open decision — name and mark.** The repository currently disagrees with
itself: `README.md` says "Oasis", while `index.html` `<title>` and
`package.json` say "not another weather app". The header mark is the 😶‍🌫️ emoji.
Neither the name nor the mark is settled. Do not treat any of the three as
authoritative, and do not silently pick one; resolve with the user before any
work that depends on the answer.

Voice, as written today: plain, lowercase-leaning, mildly self-aware, never
cute about data. "What's the weather like?" / "Search a city to find out" /
"Free tier exhausted". Not confirmed as a deliberate commitment — treat as
incumbent evidence.

## Evidence on Hand

- Live deployment: `oasis.hi-133.workers.dev`
- Screenshots: `docs/screenshot.png`, `docs/screenshot2.png`
- Measured Lighthouse run with per-metric values: `docs/decisions/001-lighthouse-ceiling.md`
- 12 RFCs (`docs/rfcs/`) and 3 ADRs (`docs/decisions/`) recording real design
  decisions and their alternatives
- Architecture narrative: `docs/architecture.md`; glossary: `CONTEXT.md`
- Test suite across two Vitest projects (jsdom + real workerd)

Absent — do not fabricate: users, usage numbers, testimonials, press,
customers, pricing, uptime or reliability claims, and any team beyond the single
author.

## Product Principles

1. **The answer arrives before the interface does.** Current conditions are
   LCP-critical and paint from their own endpoint; forecast, hourly, and
   yesterday stream in behind. Nothing that can wait may block the first answer.
2. **The URL is the state.** Every view is linkable. No hidden active-city
   state, no address bar that lags the screen.
3. **Degrade honestly, at the right layer.** The server reports failures
   truthfully; the render layer decides what is fatal. Yesterday's column simply
   disappears. Quota exhaustion gets its own explained state. No silent
   fallbacks, no invented data.
4. **Describe the weather, don't just report it.** The two-axis comfort sentence
   and its derived color are the product's point of view; raw numbers stay
   available alongside, never instead. The sentence says only what the reading
   supports: it never calls 40 °C comfortable.
5. **One source of truth per concept.** Tiers, DTOs, error kinds, query
   normalization, and the air-comfort palette are each named once and propagated
   by TypeScript. Design work that duplicates one of them is wrong even if it
   looks right.

## Accessibility & Inclusion

- **WCAG 2.2 AA** is the target. The Lighthouse accessibility score of 100 is a
  floor of automated checks, not the requirement.
- **`prefers-reduced-motion` is a hard requirement** given the animated sky, the
  mood tinting, and `motion` in the stack. **Not currently implemented** — a
  grep for `prefers-reduced-motion` across `src/` returns nothing. Any motion
  work must close this gap rather than add to it.
- Contrast must hold in both the day and night cascades, including text
  composited over the sky layer and over air-comfort gradient tints.
