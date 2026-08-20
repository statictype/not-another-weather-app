# Issue 012 — Procedural sky

**Status:** Not started
**Depends on:** 007
**Supersedes:** 011
**Source:** original item 7 — replaces the video half

## Problem

`.sky` (`index.css:155`) is two gradient stacks — one day, one night — cross-faded
on `current.timeOfDay` from `App.tsx:97`. It does not respond to conditions: a
thunderstorm in Reykjavík and a clear noon in Sydney render the same background.

011 answered this with 24 encoded video clips. This answers it by rendering the
sky, which removes the asset pipeline, the 600 KB-per-clip budget, the iOS Low
Power Mode autoplay problem, and the LQIP generator, and replaces them with one
fragment shader and a table of hex values.

### The lab does not currently predict what the app should render

`src/lab/` (uncommitted, 2998 lines) is a volumetric raymarcher: `CLOUD_FRAG`
marches up to 96 primary steps with a 6-step light march per sample against two
32³ noise volumes into a half-float target at 0.42–0.6× canvas, then composites.
`SkyParams` carries 51 fields and `buildParams` composes them from three axes.

Two things follow from that construction, and both are why it is hard to
art-direct.

**No rendered colour is a colour that was chosen.** `buildParams` emits
`desaturateRGB(scaleRGB(hex, skyDarken), desaturate)`. Thunderstorm/day takes the
authored zenith `#2f6fce`, scales it by 0.4 and desaturates it by 0.48. Six
conditions × four phases is 24 scenes and none of them is a value from a palette.
Editing one cell moves the other 23.

**The machinery has no subject.** A raymarch buys correct silhouettes,
self-shadowing, silver lining, drift parallax and godrays. The reference frames
contain none of them — no cloud edge, no dark side on any mass, no visible disc,
lightness confined to roughly 0.55–0.95. It is also the only part of the renderer
whose cost scales with both pixel count and step count, which is the whole of the
risk on old hardware.

## Constraints this has to survive

| Constraint                                    | Source                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| LCP 0.7 s, Lighthouse 99                      | ADR 001. Nothing may precede the `current` tier                                                            |
| Runs on A11-class hardware                    | Stated goal. Sets the frame budget below                                                                   |
| `prefers-reduced-motion`                      | A drifting sky is motion. `MotionConfig reducedMotion="user"` covers motion/react only, not a canvas       |
| Only six raw numbers reach the client         | `windDegree`, `humidity`, `pressureMb`, `uv`, `cloud`, `airQualityIndex`. Everything else is `MeasurePair` |
| `keepPreviousData` window                     | `CLAUDE.md`. `isSuccess` is true while `data` is the previous city                                         |
| `astro` is forecast-tier                      | `sunrise`/`sunset` arrive on the second fetch; `lat`, `lon`, `localTime` arrive on the first               |
| `backdrop-filter` over a live canvas re-blurs | `.nav-surface`, `.search-dropdown-desktop`, `.glass-panel`, `.mobile-search-overlay`                       |

No DTO field is added, so **`CACHE_VERSION` is not bumped**.

## Decision

A screen-space fragment shader over a flat table of authored values.

### 1. Technique — 2D layers, not volume

Sky is an analytic vertical gradient. Clouds are three fBm layers at different
scales and drift speeds, composited in screen space. Cost is fixed per pixel and
independent of coverage, cloud height or view direction.

`noise.ts`, `sky-view.ts`'s render-target path, `CLOUD_FRAG`, `precipitation.ts`
and `lightning.ts` are deleted.

### 2. The table is authored, not composed

No multiply chain, no attenuation, no desaturation pass. `buildScene` is a lookup
and a bounded lerp, never a computation over authored colour.

Two records, split on the line that colour changes with time of day and cloud
structure does not.

