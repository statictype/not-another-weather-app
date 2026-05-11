# Air Comfort Display — Specification

## Goal

Display a short, accessible summary of how the air feels, based on weather data. The summary must convey both **thermal sensation** (how hot or cold it feels) and **air character** (how moist or dry the air is), without relying on a subjective comfort score or evocative-but-obscure vocabulary.

## Rationale

- A single comfort score is too opinionated. Real comfort depends on wind, precipitation, sun exposure, clothing, activity, and personal preference — none of which a score can capture fairly.
- Relative humidity alone is misleading. 80% RH at 10°C feels nothing like 70% RH at 30°C. **Dew point** is an absolute measure of moisture in the air and is the correct primary input for the air-character axis.
- Vocabulary should be plain. Words like "muggy," "crisp," "oppressive," "arid," and "raw" are evocative but not universally understood. "Humid" and "dry" are.

## Two-Axis Model

Every summary is composed of two independent labels: a thermal label and an air label.

### Boundary convention

All ranges are **lower-inclusive, upper-exclusive**: "a to b" means `a ≤ x < b`. The top and bottom bands extend to infinity in the open direction.

### Thermal axis (driven by "feels like" temperature)

| Feels like (°C) | Label             |
| --------------- | ----------------- |
| ≥ 40            | Dangerously hot   |
| 35 to 40        | Very hot          |
| 27 to 35        | Hot               |
| 22 to 27        | Warm              |
| 16 to 22        | Mild              |
| 10 to 16        | Cool              |
| 4 to 10         | Chilly            |
| -5 to 4         | Cold              |
| < -5            | Very cold         |

### Air axis (driven by dew point)

| Dew point (°C) | Label            |
| -------------- | ---------------- |
| ≥ 24           | Very humid       |
| 21 to 24       | Humid            |
| 16 to 21       | Slightly humid   |
| 10 to 16       | Comfortable air  |
| 4 to 10        | Slightly dry     |
| -4 to 4        | Dry              |
| < -4           | Very dry         |

### Damp override

When `temp < 12°C` AND `relative_humidity > 80%`, **replace** the air label with **"Damp"**. This captures the cold-damp sensation that low absolute humidity readings would otherwise mask.

### Edge cases

- "Dangerously hot" and "Very cold" do **not** suppress the air label. Both labels are always shown.
- The thermal label is computed from feels-like temperature; the air label is computed from actual temperature and dew point (and RH for the damp check).

## Display

Render both axes. The exact presentation is up to the implementer. Reasonable options:

- A single sentence combining both labels (e.g. "Warm and slightly humid").
- Two icons with their respective labels shown separately (e.g. a thermometer next to "Warm," a droplet next to "Slightly humid").
- A combination of the two.

## Reference Data

The following observations were used to validate the framework. Each row lists the inputs and the expected output labels.

| Location              | Temp (°C) | Feels (°C) | Dew (°C) | RH (%) | Thermal         | Air              |
| --------------------- | --------- | ---------- | -------- | ------ | --------------- | ---------------- |
| Cairo                 | 29        | 27         | 3        | 15     | Hot             | Dry              |
| Panipat, India        | 43        | 45         | 9        | 13     | Dangerously hot | Slightly dry     |
| Beijing               | 29        | 27         | 1        | 43     | Hot             | Dry              |
| Dungarvan, Ireland    | 10        | 8          | 7        | 82     | Chilly          | Damp             |
| Berlin                | 16        | 16         | 10       | 72     | Mild            | Comfortable air  |
| Bali                  | 29        | 32         | 23       | 70     | Hot             | Humid            |
| Nuuk, Greenland       | 2         | -5         | 0        | 93     | Cold            | Damp             |
| Moscow                | 10        | 9          | 8        | 87     | Chilly          | Damp             |
| Grand Canyon          | 2         | -1         | -12      | 28     | Cold            | Very dry         |
| Las Vegas             | 26        | 24         | -11      | 16     | Warm            | Very dry         |
| Kufra                 | 24        | 24         | 6        | 32     | Warm            | Slightly dry     |
| Windhoek, Namibia     | 23        | 23         | -16      | 7      | Warm            | Very dry         |
| Algiers               | 23        | 25         | 13       | 47     | Warm            | Comfortable air  |
| New York              | 12        | 10         | -2       | 38     | Cool            | Dry              |
| Los Angeles           | 17        | 17         | 15       | 84     | Mild            | Comfortable air  |
| Hammerfest            | 11        | 11         | 4        | 40     | Cool            | Slightly dry     |
| Tripoli               | 22        | 25         | 14       | 60     | Warm            | Comfortable air  |
| Doha                  | 40        | 40         | 8        | 10     | Dangerously hot | Slightly dry     |
| Kananga               | 24        | 26         | 21       | 81     | Warm            | Humid            |
| Porto Velho           | 19        | 19         | 16       | 83     | Mild            | Slightly humid   |
| Ha, Bhutan            | 14        | 13         | 8        | 69     | Cool            | Slightly dry     |
| Lima                  | 20        | 20         | 18       | 87     | Mild            | Slightly humid   |
| Ushuaia               | 6         | 5          | 0        | 65     | Chilly          | Dry              |
| Perth                 | 21        | 21         | 11       | 31     | Mild            | Comfortable air  |
| Sichuan               | 28        | 28         | 12       | 37     | Hot             | Comfortable air  |
| Kuala Lumpur          | 32        | 47         | 25       | 71     | Dangerously hot | Very humid       |
