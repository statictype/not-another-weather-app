# RFC 012 — Air comfort labeling

## Problem

The hero shows a feels-like temperature and the metrics tile shows raw
dewpoint and humidity numbers, but neither captures the **felt** quality
of the air the way "Warm and slightly humid" does. We want a short,
accessible mood summary alongside the hero — no comfort score, no
evocative-but-obscure vocabulary, no UI that pretends to be opinionated
about whether _you_ are comfortable (comfort depends on wind, sun,
clothing, activity, preference; a score can't honestly capture that).

## Two-axis model

Every summary is composed of two independent labels: a **thermal label**
(how hot or cold it feels) and an **air label** (how moist or dry the
air is). They are computed from different inputs and shown together.

### Why dew point for the air axis

Relative humidity alone is misleading: 80% RH at 10°C feels nothing like
70% RH at 30°C. Dew point is an absolute measure of moisture in the air
and is the correct primary input for the air-character axis. RH is used
only for the cold-damp override (see below).

### Why plain vocabulary

"Muggy", "crisp", "oppressive", "arid", "raw" are evocative but not
universally understood (or translatable). "Humid" and "dry" are. The
sentence reads like English, not a thesaurus.

## Boundary convention

All ranges are **lower-inclusive, upper-exclusive**: "a to b" means
`a ≤ x < b`. The top and bottom bands extend to infinity in the open
direction.

## Thermal axis (driven by "feels like" temperature)

| Feels like (°C) | Label           |
| --------------- | --------------- |
| ≥ 40            | Dangerously hot |
| 35 to 40        | Very hot        |
| 29 to 35        | Hot             |
| 22 to 29        | Warm            |
| 16 to 22        | Mild            |
| 10 to 16        | Cool            |
| 4 to 10         | Chilly          |
| -5 to 4         | Cold            |
| < -5            | Very cold       |

## Air axis (driven by dew point)

| Dew point (°C) | Label          |
| -------------- | -------------- |
| ≥ 24           | Very humid     |
| 21 to 24       | Humid          |
| 16 to 21       | Slightly humid |
| 10 to 16       | Comfortable    |
| 4 to 10        | Slightly dry   |
| -4 to 4        | Dry            |
| < -4           | Very dry       |

## Damp override

When `tempC < 12 AND humidity > 80` (strict operators on both sides),
**replace** the air label with `"Damp"`. This captures the cold-damp
sensation that low absolute humidity readings would otherwise mask
(a 7°C dew point is technically "Slightly dry" by the table, but at
10°C with 82% RH it reads as damp, not dry).

## Edge cases

- "Dangerously hot" and "Very cold" do **not** suppress the air label.
  Both labels are always rendered.
- The thermal label is computed from feels-like temperature; the air
  label is computed from actual temperature, dew point, and RH (RH only
  for the damp check).
- `Damp` rides the humid end of the mood-card chroma scale (it is humid
  air); paired with a cold thermal hue this lands visually as
  "saturated cool morning".

## Presentation

`AirComfortMoodCard` (`src/components/weather/air-comfort-mood-card.tsx`):

- Section header: `Air comfort`.
- Body: single sentence `${Thermal} and ${air|damp}` — thermal
  capitalized, rest lowercase. Examples: `Warm and slightly humid`,
  `Chilly and damp`, `Mild and comfortable`, `Dangerously hot and very humid`.
- Footer: a Beaufort wind label (`Calm` / `Light air` / ... / `Hurricane`).
- Background: muted OKLCH gradient.
  - **Hue from thermal axis**: cold = blue, mild = green, hot =
    orange/red. Linear-ish hue ramp across the 9 thermal labels,
    bucketed into `red | orange | yellow | green | blue | silver`.
  - **Chroma from air axis**: dry = grayish (low chroma), humid =
    vibrant (high chroma). `Damp` maps to 90% on the humid scale.

`AirComfortCard` (`src/components/weather/air-comfort-card.tsx`) is a
separate metrics tile that ships next to the mood card. It renders raw
numbers (Dew, Humidity, Wind, Visibility) and does **not** consume the
two-axis labeler. The two cards have overlapping inputs but distinct
affordances; do not merge them.

## Code organization

```
src/lib/air-comfort.ts                       # pure labeler + style helper
src/lib/air-comfort.test.ts                  # 26 reference rows + boundary rows
src/components/weather/air-comfort-mood-card.tsx  # sentence + tint + Beaufort
src/components/weather/air-comfort-card.tsx       # raw metrics (no labeler)
```

### Function shape

```ts
type ThermalLabel =
  | "Very cold" | "Cold" | "Chilly" | "Cool" | "Mild"
  | "Warm" | "Hot" | "Very hot" | "Dangerously hot";

type AirLabel =
  | "Very dry" | "Dry" | "Slightly dry" | "Comfortable"
  | "Slightly humid" | "Humid" | "Very humid" | "Damp";

interface AirComfortInput {
  tempC: number;
  feelsLikeC: number;
  dewpointC: number;
  humidity: number;
}
interface AirComfort {
  thermal: ThermalLabel;
  air: AirLabel;
  sentence: string;
}

function airComfort(input: AirComfortInput): AirComfort;
function airComfortStyle(args: { thermal: ThermalLabel; air: AirLabel }):
  { bucketClass: string; background: string };
```

The mood card consumes `{ thermal, air, sentence }` plus the style
helper's `{ bucketClass, background }`. Separation of concerns: lib =
labeling logic, card = presentation.

## Tests

`src/lib/air-comfort.test.ts` covers:

- **Reference rows (26):** parameterized `it.each` table — every row
  from the Reference Data section below, asserting `{ thermal, air }`.
- **Boundary rows:** one test per band edge, exercising both sides.
  Thermal edges at -5, 4, 10, 16, 22, 29, 35, 40 (and -6 for `Very
  cold`); air edges at -4, 4, 10, 16, 21, 24 (and -5 for `Very dry`).
- **Damp threshold:** `tempC ∈ {11.99, 12}`, `humidity ∈ {80, 80.01}` —
  pins the strict operators on both inputs.
- **Sentence format:** spot-checks that `{ Mild, Comfortable }` →
  `"Mild and comfortable"` and the `Damp` override → `"Chilly and damp"`.

## Reference data

The following observations validate the framework end-to-end. Each row
lists the inputs and the expected output labels.

| Location           | Temp (°C) | Feels (°C) | Dew (°C) | RH (%) | Thermal         | Air            |
| ------------------ | --------- | ---------- | -------- | ------ | --------------- | -------------- |
| Cairo              | 29        | 27         | 3        | 15     | Warm            | Dry            |
| Panipat, India     | 43        | 45         | 9        | 13     | Dangerously hot | Slightly dry   |
| Beijing            | 29        | 27         | 1        | 43     | Warm            | Dry            |
| Dungarvan, Ireland | 10        | 8          | 7        | 82     | Chilly          | Damp           |
| Berlin             | 16        | 16         | 10       | 72     | Mild            | Comfortable    |
| Bali               | 29        | 32         | 23       | 70     | Hot             | Humid          |
| Nuuk, Greenland    | 2         | -5         | 0        | 93     | Cold            | Damp           |
| Moscow             | 10        | 9          | 8        | 87     | Chilly          | Damp           |
| Grand Canyon       | 2         | -1         | -12      | 28     | Cold            | Very dry       |
| Las Vegas          | 26        | 24         | -11      | 16     | Warm            | Very dry       |
| Kufra              | 24        | 24         | 6        | 32     | Warm            | Slightly dry   |
| Windhoek, Namibia  | 23        | 23         | -16      | 7      | Warm            | Very dry       |
| Algiers            | 23        | 25         | 13       | 47     | Warm            | Comfortable    |
| New York           | 12        | 10         | -2       | 38     | Cool            | Dry            |
| Los Angeles        | 17        | 17         | 15       | 84     | Mild            | Comfortable    |
| Hammerfest         | 11        | 11         | 4        | 40     | Cool            | Slightly dry   |
| Tripoli            | 22        | 25         | 14       | 60     | Warm            | Comfortable    |
| Doha               | 40        | 40         | 8        | 10     | Dangerously hot | Slightly dry   |
| Kananga            | 24        | 26         | 21       | 81     | Warm            | Humid          |
| Porto Velho        | 19        | 19         | 16       | 83     | Mild            | Slightly humid |
| Ha, Bhutan         | 14        | 13         | 8        | 69     | Cool            | Slightly dry   |
| Lima               | 20        | 20         | 18       | 87     | Mild            | Slightly humid |
| Ushuaia            | 6         | 5          | 0        | 65     | Chilly          | Dry            |
| Perth              | 21        | 21         | 11       | 31     | Mild            | Comfortable    |
| Sichuan            | 28        | 28         | 12       | 37     | Warm            | Comfortable    |
| Kuala Lumpur       | 32        | 47         | 25       | 71     | Dangerously hot | Very humid     |

## Notes on canonical labels

- The shipping label set drops the trailing noun on `Comfortable` (the
  spec draft had `Comfortable air`). In the single-sentence form
  ("Mild and comfortable") the noun is redundant.
- The 29°C Warm/Hot boundary differs from an earlier draft that placed
  it at 27°C. The shipped boundary is what the test reference rows
  validate (`Cairo @27 → Warm`, `Sichuan @28 → Warm`).

## Out of scope

- Hourly/daily forecast variants of the mood label — upstream does not
  return dew point on the forecast tier, so the labeler cannot run.
- Surfacing the thermal label on the hero — the hero owns the
  feels-like number; duplicating the bucket would be noise.
