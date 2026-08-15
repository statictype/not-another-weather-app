# RFC 012 — Air comfort labeling

## Problem

The hero shows a feels-like temperature and the metrics tile shows raw
dewpoint and humidity numbers, but neither captures the **felt** quality
of the air the way "Warm and slightly humid" does. We want a short,
accessible mood summary alongside the hero — no comfort score, no
evocative-but-obscure vocabulary.

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

`Comfortable` is classified like any other band, but is not always
spoken — see "Speaking `Comfortable`" below.

## Damp override

When `tempC < 12 AND humidity > 80` (strict operators on both sides),
**replace** the air label with `"Damp"`. This captures the cold-damp
sensation that low absolute humidity readings would otherwise mask
(a 7°C dew point is technically "Slightly dry" by the table, but at
10°C with 82% RH it reads as damp, not dry).

## Speaking `Comfortable`

`Comfortable` is the only evaluative word in either vocabulary — it
describes the person, not the air. The sentence speaks it only where the
thermal label allows a human to be comfortable. Which conjunction joins
the two labels, or whether the air clause appears at all, is a function
of the thermal label:

| Thermal         | Join  | Sentence at dew 10 to 16 |
| --------------- | ----- | ------------------------ |
| Dangerously hot | —     | `Dangerously hot`        |
| Very hot        | —     | `Very hot`               |
| Hot (< 32)      | `but` | `Hot but comfortable`    |
| Hot (≥ 32)      | —     | `Hot`                    |
| Warm            | `and` | `Warm and comfortable`   |
| Mild            | `and` | `Mild and comfortable`   |
| Cool            | `but` | `Cool but comfortable`   |
| Chilly          | —     | `Chilly`                 |
| Cold            | —     | `Cold`                   |
| Very cold       | —     | `Very cold`              |

A dash drops the air clause; the sentence is then the thermal label
alone. The reading itself is unchanged — `air` is still `Comfortable`.

`Hot` spans 29 to 35, wide enough that its two halves differ: the
concession holds below 32 and is dropped at or above it. This is the
only numeric guard in the rule; every other row is a function of the
label alone.

Every air label other than `Comfortable` always joins with `and`,
including at the thermal extremes (`Dangerously hot and very humid`,
`Very cold and damp`).

The rule lives in `COMFORT_JOIN` in `src/worker/air-comfort.ts`, an
exhaustive `Record<ThermalLabel, …>`, keyed by thermal label.

## Edge cases

- Both labels are rendered except where `Comfortable` is unlicensed (see
  above); the sentence is then the thermal label alone. No other air
  label is ever suppressed, at any thermal extreme.
- The thermal label is computed from feels-like temperature; the air
  label is computed from actual temperature, dew point, and RH (RH only
  for the damp check).
- `Damp` is classified as humid air; it carries no separate presentation.

## The color axis, withdrawn

The two axes originally drove a muted OKLCH gradient as well as the
sentence: hue from the thermal axis (9 labels bucketed into
`red | orange | yellow | green | blue | silver`), chroma from the air
axis (dry = low, humid = high, `Damp` at 90%). The anchors were
single-sourced in `src/lib/air-comfort-palette.ts`, generated into
`.ac-{bucket}` custom properties, injected at startup, and tuned through
a `/moods` editor.

All of it is removed. Six hue buckets read as decoration rather than as
information — nothing in the interface taught the reader that orange
meant `Hot`, and the sentence next to it already said so in words. The
tint also had to be authored twice, once per mode, and the night anchors
were dark enough (measured 1.00–1.04:1 against the night hero) that the
color carried no signal there at all.

What remains is the labeling: two axes, one sentence. Mood is intended
to return as a background treatment on the hero, driven by condition and
time of day rather than by the comfort buckets.

## Presentation

`HeroCard` (`src/components/weather/hero-card.tsx`):

- Body: single sentence `${Thermal} ${and|but} ${air|damp}` — thermal
  capitalized, rest lowercase — or the thermal label alone where
  `Comfortable` is unlicensed. Examples: `Warm and slightly humid`,
  `Chilly and damp`, `Mild and comfortable`, `Dangerously hot and very humid`,
  `Cool but comfortable`, `Hot but comfortable`, `Dangerously hot`.
- The sentence is one of three co-equal elements — with the city name
  and the temperature — sharing the hero's `PEAK` type scale. It is not
  a subtitle to the temperature and must not be sized below it.
