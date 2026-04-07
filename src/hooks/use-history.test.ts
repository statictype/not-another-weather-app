import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetHistoryStoreForTests,
  addHistoryItem,
  type HistoryItem,
  MAX_HISTORY,
  useHistory,
} from "./use-history";

beforeEach(() => {
  __resetHistoryStoreForTests();
});

afterEach(() => {
  __resetHistoryStoreForTests();
});

describe("addHistoryItem (pure reducer)", () => {
  it("prepends a new item to an empty list", () => {
    const result = addHistoryItem([], { query: "London", displayName: "London, UK" });
    expect(result).toHaveLength(1);
    expect(result[0]?.query).toBe("London");
  });

  it("dedupes by case-insensitive query and moves the existing entry to the top", () => {
    const seed: HistoryItem[] = [
      { id: "a", query: "Paris", displayName: "Paris, FR", addedAt: 1 },
      { id: "b", query: "London", displayName: "London, UK", addedAt: 2 },
      { id: "c", query: "Berlin", displayName: "Berlin, DE", addedAt: 3 },
    ];
    const result = addHistoryItem(seed, { query: "london", displayName: "London, UK" });
    expect(result).toHaveLength(3);
    // London moved to the top with a fresh id; Paris and Berlin preserved.
    expect(result[0]?.query.toLowerCase()).toBe("london");
    expect(result[0]?.id).not.toBe("b");
    // The new item preserves the input casing ("london"); previous Paris and Berlin retained.
    expect(result.map((i) => i.query)).toEqual(["london", "Paris", "Berlin"]);
  });

  it("caps the list at MAX_HISTORY entries, dropping the oldest", () => {
    // Seed is newest-first (City0 at the front, CityN at the back).
    const seed: HistoryItem[] = Array.from({ length: MAX_HISTORY }, (_, i) => ({
      id: `id-${i}`,
      query: `City${i}`,
      displayName: `City${i}`,
      addedAt: MAX_HISTORY - i,
    }));
    const result = addHistoryItem(seed, { query: "Newest", displayName: "Newest" });
    expect(result).toHaveLength(MAX_HISTORY);
    expect(result[0]?.query).toBe("Newest");
    // The oldest (last in the list) should have been dropped.
    expect(result.find((i) => i.query === `City${MAX_HISTORY - 1}`)).toBeUndefined();
    // The second-oldest should still be present.
    expect(result.find((i) => i.query === `City${MAX_HISTORY - 2}`)).toBeDefined();
  });

  it("rejects empty/whitespace queries without mutating the list", () => {
    const seed: HistoryItem[] = [{ id: "a", query: "Paris", displayName: "Paris", addedAt: 1 }];
    expect(addHistoryItem(seed, { query: "   ", displayName: "" })).toEqual(seed);
  });
});

describe("useHistory", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.history).toEqual([]);
  });

  it("adds, removes, and clears items", () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.add({ query: "London", displayName: "London, UK" });
      result.current.add({ query: "Paris", displayName: "Paris, FR" });
    });
    expect(result.current.history).toHaveLength(2);
    expect(result.current.history[0]?.query).toBe("Paris");

    const idToRemove = result.current.history[0]?.id;
    if (!idToRemove) throw new Error("expected an id");
    act(() => result.current.remove(idToRemove));
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]?.query).toBe("London");

    act(() => result.current.clear());
    expect(result.current.history).toEqual([]);
  });

  it("syncs across multiple hook instances", () => {
    const a = renderHook(() => useHistory());
    const b = renderHook(() => useHistory());

    act(() => {
      a.result.current.add({ query: "London", displayName: "London, UK" });
    });

    expect(a.result.current.history).toHaveLength(1);
    expect(b.result.current.history).toHaveLength(1);
    expect(b.result.current.history[0]?.query).toBe("London");
  });

  it("persists across hook unmount/remount via localStorage", () => {
    const first = renderHook(() => useHistory());
    act(() => {
      first.result.current.add({ query: "London", displayName: "London, UK" });
    });
    first.unmount();

    const second = renderHook(() => useHistory());
    expect(second.result.current.history).toHaveLength(1);
    expect(second.result.current.history[0]?.query).toBe("London");
  });

  it("restore prepends items and respects the cap", () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.add({ query: "Berlin", displayName: "Berlin" });
    });

    const removed: HistoryItem[] = [
      { id: "x1", query: "Lisbon", displayName: "Lisbon", addedAt: 999 },
      { id: "x2", query: "Madrid", displayName: "Madrid", addedAt: 998 },
    ];

    act(() => result.current.restore(removed));

    expect(result.current.history.map((i) => i.query)).toEqual(["Lisbon", "Madrid", "Berlin"]);
  });
});
