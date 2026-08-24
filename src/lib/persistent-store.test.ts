import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPersistentStore, type PersistentStore } from "./persistent-store";

const KEY = "test:persistent";

/** Accepts only `"a"` / `"b"`; anything else is a rejected string. */
function createStore(fallback: () => string = () => "fallback"): PersistentStore<string> {
  return createPersistentStore<string>({
    key: KEY,
    decode: (raw) => (raw === "a" || raw === "b" ? raw : null),
    encode: (value) => value,
    fallback,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("seeding", () => {
  it("seeds the snapshot from storage at construction", () => {
    window.localStorage.setItem(KEY, "a");
    expect(createStore().get()).toBe("a");
  });

  it("falls back when the key is absent", () => {
    expect(createStore().get()).toBe("fallback");
  });

  it("falls back when decode rejects the stored string", () => {
    window.localStorage.setItem(KEY, "corrupt");
    expect(createStore().get()).toBe("fallback");
  });

  it("falls back when decode throws", () => {
    window.localStorage.setItem(KEY, "{not json");
    const store = createPersistentStore<string[]>({
      key: KEY,
      decode: (raw) => (raw === null ? null : (JSON.parse(raw) as string[])),
      encode: (value) => JSON.stringify(value),
      fallback: () => [],
    });
    expect(store.get()).toEqual([]);
  });

  it("falls back when reading storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("disabled");
    });
    expect(createStore().get()).toBe("fallback");
  });

  it("evaluates fallback on every miss, not once at construction", () => {
    let current = "first";
    const store = createStore(() => current);
    expect(store.get()).toBe("first");

    current = "second";
    store.reset();
    expect(store.get()).toBe("second");
  });
});

describe("writing", () => {
  it("writes through to storage", () => {
    const store = createStore();
    store.set("b");

    expect(store.get()).toBe("b");
    expect(window.localStorage.getItem(KEY)).toBe("b");
  });

  it("keeps the in-memory value when the write throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    const store = createStore();
    expect(() => store.set("b")).not.toThrow();
    expect(store.get()).toBe("b");
  });
});

describe("cross-tab sync", () => {
  it("re-reads the snapshot on a storage event for its key", () => {
    const store = createStore();
    const { result } = renderHook(() => store.use());
    expect(result.current).toBe("fallback");

    act(() => {
      window.localStorage.setItem(KEY, "a");
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });

    expect(result.current).toBe("a");
  });

  it("ignores a storage event for another key", () => {
    const store = createStore();
    const { result } = renderHook(() => store.use());

    act(() => {
      window.localStorage.setItem(KEY, "a");
      window.dispatchEvent(new StorageEvent("storage", { key: "other:key" }));
    });

    expect(result.current).toBe("fallback");
  });

  it("shares one snapshot across every consumer", () => {
    const store = createStore();
    const a = renderHook(() => store.use());
    const b = renderHook(() => store.use());

    act(() => store.set("b"));

    expect(a.result.current).toBe("b");
    expect(b.result.current).toBe("b");
  });
});

describe("reset", () => {
  it("removes the key and re-seeds from the fallback", () => {
    const store = createStore();
    store.set("b");

    store.reset();

    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(store.get()).toBe("fallback");
  });

  it("re-seeds from the given value without writing it back", () => {
    const store = createStore();
    store.set("b");

    store.reset("a");

    expect(store.get()).toBe("a");
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("notifies subscribers", () => {
    const store = createStore();
    const { result } = renderHook(() => store.use());

    act(() => store.set("b"));
    expect(result.current).toBe("b");

    act(() => store.reset());
    expect(result.current).toBe("fallback");
  });
});

describe("the server snapshot", () => {
  it("is used on the server when it differs from the fallback", () => {
    const store = createPersistentStore<string>({
      key: KEY,
      decode: () => null,
      encode: (value) => value,
      fallback: () => "client-fallback",
      serverValue: "server-value",
    });

    expect(renderToStaticMarkup(createElement(() => createElement("i", null, store.use())))).toBe(
      "<i>server-value</i>",
    );
    expect(store.get()).toBe("client-fallback");
  });

  it("defaults to the fallback when unset", () => {
    const store = createStore();

    expect(renderToStaticMarkup(createElement(() => createElement("i", null, store.use())))).toBe(
      "<i>fallback</i>",
    );
  });
});