```ts
// 20 cells — 5 families × 4 phases
interface SkyCell {
  zenith: string; // top of frame
  mid: string; // 45%
  low: string; // bottom edge
  cloudLo: string; // dense / unlit
  cloudHi: string; // thin / lit
  sun: [number, number]; // normalised frame coords, clipped by an edge
  sunIntensity: number;
  sunTint: string;
  starIntensity: number; // 0 outside night
  clearingBias: number; // −1 opens sky behind the hero text, +1 builds cloud
}

// 5 rows — one per family
interface FamilyProfile {
  coverage: [number, number]; // authored ends; live cloud % lands between
  scale: [number, number, number];
  speed: [number, number, number];
  alpha: [number, number, number];
  warp: number; // domain warp, near layer only
  densityFalloff: number;
  precip: "none" | "rain" | "snow";
  precipIntensity: number;
  flashRate: number; // strikes per second, 0 for most
}
```

220 authored values for colour, light and composition, 80 for shape and motion.
300 total.
Cloud structure is identical across a family's four phases, which is what keeps
dawn and day recognisably the same weather.

### 3. Five families, keyed off 007

007 maps all 60 codes to twelve `ConditionGroup` values. This adds one more
`Record`, twelve rows wide:

| `ConditionGroup`              | `SkyFamily` |
| ----------------------------- | ----------- |
| `clear`, `partly-cloudy`      | `clear`     |
| `cloudy`, `drizzle`, `rain`   | `grey`      |
| `heavy-rain`, `thunder`       | `storm`     |
| `snow`, `heavy-snow`, `sleet` | `snow`      |
| `fog`, `dust-smoke`           | `fog`       |

Families are separate because they are separate compositions, not slider
positions on one. `clear` reads cloud against sky, 25–35 lightness points apart.
A true overcast is 3–5 points apart — a near-flat field with faint modulation and
a brighter patch where the sun is. `storm` restores value range with a dark base.
`fog` removes the vertical gradient.

Adding or dropping a family is a compile error on both records, the pattern
`WEATHER_TIER_PATHS` and `WEATHER_ERRORS` already use.

### 4. Four phases, blended by solar elevation

`src/sky/solar.ts` computes elevation and a rising flag from `location.lat`,
`location.lon` and `location.localTime` — all on the `current` tier, so the sky
resolves with the first fetch and never waits on `astro`.

```
elevation > +8°        day
+8° … −10°             blend(day, rising ? dawn : dusk)
−10° … −14°            blend(twilight, night)
elevation < −14°       night
```

The rising flag is what keeps dawn and dusk distinct: −4° climbing is a different
cell from −4° falling. Azimuth is not used — see 6.

**`.night` is unchanged.** `App.tsx:97` keeps deriving it from
`current.timeOfDay`; the API stays authoritative for the UI palette. Elevation is
used only inside the sky. There is no conflict: the class flips at upstream's
`is_day` boundary (elevation 0°) and the dusk cell spans roughly 0° to −14°, so
the first ~50 minutes of UI night sit under a fading dusk sky.

### 5. Three live inputs, each clamped inside an authored range

| Input                | Drives                                 | Range                               |
| -------------------- | -------------------------------------- | ----------------------------------- |
| `current.cloud`      | coverage                               | `lerp(profile.coverage[0], [1], c)` |
| `current.windDegree` | drift angle, vertical component × 0.35 | full circle, compressed             |
| `current.humidity`   | lift of the `low` stop, contrast down  | authored per family                 |

No raw mapping anywhere: both ends of every range are authored, so two
partly-cloudy cities differ without either becoming a scene nobody approved. The
vertical compression on wind is there so clouds never march straight up the
frame.

Rain **intensity** comes from the code, not from a number — 007 already separates
`drizzle`, `rain` and `heavy-rain`, and `precip` is a formatted string on the
DTO. This is what keeps `CACHE_VERSION` at `"10"`.

### 6. Sun placement is authored

Elevation is visible and meaningful. Azimuth is not, because the frame has no
compass heading: face north and a northern-hemisphere sun never appears; yaw to
follow azimuth and azimuth is a no-op by construction. It is not used.

