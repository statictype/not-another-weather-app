import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetUnitSystemForTests,
  UNIT_STORAGE_KEY,
  useUnitSystem,
  useUnitSystemControl,
} from "./use-unit-system";

function stubLanguage(language: string | undefined): void {
  Object.defineProperty(navigator, "language", {
    configurable: true,
    value: language,
  });
}

beforeEach(() => {
  window.localStorage.clear();
  stubLanguage("en-GB");
  __resetUnitSystemForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the derived default", () => {
  it.each(["en-US", "es-US", "en-LR", "my-MM"])("reads %s as imperial", (language) => {
    stubLanguage(language);
    __resetUnitSystemForTests();

    expect(renderHook(() => useUnitSystem()).result.current).toBe("imperial");
  });

  it.each(["en-GB", "de-DE", "ja-JP", "en"])("reads %s as metric", (language) => {
    stubLanguage(language);
    __resetUnitSystemForTests();

    expect(renderHook(() => useUnitSystem()).result.current).toBe("metric");
  });

  it("falls back to metric when navigator.language is absent", () => {
    stubLanguage(undefined);
    __resetUnitSystemForTests();

    expect(renderHook(() => useUnitSystem()).result.current).toBe("metric");
  });

  it("falls back to metric when navigator.language is malformed", () => {
    stubLanguage("not a locale");
    __resetUnitSystemForTests();

    expect(renderHook(() => useUnitSystem()).result.current).toBe("metric");
  });
});

describe("the stored value", () => {
  it("wins over the derived default, including where the two agree", () => {
    stubLanguage("en-US");
    __resetUnitSystemForTests();
    const { result } = renderHook(() => useUnitSystem());
    expect(result.current).toBe("imperial");

    act(() => {
      window.localStorage.setItem(UNIT_STORAGE_KEY, "metric");
      window.dispatchEvent(new StorageEvent("storage", { key: UNIT_STORAGE_KEY }));
    });

    expect(result.current).toBe("metric");
  });

  it("is ignored when it falls outside the union", () => {
    stubLanguage("en-GB");
    __resetUnitSystemForTests();
    const { result } = renderHook(() => useUnitSystem());

    act(() => {
      window.localStorage.setItem(UNIT_STORAGE_KEY, "farenheit");
      window.dispatchEvent(new StorageEvent("storage", { key: UNIT_STORAGE_KEY }));
    });

    expect(result.current).toBe("metric");
  });

  it("persists the choice", () => {
    const { result } = renderHook(() => useUnitSystemControl());

    act(() => result.current[1]("imperial"));

    expect(result.current[0]).toBe("imperial");
    expect(window.localStorage.getItem(UNIT_STORAGE_KEY)).toBe("imperial");
  });

  it("survives a storage write that throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    const { result } = renderHook(() => useUnitSystemControl());
    act(() => result.current[1]("imperial"));

    expect(result.current[0]).toBe("imperial");
  });
});

describe("cross-tab sync", () => {
  it("picks up another tab's write from the storage event", () => {
    const { result } = renderHook(() => useUnitSystem());
    expect(result.current).toBe("metric");

    act(() => {
      window.localStorage.setItem(UNIT_STORAGE_KEY, "imperial");
      window.dispatchEvent(new StorageEvent("storage", { key: UNIT_STORAGE_KEY }));
    });

    expect(result.current).toBe("imperial");
  });

  it("ignores an event for another key", () => {
    const { result } = renderHook(() => useUnitSystem());

    act(() => {
      window.localStorage.setItem(UNIT_STORAGE_KEY, "imperial");
      window.dispatchEvent(new StorageEvent("storage", { key: "air:history" }));
    });

    expect(result.current).toBe("metric");
  });

  it("shares one snapshot across every consumer", () => {
    const a = renderHook(() => useUnitSystemControl());
    const b = renderHook(() => useUnitSystem());

    act(() => a.result.current[1]("imperial"));

    expect(b.result.current).toBe("imperial");
  });
});