- Footer: a Beaufort wind label (`Calm` / `Light air` / ... / `Hurricane`)
  and the day's rain chance.

`AirComfortCard` (`src/components/weather/air-comfort-card.tsx`) is a
separate metrics tile. It renders the raw numbers behind the sentence
(Dew, Humidity, Cloud, Wind, Visibility) and does **not** consume the
two-axis labeler. Overlapping inputs, distinct affordances; do not merge
them.

## Code organization

```
src/worker/air-comfort.ts                    # pure labeler — labels + sentence
src/worker/air-comfort.test.ts               # 26 reference rows + boundary rows
src/components/weather/now-card.tsx          # sentence, at peak weight
```

Issue 006 moved both files out of `src/lib`. The labeler reads canonical
Celsius, and the published comfort bands are round Celsius numbers
(-5/4/10/16/22/29/35/40) that someone writing in Fahrenheit would not have
picked — so classifying per display system would change the word when a viewer
flips the °C/°F toggle. The Worker classifies once and ships
`comfort: { thermal, air, sentence }` on the `current` tier; `beaufort` moved
with it for the same reason.

### Function shape

```ts
type ThermalLabel =
  | "Very cold"
  | "Cold"
  | "Chilly"
  | "Cool"
  | "Mild"
  | "Warm"
  | "Hot"
  | "Very hot"
  | "Dangerously hot";

type AirLabel =
  | "Very dry"
  | "Dry"
  | "Slightly dry"
  | "Comfortable"
  | "Slightly humid"
  | "Humid"
  | "Very humid"
  | "Damp";

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

type ComfortJoin = "and" | "but" | null | { join: "but"; maxFeelsLikeC: number };
const COMFORT_JOIN: Record<ThermalLabel, ComfortJoin>;

function airComfort(input: AirComfortInput): AirComfort;
```

`air` is always the classified band, including the `Comfortable` readings
the sentence does not speak; `sentence` is the only field that applies
`COMFORT_JOIN`.

The Now card consumes `sentence`. `thermal` and `air` stay on the return type
because the bands are the reading; nothing renders them directly today.
Separation of concerns: worker = labeling logic, card = presentation.

## Tests

`src/worker/air-comfort.test.ts` covers:

- **Reference rows (26):** parameterized `it.each` table — every row
  from the Reference Data section below, asserting `{ thermal, air }`.
- **Boundary rows:** one test per band edge, exercising both sides.
  Thermal edges at -5, 4, 10, 16, 22, 29, 35, 40 (and -6 for `Very
cold`); air edges at -4, 4, 10, 16, 21, 24 (and -5 for `Very dry`).
- **Damp threshold:** `tempC ∈ {11.99, 12}`, `humidity ∈ {80, 80.01}` —
  pins the strict operators on both inputs.
- **Sentence format:** spot-checks that `{ Mild, Comfortable }` →
  `"Mild and comfortable"` and the `Damp` override → `"Chilly and damp"`.
- **Comfortable licensing:** one row per `ThermalLabel` at dew 12,
  asserting the exact sentence, so every `COMFORT_JOIN` entry is
  executed. The four rows below `Cool` use physically impossible inputs
  (a 10–16 °C dew point requires a temperature of at least 10 °C) and
  cover the table, not the weather. Plus the hot cutoff at feels-like
  ∈ {29, 31.99, 32, 34.99}, and one row pinning that the cutoff does not
  touch other air labels (`{ Hot @33, Humid }` → `"Hot and humid"`).

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

- `Comfortable` was originally spoken in every pairing, which produced
  `"Dangerously hot and comfortable"` — a sentence that asserts something
  false about the reading. The band was kept; the sentence rule now
  licenses the word per thermal label (see "Speaking
  `Comfortable`"). The 26 reference rows were unaffected: all six
  `Comfortable` rows are `Mild` or `Warm`.
- The shipping label set drops the trailing noun on `Comfortable` (the
  spec draft had `Comfortable air`). In the single-sentence form
  ("Mild and comfortable") the noun is redundant.
- The 29°C Warm/Hot boundary differs from an earlier draft that placed
  it at 27°C. The shipped boundary is what the test reference rows
  validate (`Cairo @27 → Warm`, `Sichuan @28 → Warm`).

## Out of scope

- Hourly/daily forecast variants of the comfort label — upstream does
  not return dew point on the forecast tier, so the labeler cannot run.
- Surfacing the thermal label separately from the sentence — the hero
  already carries both the sentence and the feels-like number.
