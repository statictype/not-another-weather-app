import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type PendingRemoval, useUndo } from "./use-undo";

describe("useUndo", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts with no pending removal", () => {
    const { result } = renderHook(() => useUndo<string>(5000));
    expect(result.current.pending).toBeNull();
  });

  it("stages a removal and clears it after the timeout", () => {
    const { result } = renderHook(() => useUndo<string>(5000));

    act(() => result.current.stage({ items: ["a", "b"], label: "2 items" }));
    expect(result.current.pending?.items).toEqual(["a", "b"]);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.pending).toBeNull();
  });

  it("undo returns the pending items and clears state", () => {
    const { result } = renderHook(() => useUndo<string>(5000));

    act(() => result.current.stage({ items: ["a"], label: "1 item" }));

    let restored: PendingRemoval<string> | null = null;
    act(() => {
      restored = result.current.undo();
    });
    expect(restored).not.toBeNull();
    expect((restored as PendingRemoval<string> | null)?.items).toEqual(["a"]);
    expect(result.current.pending).toBeNull();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.pending).toBeNull();
  });

  it("staging a new removal commits the previous one immediately", () => {
    const { result } = renderHook(() => useUndo<string>(5000));

    act(() => result.current.stage({ items: ["first"], label: "first" }));
    act(() => result.current.stage({ items: ["second"], label: "second" }));

    expect(result.current.pending?.items).toEqual(["second"]);

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.pending?.items).toEqual(["second"]);

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(result.current.pending).toBeNull();
  });

  it("commit drops the pending removal without restoring", () => {
    const { result } = renderHook(() => useUndo<string>(5000));

    act(() => result.current.stage({ items: ["a"], label: "1" }));
    act(() => result.current.commit());

    expect(result.current.pending).toBeNull();
  });
});
