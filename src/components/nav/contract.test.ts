import { describe, expect, it } from "vitest";
import {
  BAR_INSET,
  BAR_THICKNESS,
  barGeometry,
  mainPadding,
  navPlacement,
  PANEL_WIDTH,
  panelGeometry,
  placementFromMatches,
  RAIL_FOOTPRINT,
} from "./contract";

describe("navPlacement", () => {
  it("reads the four states off the three thresholds", () => {
    expect(navPlacement(375)).toEqual({ edge: "bottom", panel: "fullscreen", drag: "down" });
    expect(navPlacement(767)).toEqual({ edge: "bottom", panel: "fullscreen", drag: "down" });
    expect(navPlacement(768)).toEqual({ edge: "top", panel: "fullscreen", drag: "up" });
    expect(navPlacement(1023)).toEqual({ edge: "top", panel: "fullscreen", drag: "up" });
    expect(navPlacement(1024)).toEqual({ edge: "left", panel: "fullscreen", drag: "left" });
    expect(navPlacement(1279)).toEqual({ edge: "left", panel: "fullscreen", drag: "left" });
    expect(navPlacement(1280)).toEqual({ edge: "left", panel: "partial", drag: null });
    expect(navPlacement(1920)).toEqual({ edge: "left", panel: "partial", drag: null });
  });

  it("agrees with the media-query form at every band", () => {
    expect(placementFromMatches(false, false, false)).toEqual(navPlacement(375));
    expect(placementFromMatches(true, false, false)).toEqual(navPlacement(900));
    expect(placementFromMatches(true, true, false)).toEqual(navPlacement(1100));
    expect(placementFromMatches(true, true, true)).toEqual(navPlacement(1440));
  });
});

describe("barGeometry", () => {
  it("spans the edge it sits on and is one thickness across the other axis", () => {
    const bottom = barGeometry(navPlacement(375));
    expect(bottom).toMatchObject({
      left: `${BAR_INSET}px`,
      right: `${BAR_INSET}px`,
      height: `${BAR_THICKNESS}px`,
    });
    expect(bottom.bottom).toContain("safe-area-inset-bottom");

    expect(barGeometry(navPlacement(900))).toEqual({
      left: `${BAR_INSET}px`,
      right: `${BAR_INSET}px`,
      top: `${BAR_INSET}px`,
      height: `${BAR_THICKNESS}px`,
    });

    expect(barGeometry(navPlacement(1100))).toEqual({
      left: `${BAR_INSET}px`,
      top: `${BAR_INSET}px`,
      bottom: `${BAR_INSET}px`,
      width: `${BAR_THICKNESS}px`,
    });
  });
});

describe("panelGeometry", () => {
  it("fills the viewport below 1280 and keeps the rail's inset above it", () => {
    for (const width of [375, 900, 1100]) {
      expect(panelGeometry(navPlacement(width))).toEqual({
        left: "0px",
        right: "0px",
        top: "0px",
        bottom: "0px",
      });
    }

    expect(panelGeometry(navPlacement(1440))).toEqual({
      left: `${BAR_INSET}px`,
      top: `${BAR_INSET}px`,
      bottom: `${BAR_INSET}px`,
      width: `${PANEL_WIDTH}px`,
    });
  });
});

describe("mainPadding", () => {
  it("pads one side only, by the bar's footprint", () => {
    expect(mainPadding(navPlacement(375)).paddingBottom).toContain(`${RAIL_FOOTPRINT}px`);
    expect(mainPadding(navPlacement(900))).toEqual({ paddingTop: `${RAIL_FOOTPRINT}px` });
    expect(mainPadding(navPlacement(1100))).toEqual({ paddingLeft: `${RAIL_FOOTPRINT}px` });
    expect(mainPadding(navPlacement(1440))).toEqual({ paddingLeft: `${RAIL_FOOTPRINT}px` });
  });
});
