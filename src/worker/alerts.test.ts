import { describe, expect, it } from "vitest";
import { MAX_ALERTS, normalizeSeverity, severityRank, sortAndCapAlerts } from "./alerts";
import type { AlertSeverity, WeatherAlert } from "@/lib/schemas";

/**
 * Upstream's `severity` is an unconstrained string aggregated from national
 * providers. These tests pin the vocabularies observed in the wild onto the
 * closed union, and pin the order the client depends on when it renders
 * `alerts[0]` as the top alert.
 */

function alert(severity: AlertSeverity, event = "Test"): WeatherAlert {
  return {
    event,
    headline: `${severity} headline`,
    severity,
    areas: "Somewhere",
    effective: "2026-08-11T06:00:00+02:00",
    expires: "2026-08-11T18:00:00+02:00",
    desc: "Description.",
    instruction: "Take care.",
  };
}

describe("normalizeSeverity", () => {
  it.each(["extreme", "severe", "moderate", "minor", "unknown"] as const)(
    "passes the CAP name %s through",
    (name) => {
      expect(normalizeSeverity(name)).toBe(name);
    },
  );

  it.each([
    ["Extreme", "extreme"],
    ["SEVERE", "severe"],
    ["  Moderate  ", "moderate"],
    ["MiNoR", "minor"],
  ] as const)("accepts %s in any case or padding", (raw, expected) => {
    expect(normalizeSeverity(raw)).toBe(expected);
  });

  it.each([
    ["red", "extreme"],
    ["orange", "severe"],
    ["yellow", "moderate"],
    ["green", "minor"],
    ["Red", "extreme"],
  ] as const)("maps the awareness colour %s to %s", (raw, expected) => {
    expect(normalizeSeverity(raw)).toBe(expected);
  });

  it.each(["", "   ", "Advisory", "Level 3", "白", "0"])("falls back to unknown for %j", (raw) => {
    expect(normalizeSeverity(raw)).toBe("unknown");
  });
});

describe("severityRank", () => {
  it("ranks extreme worst and unknown last", () => {
    const ranks = (["extreme", "severe", "moderate", "minor", "unknown"] as const).map(
      severityRank,
    );
    expect(ranks).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("sortAndCapAlerts", () => {
  it("sorts worst-first with unknown last", () => {
    const input = [
      alert("minor"),
      alert("unknown"),
      alert("extreme"),
      alert("moderate"),
      alert("severe"),
    ];
    expect(sortAndCapAlerts(input).map((a) => a.severity)).toEqual([
      "extreme",
      "severe",
      "moderate",
      "minor",
      "unknown",
    ]);
  });

  it("keeps upstream order within one severity", () => {
    const input = [
      alert("severe", "first"),
      alert("severe", "second"),
      alert("extreme", "worst"),
      alert("severe", "third"),
    ];
    expect(sortAndCapAlerts(input).map((a) => a.event)).toEqual([
      "worst",
      "first",
      "second",
      "third",
    ]);
  });

  it(`caps the array at ${MAX_ALERTS}, keeping the worst`, () => {
    const input = [
      ...Array.from({ length: 6 }, (_, i) => alert("minor", `minor-${i}`)),
      alert("extreme", "keep-me"),
    ];
    const out = sortAndCapAlerts(input);
    expect(out).toHaveLength(MAX_ALERTS);
    expect(out[0]?.event).toBe("keep-me");
  });

  it("does not mutate its input", () => {
    const input = [alert("minor"), alert("extreme")];
    const snapshot = input.map((a) => a.severity);
    sortAndCapAlerts(input);
    expect(input.map((a) => a.severity)).toEqual(snapshot);
  });

  it("returns an empty array unchanged", () => {
    expect(sortAndCapAlerts([])).toEqual([]);
  });
});