Each cell authors a position in normalised frame coordinates, chosen so the disc
is clipped by an edge — the sun is only ever partially present. Elevation nudges
it vertically by ±0.08 of frame height, so noon and mid-afternoon differ without
leaving the composition. The ghost chain reflects through frame centre, so the
authored position also fixes where the ghosts land.

Flare intensity is multiplied by `1 − cloudAlpha` sampled at the sun's uv, so it
breaks through gaps for free.

Night uses the same anchor as a directional glow with **no disc and no phase**.
`AstroCard` owns the moon, draws it with the real phase from `moon.ts`, and
depends on forecast-tier `astro`. A second moon would appear seconds later than
the card's and disagree with it.

### 7. No horizon, three stops

The frame is entirely sky. `ground`, `skyExponent`, `hazeTightness` and the
`pitch: 0.3` framing are deleted. This is also what makes the CSS fallback in 10
possible, since a three-stop palette is literally a three-stop
`linear-gradient`.

### 8. Two views, one clock

| View       | Framing                         | Contents                              |
| ---------- | ------------------------------- | ------------------------------------- |
| background | uv scale 1.0, offset 0          | sky, clouds, flash                    |
| hero       | uv scale ~0.45, authored offset | sky, clouds, flash, **precipitation** |

With no horizon, "different framing" is a uv scale and offset on the same noise
field — a zoomed, panned window onto the same sky at the same instant. Both views
subscribe to one driver, which `driver.ts` already supports.

Second context cost is ~15% more shaded pixels (the hero is that fraction of the
viewport) plus fixed overhead: one more GL context against the browser's ~8–16
cap, one more program compile, one more draw chain.

Precipitation is **hero-only**. At desktop widths the bento grid covers most of
the viewport with opaque tiles, so fullscreen rain would be a narrow band in the
page margins and behind the nav.

### 9. Composition instead of a scrim

There is no legibility plate over the hero. The region behind the text is
composed — open blue sky in one cell, a darker cloud mass in another — by biasing
cloud density in that part of the frame.

Three fBm layers with a vertical falloff are uniform across the horizontal axis
and give no control over where cloud gathers, so the shader gains one term:

```
mask     = smoothstep over an ellipse in hero-view screen uv
density += clearingBias · mask · maskGain
```

The ellipse is a **module constant, not an authored value.** The hero text block
occupies the same region in every cell, so a per-cell mask would be the same
ellipse written twenty times. It can later be driven from the text block's
measured bounds if the layout makes one constant insufficient across
breakpoints.

`clearingBias` is per cell, −1 to +1. Negative thins the field and lets the sky
colour through; positive builds density toward `cloudLo`. Both directions are
legible against white type, which is the point — the cell picks whichever suits
its palette.

Applied to the hero view only. The nav is `.glass-panel` and handles its own
contrast.

**The mask must be soft.** Clouds drift at roughly 2 px/s through a static
screen-space mask, so a hard edge shows as a dissolve where the field crosses it.
A wide, low-gradient falloff reads instead as a persistent clear patch or a
standing mass.

`.hero-day` and `.hero-night` are **not deleted**. They become the hero's
background when there is no canvas — WebGL absent, context lost, chunk not yet
loaded.

### 10. The CSS gradient is generated from the table

`.sky` becomes a div whose background is
`linear-gradient(180deg in oklab, zenith, mid 45%, low)` built from the active
cell. One source, no second hand-authored fallback, and it covers four cases at
once:

- first paint, before the canvas chunk arrives
- WebGL2 unavailable
- `webglcontextlost`
- `prefers-reduced-motion`, where the canvas renders exactly one frame with zero
  drift and no precipitation, and scene changes become a 300 ms opacity
  cross-fade instead of the sequence in 11

The shader must interpolate in **Oklab** for the same reason: the fallback
gradient uses `in oklab`, and if the shader mixes in linear sRGB the two layers
will not match during the cross-fade. Hex is converted to Oklab once at table
load; mixing happens there; conversion to linear sRGB happens per-pixel before
lighting.

### 11. City-change transition

