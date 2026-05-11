# Air Comfort Display — Implementation Plan

Derived from `file.md` and the design interview. `file.md` itself stays as-written (per the "do nothing to file.md" decision); discrepancies between the doc and this plan are listed in §1.

## 1. Locked semantics

**Boundary rule.** All ranges in the spec tables read as `≥ lower AND < upper` (lower-inclusive, upper-exclusive). Verified: with the 4 reference-row corrections you applied, all 26 reference rows pass under this rule.

**Damp override.** `tempC < 12 AND humidity > 80` → air label is `"Damp"` (replaces, not appends). Operators kept strict to match the spec text verbatim.

**Canonical labels.**

| Axis | Labels (in order) |
|---|---|
| Thermal (feels-like, °C) | `Very cold` (<-5) · `Cold` ([-5, 4)) · `Chilly` ([4, 10)) · `Cool` ([10, 16)) · `Mild` ([16, 22)) · `Warm` ([22, 27)) · `Hot` ([27, 35)) · `Very hot` ([35, 40)) · `Dangerously hot` (≥40) |
| Air (dew point, °C) | `Very dry` (<-4) · `Dry` ([-4, 4)) · `Slightly dry` ([4, 10)) · `Comfortable` ([10, 16)) · `Slightly humid` ([16, 21)) · `Humid` ([21, 24)) · `Very humid` (≥24) · `Damp` (override) |

**Spec/plan deltas (intentional, not pushed back into file.md):**
- `Comfortable air` → `Comfortable` (dropped trailing noun; works in single-sentence form).
- Range notation will read as `≥ lower AND < upper` in code; file.md still uses the looser `X to Y` notation.

## 2. Presentation

- Section header: `Air comfort`.
- Body: single sentence `${Thermal} and ${air|damp}` with thermal capitalized, rest lowercase. Examples: `Warm and slightly humid`, `Chilly and damp`, `Mild and comfortable`, `Dangerously hot and very humid`.
- Footer: `Dew {n}°  ·  Humidity {n}%`. (Feels-like deliberately omitted — owned by the hero.)
- Background tint: muted OKLCH gradient.
  - **Hue from thermal axis** (feels-like): cold = blue, mild = green, hot = orange/red. Linear-ish hue ramp across the 9 thermal labels.
  - **Chroma from air axis**: dry = grayish (low chroma), humid = vibrant (high chroma). `Damp` rides the humid end of the chroma scale (it's humid air); the cold thermal hue makes it land as "saturated cool morning".
  - Visual ceiling matches the existing `uv-card.tsx` tint (≈`oklch(0.92 c h)`).

## 3. Code organization

```
src/lib/air-comfort.ts          # pure function + label types
src/lib/air-comfort.test.ts     # 26 reference rows + boundary rows
src/components/weather/air-comfort-card.tsx   # new card (sentence + tint + footer)
src/components/weather/exposure-card.tsx      # combined UV + AQI tile
```

**Function shape.**

```ts
type ThermalLabel = "Very cold" | "Cold" | "Chilly" | "Cool" | "Mild"
                  | "Warm" | "Hot" | "Very hot" | "Dangerously hot";
type AirLabel = "Very dry" | "Dry" | "Slightly dry" | "Comfortable"
              | "Slightly humid" | "Humid" | "Very humid" | "Damp";

interface AirComfortInput {
  tempC: number; feelsLikeC: number; dewpointC: number; humidity: number;
}
interface AirComfort {
  thermal: ThermalLabel; air: AirLabel; sentence: string;
}

function airComfort(input: AirComfortInput): AirComfort
```

The card consumes `{ thermal, air, sentence }` and computes the OKLCH tint locally (separation of concerns: lib = labeling logic, card = presentation).

## 4. Tests

- **Reference rows (26):** parameterized `it.each` table containing every row from §Reference Data of `file.md`, asserting `{ thermal, air }` matches.
- **Boundary rows:** one test per band edge, exercising both sides:
  - Thermal edges: -5, 4, 10, 16, 22, 27, 32, 40 (and -6 for `Very cold`).
  - Air edges: -4, 4, 10, 16, 21, 24 (and -5 for `Very dry`).
  - Damp threshold: temp ∈ {11.99, 12}, humidity ∈ {80, 80.01}.
- **Sentence format:** spot-check that `{ thermal: "Mild", air: "Comfortable" }` produces `"Mild and comfortable"` and that the `Damp` override yields `"Chilly and damp"`.

## 5. Grid changes

Current row 2: `AstroCard (xl col-span-2)` + `AtmospherePanel (xl col-span-4)` + `ComfortCard (xl col-span-6)`.

New row 2: `AstroCard (col-span-2)` + `AtmospherePanel (col-span-4)` + `AirComfortCard (col-span-3)` + `ExposureCard (col-span-3)`. Total still 12 cols on xl; sm layout uses each card's existing `sm:col-span-6` so two-up stacking is preserved.

## 6. Deletions

- `src/components/weather/comfort-card.tsx` — fully replaced.
- `src/components/weather/uv-card.tsx` — already unused; absorbed into ExposureCard.

## 7. Verification

`pnpm typecheck && pnpm lint && pnpm test:run`.

Out of scope (per interview): hourly/daily forecasts (no upstream dewpoint), spec doc edits, hero-card thermal label.
