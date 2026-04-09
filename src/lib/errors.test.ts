import { describe, expect, it } from "vitest";
import {
  defaultMessage,
  kindForStatus,
  statusForKind,
  WEATHER_ERRORS,
  type WeatherErrorKind,
} from "./errors";

describe("errors registry", () => {
  const kinds = Object.keys(WEATHER_ERRORS) as WeatherErrorKind[];

  it("kindForStatus is the inverse of statusForKind for every known kind", () => {
    for (const kind of kinds) {
      expect(kindForStatus(statusForKind(kind))).toBe(kind);
    }
  });

  it("falls back to 'upstream' for unknown statuses", () => {
    expect(kindForStatus(418)).toBe("upstream");
    expect(kindForStatus(0)).toBe("upstream");
  });

  it("defaultMessage returns a non-empty string for every kind", () => {
    for (const kind of kinds) {
      expect(defaultMessage(kind)).toMatch(/\S/);
    }
  });
});
