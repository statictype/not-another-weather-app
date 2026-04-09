import { describe, expect, it } from "vitest";
import { normalizeQuery } from "./query";

describe("normalizeQuery", () => {
  it("returns null for empty / nullish input", () => {
    expect(normalizeQuery(null)).toBeNull();
    expect(normalizeQuery(undefined)).toBeNull();
    expect(normalizeQuery("")).toBeNull();
    expect(normalizeQuery("   ")).toBeNull();
  });

  it("trims and lowercases", () => {
    expect(normalizeQuery("  London  ")).toBe("london");
    expect(normalizeQuery("PARIS")).toBe("paris");
  });

  it("collapses internal whitespace so multi-space variants share a key", () => {
    expect(normalizeQuery("New  York")).toBe("new york");
    expect(normalizeQuery("New\tYork")).toBe("new york");
    expect(normalizeQuery("  San   Francisco ")).toBe("san francisco");
    expect(normalizeQuery("New  York")).toBe(normalizeQuery("New York"));
  });
});
