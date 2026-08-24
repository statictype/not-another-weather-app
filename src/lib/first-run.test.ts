import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as FirstRun from "./first-run";
import {
  __resetFirstRunForTests,
  hasVisitedBefore,
  markVisited,
  VISITED_STORAGE_KEY,
} from "./first-run";

/** The snapshot is seeded at construction, so a stored value needs a fresh module. */
async function reimport(): Promise<typeof FirstRun> {
  vi.resetModules();
  return import("./first-run");
}

beforeEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  __resetFirstRunForTests();
});

describe("first-run flag", () => {
  it("reads false until a visit is marked", () => {
    expect(hasVisitedBefore()).toBe(false);
    markVisited();
    expect(hasVisitedBefore()).toBe(true);
  });

  it("survives history being cleared — the two are separate keys", () => {
    markVisited();
    window.localStorage.removeItem("air:history:v1");
    expect(hasVisitedBefore()).toBe(true);
  });

  it("reads a stored flag on load", async () => {
    window.localStorage.setItem(VISITED_STORAGE_KEY, "1");
    const fresh = await reimport();
    expect(fresh.hasVisitedBefore()).toBe(true);
  });

  it("treats any other stored value as not visited", async () => {
    window.localStorage.setItem(VISITED_STORAGE_KEY, "true");
    const fresh = await reimport();
    expect(fresh.hasVisitedBefore()).toBe(false);
  });

  it("swallows a write failure", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => markVisited()).not.toThrow();
  });
});
