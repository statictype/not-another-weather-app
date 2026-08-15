import { describe, expect, it } from "vitest";
import { distance, pressure, speed, temperature } from "./format";

describe("temperature", () => {
  it("carries no letter in either system — the toggle is the indicator", () => {
    expect(temperature(12.3, 54.1)).toEqual({
      metric: { text: "12°", value: "12", suffix: "°", spoken: "12 degrees" },
      imperial: { text: "54°", value: "54", suffix: "°", spoken: "54 degrees" },
    });
  });

  it("prints the same figure at the scales' crossing point", () => {
    const at = temperature(-40, -40);
    expect(at.metric.text).toBe("-40°");
    expect(at.imperial.text).toBe("-40°");
  });

  it("rounds a sub-zero fraction to a bare zero, not a signed one", () => {
    expect(temperature(-0.4, 31.3).metric.text).toBe("0°");
  });
});

describe("speed", () => {
  it("names the unit in full for the accessible reading", () => {
    expect(speed(24.4, 15.2)).toEqual({
      metric: { text: "24 km/h", value: "24", suffix: "km/h", spoken: "24 kilometres per hour" },
      imperial: { text: "15 mph", value: "15", suffix: "mph", spoken: "15 miles per hour" },
    });
  });
});

describe("distance", () => {
  it("rounds both systems to whole units", () => {
    expect(distance(9.7, 6.03).metric.text).toBe("10 km");
    expect(distance(9.7, 6.03).imperial.text).toBe("6 mi");
  });
});

describe("pressure", () => {
  it("keeps 0 decimals in mb and 2 in inHg", () => {
    expect(pressure(1015.4, 29.92)).toEqual({
      metric: { text: "1015 mb", value: "1015", suffix: "mb", spoken: "1015 millibars" },
      imperial: {
        text: "29.92 inHg",
        value: "29.92",
        suffix: "inHg",
        spoken: "29.92 inches of mercury",
      },
    });
  });

  it("holds both decimals rather than trimming a trailing zero", () => {
    expect(pressure(1013, 29.9).imperial.text).toBe("29.90 inHg");
  });
});