Not `lerpParams` on one clock — that moves all values together, so old clouds are
still dissolving while the new sky colour is half in.

```
t=0.00  URL changes
0.00    A  precipitation → 0, then coverage → 0
0.55       ├─ holds here at empty sky if the fetch has not resolved
0.55    B  sky colours cross-fade in Oklab
0.90       ├─ the new payload's isNight is applied here, at B's midpoint
1.25    B  ends
0.90    C  coverage builds to target                    (overlaps B by 0.35)
2.00    C  ends
```

Total 2.0 s. The overlap is what stops it reading as three separate events.

Stage A needs only the _current_ scene, so it starts on the URL change and the
clear-out doubles as the loading state. **Stage B must gate on
`!query.isPlaceholderData`** — entering it during the `keepPreviousData` window
cross-fades to the previous city's colours under the new query key. Same trap as
the history-commit effect in `App.tsx`.

Implemented as a pure reducer, `(state, event, dt) => state`, called by the render
loop. That is what makes it testable.

Cold load runs no transition: the scene applies immediately and the canvas fades
in over the gradient. A background refetch that resolves to the same scene runs
no transition either. The sky layer must sit outside `grid.tsx`'s `swapKey`,
which remounts the grid on every city change.

### 12. Frame budget

| Policy             | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| Frame rate         | 30 fps — redraw when ≥ 33 ms elapsed, all motion parameterised on wall clock |
| Pixel ratio        | `min(devicePixelRatio, 1.5)`                                                 |
| Pause              | `document.hidden`, and while the search dropdown or mobile overlay is open   |
| Adaptive downshift | Not implemented                                                              |

Clouds drift at roughly 2 px/s; 30 fps is not distinguishable on this content and
halves GPU work. At dpr 1.5 the pixel count falls 44% against dpr 2. Together
that is 0.28× the work of 60 fps at native ratio.

Shader cost is 3 layers × 4 octaves plus a domain warp on the near layer ≈ 15
texture fetches per pixel. On a 390×844 viewport at dpr 1.5 that is 740k pixels ×
15 × 30 fps ≈ 333 Mfetch/s, against roughly 10–20 Gtexel/s on an A11 and ~2
Gtexel/s on a weak Android.

The pause-when-occluded rule exists because those overlays are the
`backdrop-filter` surfaces: blurring a static gradient is free after first paint,
blurring a canvas that repaints costs a re-blur every frame.

### 13. Cloud model

Three fBm layers, far to near, at authored scale, speed and alpha. Domain warp on
the near layer only, so the field never reads as uniform noise. Density falls off
toward the top of frame, which implies distance without a horizon.

Lighting is a translucency term — brighter where the layer is thin and near the
sun anchor — not a surface lambert. That is what produces the lavender-into-white
in the references.

```
density *= 1 − densityFalloff · (1 − y)²
density += clearingBias · mask · maskGain        // hero view, see 9
colour   = mix(cloudLo, cloudHi, thinness · sunProximity)
```

A **1/255 blue-noise dither on the final line is required, not optional.** A
three-stop Oklab gradient across a full viewport at 8 bit bands visibly.

### 14. Precipitation, lightning, stars

All three are terms in the same fragment pass. No geometry, no extra draw calls,
and "rain stops" in stage A is one uniform going to zero.

| Term      | Implementation                                                                  |
| --------- | ------------------------------------------------------------------------------- |
| Rain      | 3 layers of hashed scrolling streaks, angle from wind, hero view only           |
| Snow      | 3 layers of hashed drifting dots with lateral sway, hero view only              |
| Lightning | Full-frame luminance lift, 0.06 s attack, 0.4 s decay, Poisson gaps, both views |
| Stars     | Hash grid, twinkle 0.4–1.2 Hz, multiplied by `1 − cloudAlpha`, night cells      |

No branching bolt geometry. It is the part that reads as a screensaver when it is
not exactly right, and `lightning.ts` builds it against a camera this design no
longer has.

### 15. `three` ships

