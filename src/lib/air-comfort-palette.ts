/**
 * Single source of truth for the air-comfort palette.
 *
 * The two-axis labeler in `air-comfort.ts` decides *which* bucket and air
 * position a reading lands in; this module owns the *colors* those map to.
 * Everything here is plain data so it can be read without a DOM:
 *
 * - the `.ac-{bucket}` `--ac-dry`/`--ac-humid` anchors (day + night),
 * - the per-mode `--ac-lift`/`--ac-shadow`/`--ac-base-darken` depth params,
 * - the `thermal → bucket` and `air → humidity %` mappings.
 *
 * The live cards still tint via CSS custom properties and the `.night`
 * cascade — but those custom properties are *generated* from the data below
 * (`airComfortPaletteCss`) and injected once at startup
 * (`injectAirComfortPalette`, called in `main.tsx`), so there is exactly one
 * place the values live. The `/moods` editor reads the same data directly
 * instead of round-tripping through `getComputedStyle`.
 *
 * To retune the palette, edit this file — not `index.css`.
 */

export type ThermalLabel =
  | "Very cold"
  | "Cold"
  | "Chilly"
  | "Cool"
  | "Mild"
  | "Warm"
  | "Hot"
  | "Very hot"
  | "Dangerously hot";

export type AirLabel =
  | "Very dry"
  | "Dry"
  | "Slightly dry"
  | "Comfortable"
  | "Slightly humid"
  | "Humid"
  | "Very humid"
  | "Damp";

export type AirComfortBucket = "red" | "orange" | "yellow" | "green" | "blue" | "silver";

export type AirComfortMode = "day" | "night";

/**
 * Thermal label → bucket. The exhaustive literal is the single source for the
 * mapping (TypeScript checks every `ThermalLabel` is present); the grouping
 * below is derived from it so the two can't drift.
 */
export const THERMAL_BUCKET: Record<ThermalLabel, AirComfortBucket> = {
  "Dangerously hot": "red",
  "Very hot": "red",
  Hot: "orange",
  Warm: "yellow",
  Mild: "green",
  Cool: "blue",
  Chilly: "blue",
  Cold: "silver",
  "Very cold": "silver",
};

/** Buckets hottest → coldest. The iteration order for CSS + the editor grid. */
export const AC_BUCKET_ORDER = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "silver",
] as const satisfies readonly AirComfortBucket[];

/**
 * Bucket → its thermal labels, derived from `THERMAL_BUCKET`. Within-bucket
 * order follows `THERMAL_BUCKET` key order (hottest first); bucket order
 * follows `AC_BUCKET_ORDER`. Consumed by the `/moods` editor's row layout.
 */
export const THERMAL_BUCKETS: ReadonlyArray<{
  bucket: AirComfortBucket;
  thermals: readonly ThermalLabel[];
}> = AC_BUCKET_ORDER.map((bucket) => ({
  bucket,
  thermals: (Object.entries(THERMAL_BUCKET) as Array<[ThermalLabel, AirComfortBucket]>)
    .filter(([, b]) => b === bucket)
    .map(([thermal]) => thermal),
}));

/**
 * Air label → its position (%) on the dry(0) → humid(100) chroma scale. `Damp`
 * rides near the humid end (it *is* humid air) — see RFC 012.
 */
export const AIR_HUMID_PCT: Record<AirLabel, number> = {
  "Very dry": 0,
  Dry: 15,
  "Slightly dry": 30,
  Comfortable: 50,
  "Slightly humid": 65,
  Humid: 80,
  "Very humid": 100,
  Damp: 90,
};

/**
 * The dry/humid anchor hexes per bucket, per mode. The card mixes between the
 * two in oklch at the air-axis position (`AIR_HUMID_PCT`).
 */
export const AC_ANCHORS: Record<
  AirComfortMode,
  Record<AirComfortBucket, { dry: string; humid: string }>
> = {
  day: {
    red: { dry: "#fad4d4", humid: "#f59694" },
    orange: { dry: "#ffc09a", humid: "#ffa168" },
    yellow: { dry: "#fff5d0", humid: "#ffe080" },
    green: { dry: "#def5de", humid: "#91dc91" },
    blue: { dry: "#b3edff", humid: "#80e2ff" },
    silver: { dry: "#e6ebf3", humid: "#ccd6e6" },
  },
  night: {
    red: { dry: "#1a0808", humid: "#2e0a0a" },
    orange: { dry: "#1a0a00", humid: "#2e1100" },
    yellow: { dry: "#1a1102", humid: "#4d3205" },
    green: { dry: "#001a11", humid: "#003421" },
    blue: { dry: "#00141a", humid: "#003b4d" },
    silver: { dry: "#141517", humid: "#3d4045" },
  },
};

export interface AcDepthParams {
  /** How much the top gradient stop lifts toward white. */
  lift: string;
  /** How much the bottom gradient stop deepens toward black. */
  shadow: string;
  /** How much the whole base color is darkened (for night legibility). */
  baseDarken: string;
}

/** Per-mode gradient depth params. */
export const AC_PARAMS: Record<AirComfortMode, AcDepthParams> = {
  day: { lift: "14%", shadow: "3%", baseDarken: "0%" },
  night: { lift: "4%", shadow: "20%", baseDarken: "38%" },
};

/**
 * Render the palette as the CSS custom-property rules the cards consume:
 * `.ac-{bucket}` anchors (day), `.night .ac-{bucket}` anchors (night), and the
 * `:root`/`.night` depth params. This is the only place the CSS form is
 * produced — see `injectAirComfortPalette`.
 */
export function airComfortPaletteCss(): string {
  const rules: string[] = [];
  for (const bucket of AC_BUCKET_ORDER) {
    const a = AC_ANCHORS.day[bucket];
    rules.push(`.ac-${bucket} { --ac-dry: ${a.dry}; --ac-humid: ${a.humid}; }`);
  }
  for (const bucket of AC_BUCKET_ORDER) {
    const a = AC_ANCHORS.night[bucket];
    rules.push(`.night .ac-${bucket} { --ac-dry: ${a.dry}; --ac-humid: ${a.humid}; }`);
  }
  const d = AC_PARAMS.day;
  const n = AC_PARAMS.night;
  rules.push(
    `:root { --ac-lift: ${d.lift}; --ac-shadow: ${d.shadow}; --ac-base-darken: ${d.baseDarken}; }`,
  );
  rules.push(
    `.night { --ac-lift: ${n.lift}; --ac-shadow: ${n.shadow}; --ac-base-darken: ${n.baseDarken}; }`,
  );
  return rules.join("\n");
}

const PALETTE_STYLE_ID = "ac-palette";

/**
 * Inject the generated palette rules into `<head>` once. Idempotent and
 * SSR/test-safe (no-ops without a `document`). Call before first paint; the
 * app calls it in `main.tsx`. Cards never render before JS in this SPA, so
 * there is no unstyled-flash window.
 */
export function injectAirComfortPalette(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(PALETTE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PALETTE_STYLE_ID;
  style.textContent = airComfortPaletteCss();
  document.head.appendChild(style);
}
