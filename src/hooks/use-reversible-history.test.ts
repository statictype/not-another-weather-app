import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetHistoryStoreForTests } from "@/hooks/use-history";
import { useReversibleHistory } from "./use-reversible-history";

type ToastFn = (title: string, opts?: { action?: { label: string; onClick: () => void } }) => void;
type ToastCall = Parameters<ToastFn>;

const toastCalls: ToastCall[] = [];

vi.mock("sonner", () => ({
  toast: (...args: ToastCall) => {
    toastCalls.push(args);
  },
}));

beforeEach(() => {
  __resetHistoryStoreForTests();
  toastCalls.length = 0;
});

afterEach(() => {
  __resetHistoryStoreForTests();
});

function lastToast() {
  const call = toastCalls.at(-1);
  if (!call) throw new Error("expected a toast");
  return { title: call[0], action: call[1]?.action };
}

describe("useReversibleHistory", () => {
  it("removeWithUndo removes the item and fires a toast with an Undo action", () => {
    const { result } = renderHook(() => useReversibleHistory());

    act(() => {
      result.current.add({ query: "London", displayName: "London, UK" });
    });
    const item = result.current.history[0];
    if (!item) throw new Error("expected an item");

    act(() => result.current.removeWithUndo(item));

    expect(result.current.history).toEqual([]);
    const { title, action } = lastToast();
    expect(title).toBe("Removed London, UK");
    expect(action?.label).toBe("Undo");
  });

  it("invoking the Undo action restores the removed item", () => {
    const { result } = renderHook(() => useReversibleHistory());

    act(() => {
      result.current.add({ query: "London", displayName: "London, UK" });
    });
    const item = result.current.history[0];
    if (!item) throw new Error("expected an item");

    act(() => result.current.removeWithUndo(item));
    expect(result.current.history).toEqual([]);

    const { action } = lastToast();
    act(() => action?.onClick());

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]?.id).toBe(item.id);
  });

  it("clearAllWithUndo clears every item and the Undo action restores them all", () => {
    const { result } = renderHook(() => useReversibleHistory());

    act(() => {
      result.current.add({ query: "London", displayName: "London, UK" });
      result.current.add({ query: "Paris", displayName: "Paris, FR" });
      result.current.add({ query: "Berlin", displayName: "Berlin, DE" });
    });
    expect(result.current.history).toHaveLength(3);

    act(() => result.current.clearAllWithUndo());
    expect(result.current.history).toEqual([]);

    const { title, action } = lastToast();
    expect(title).toBe("Cleared 3 recent searches");

    act(() => action?.onClick());
    expect(result.current.history.map((i) => i.query)).toEqual(["Berlin", "Paris", "London"]);
  });

  it("clearAllWithUndo is a no-op when history is empty (no toast)", () => {
    const { result } = renderHook(() => useReversibleHistory());

    act(() => result.current.clearAllWithUndo());

    expect(result.current.history).toEqual([]);
    expect(toastCalls).toHaveLength(0);
  });

  it("Undo is bounded — a second click after restoring does nothing", () => {
    const { result } = renderHook(() => useReversibleHistory());

    act(() => {
      result.current.add({ query: "London", displayName: "London, UK" });
    });
    const item = result.current.history[0];
    if (!item) throw new Error("expected an item");

    act(() => result.current.removeWithUndo(item));
    const { action } = lastToast();
    act(() => action?.onClick());
    expect(result.current.history).toHaveLength(1);

    act(() => action?.onClick());
    expect(result.current.history).toHaveLength(1);
  });
});