Promoted from `devDependencies` to `dependencies`. The sky module is behind a
dynamic import, the pattern `App.tsx` already uses for `sonner`, so 110–140 KB
gz stays off the LCP path while the generated gradient paints immediately.

## File layout

```
src/sky/
  types.ts        SkyFamily, Phase, SkyCell, FamilyProfile, Scene
  scenes.ts       the authored table — 20 cells + 5 profiles
  family.ts       Record<ConditionGroup, SkyFamily>   (needs 007)
  solar.ts        elevation + rising flag
  scene.ts        buildScene(group, elevation, rising, cloud, wind, humidity)
  gradient.ts     Scene → CSS linear-gradient string
  transition.ts   pure reducer
  shader.ts       vertex + fragment source
  view.ts         canvas, uniforms, resize, context loss
  driver.ts       one clock, N views, 30 fps gate, pause

src/components/
  sky-layer.tsx   div + lazily-imported canvas, replaces the .sky div
```

Deleted: `src/lab/sky/{noise,precipitation,lightning,shaders,sky-view,params,presets,driver}.ts`.
Rebuilt against `@/sky`: `sky-lab.tsx`, `inspector.tsx`, `contact-sheet.tsx`,
`param-ranges.ts`, `use-sky-view.ts`.

## Lab

Contact sheet is the default view — 5 × 4 cells rendered through one offscreen
context, the mechanism `contact-sheet.tsx` already implements, which re-shoots
effectively instantly against a 2D shader. Clicking a cell opens it large with
hex pickers and the family's scalar sliders.

Edits live in lab state. One button serialises the **entire** `SCENES` record as
formatted TS for pasting over `scenes.ts`. Whole-table paste means the file and
the lab cannot be partially out of sync, and there is no dev-server write path to
get wrong.

The lab is a dev tool and is not tested.

## Tests

| Unit            | Assertions                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `solar.ts`      | London at summer solstice noon ≈ 62°; Reykjavík in December; an equatorial city; a southern-hemisphere case where the rising flag inverts; longitudes past ±180 |
| `family.ts`     | Every one of 007's twelve groups maps to a family; unknown group resolves rather than returning `undefined`                                                     |
| `transition.ts` | Holds at empty sky when data is late; never enters B while `isPlaceholderData`; a second city change mid-transition restarts cleanly; total duration 2.0 s      |

The renderer is not covered — jsdom has no WebGL. Table integrity is left to the
`Record` types and to the contact sheet, where a bad paste is visible
immediately.

## Sequence

1. Commit the current lab as a checkpoint.
2. `src/sky/`: types, table with rough values, `solar.ts`, `family.ts`, tests.
3. Renderer, shader, driver, both views. Lab-only.
4. Rebuild the lab: contact sheet, cell editor, copy-table.
5. Tune all 20 cells to final. This is the long pole and it is not code.
6. Integrate: `sky-layer.tsx`, hero canvas, transition, lazy import.
7. Perf pass on real A11-class hardware.

The sky is signed off before any app code changes, and integration is mechanical.
The known cost of this order is that cells are judged in a bare 16:9 frame rather
than at the real sizes behind an opaque bento grid, so expect a second tuning
pass after step 6.

## Open

- **A scrim returns only if composition fails.** If `clearingBias` cannot hold
  contrast behind the hero text at the real sizes across all 20 cells, the
  fallback is a per-cell scrim colour and opacity — two more authored values per
  cell. Decide after step 6, not before.
- **`dust-smoke` has no palette of its own.** Twelve codes map to `fog`, which is
  grey-white; suspended dust is warm-brown. Either accept it or add a sixth
  family, which is 4 more cells and 44 more authored values.
- **011 needs its status changed** to superseded, and `docs/issues/README.md`
  needs a row for this issue.
- **`procedural-clouds-threejs-main/`, `procedural-stars-threejs-main/`,
  `procedural-weather-threejs-main/`** are untracked reference markdown with
  their own LICENSE files. Decide whether they are committed or ignored before
  the checkpoint commit in step 1.
