import { afterEach, describe, expect, it } from "vitest";
import {
  AC_ANCHORS,
  AC_BUCKET_ORDER,
  AC_PARAMS,
  airComfortPaletteCss,
  injectAirComfortPalette,
  THERMAL_BUCKET,
  THERMAL_BUCKETS,
} from "./air-comfort-palette";

describe("THERMAL_BUCKETS — derived grouping", () => {
  it("covers every thermal exactly once, each under its THERMAL_BUCKET bucket", () => {
    const flattened = THERMAL_BUCKETS.flatMap(({ bucket, thermals }) =>
      thermals.map((thermal) => ({ thermal, bucket })),
    );
    // Same count as the source map — no thermal dropped or duplicated.
    expect(flattened).toHaveLength(Object.keys(THERMAL_BUCKET).length);
    for (const { thermal, bucket } of flattened) {
      expect(THERMAL_BUCKET[thermal]).toBe(bucket);
    }
  });

  it("lists buckets in AC_BUCKET_ORDER", () => {
    expect(THERMAL_BUCKETS.map((b) => b.bucket)).toEqual([...AC_BUCKET_ORDER]);
  });
});

describe("airComfortPaletteCss", () => {
  const css = airComfortPaletteCss();

  it("emits day + night anchors for every bucket", () => {
    for (const bucket of AC_BUCKET_ORDER) {
      const day = AC_ANCHORS.day[bucket];
      const night = AC_ANCHORS.night[bucket];
      expect(css).toContain(`.ac-${bucket} { --ac-dry: ${day.dry}; --ac-humid: ${day.humid}; }`);
      expect(css).toContain(
        `.night .ac-${bucket} { --ac-dry: ${night.dry}; --ac-humid: ${night.humid}; }`,
      );
    }
  });

  it("emits the :root and .night depth params", () => {
    const d = AC_PARAMS.day;
    const n = AC_PARAMS.night;
    expect(css).toContain(
      `:root { --ac-lift: ${d.lift}; --ac-shadow: ${d.shadow}; --ac-base-darken: ${d.baseDarken}; }`,
    );
    expect(css).toContain(
      `.night { --ac-lift: ${n.lift}; --ac-shadow: ${n.shadow}; --ac-base-darken: ${n.baseDarken}; }`,
    );
  });
});

describe("injectAirComfortPalette", () => {
  afterEach(() => {
    document.getElementById("ac-palette")?.remove();
  });

  it("appends a single <style id=ac-palette> and is idempotent", () => {
    injectAirComfortPalette();
    injectAirComfortPalette();
    const styles = document.querySelectorAll("#ac-palette");
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toBe(airComfortPaletteCss());
  });
});
