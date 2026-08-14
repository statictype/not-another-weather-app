import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { setSearchParam, useSearchParam } from "./use-search-param";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("useSearchParam", () => {
  it("returns the current value from window.location.search", () => {
    window.history.replaceState(null, "", "/?city=London");
    const { result } = renderHook(() => useSearchParam("city"));
    expect(result.current).toBe("London");
  });

  it("re-renders when setSearchParam updates the URL", () => {
    window.history.replaceState(null, "", "/");
    const { result } = renderHook(() => useSearchParam("city"));
    expect(result.current).toBeNull();

    act(() => {
      setSearchParam("city", "Paris");
    });

    expect(result.current).toBe("Paris");
    expect(new URL(window.location.href).searchParams.get("city")).toBe("Paris");
  });

  it("re-renders when a popstate event fires", () => {
    window.history.replaceState(null, "", "/?city=London");
    const { result } = renderHook(() => useSearchParam("city"));
    expect(result.current).toBe("London");

    act(() => {
      window.history.replaceState(null, "", "/?city=Berlin");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(result.current).toBe("Berlin");
  });
});
