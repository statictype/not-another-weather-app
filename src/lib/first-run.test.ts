import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasVisitedBefore, markVisited, VISITED_STORAGE_KEY } from "./first-run";

describe("first-run flag", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reads false until a visit is marked", () => {
    expect(hasVisitedBefore()).toBe(false);
    markVisited();
    expect(hasVisitedBefore()).toBe(true);
  });

  it("survives history being cleared — the two are separate keys", () => {
    markVisited();
    window.localStorage.removeItem("oasis:history:v1");
    expect(hasVisitedBefore()).toBe(true);
  });

  it("treats any other stored value as not visited", () => {
    window.localStorage.setItem(VISITED_STORAGE_KEY, "true");
    expect(hasVisitedBefore()).toBe(false);
  });

  it("reports not-visited when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("disabled");
    });
    expect(hasVisitedBefore()).toBe(false);
  });

  it("swallows a write failure", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => markVisited()).not.toThrow();
  });
});
