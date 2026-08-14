import { describe, expect, it } from "vitest";
import { precipAmount } from "./precip";

describe("precipAmount", () => {
  it("keeps one decimal below 10 and drops it above, in both units", () => {
    expect(precipAmount(0.42, "mm")).toEqual({ text: "0.4mm", spoken: "0.4 millimetres" });
    expect(precipAmount(31.24, "cm")).toEqual({ text: "31cm", spoken: "31 centimetres" });
  });

  it("returns null at a rounded zero — that is a second way of saying 0%", () => {
    expect(precipAmount(0, "mm")).toBeNull();
    expect(precipAmount(0.04, "mm")).toBeNull();
  });

  it("returns null for a non-finite value, so a stale payload cannot print NaN", () => {
    expect(precipAmount(Number.NaN, "mm")).toBeNull();
    expect(precipAmount(undefined as unknown as number, "cm")).toBeNull();
  });
});
