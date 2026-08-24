import { useSyncExternalStore } from "react";
import { createSubscription } from "./external-store";

export interface PersistentStoreOptions<T> {
  key: string;
  /** `null` when the stored string is absent or fails validation. */
  decode: (raw: string | null) => T | null;
  encode: (value: T) => string;
  /** Evaluated lazily, every time decode yields null. */
  fallback: () => T;
  /** The `useSyncExternalStore` server snapshot. Defaults to `fallback()`. */
  serverValue?: T;
}

export interface PersistentStore<T> {
  /** Subscribes the caller to the shared snapshot. */
  use: () => T;
  /** The current snapshot. Readable outside React. */
  get: () => T;
  /** Caches, writes through to `localStorage`, notifies subscribers. */
  set: (next: T) => void;
  /** Test hatch: removes the key, re-seeds the snapshot, notifies. */
  reset: (value?: T) => void;
}

/**
 * One `localStorage`-backed `useSyncExternalStore` source: cached snapshot,
 * cross-tab `storage` event, and the read/write failure policy.
 */
export function createPersistentStore<T>(options: PersistentStoreOptions<T>): PersistentStore<T> {
  const { key, decode, encode, fallback } = options;
  const serverValue = options.serverValue ?? fallback();

  // A corrupt value, a rejected value and disabled storage all read as absent.
  function readFromStorage(): T {
    if (typeof window === "undefined") return fallback();
    try {
      return decode(window.localStorage.getItem(key)) ?? fallback();
    } catch {
      return fallback();
    }
  }

  let snapshot: T = readFromStorage();

  const subscription = createSubscription((onChange) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      snapshot = readFromStorage();
      onChange();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  });

  function get(): T {
    return snapshot;
  }

  function getServerSnapshot(): T {
    return serverValue;
  }

  function set(next: T): void {
    snapshot = next;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, encode(next));
      } catch {
        // Quota exceeded or storage disabled — keep in-memory state.
      }
    }
    subscription.notify();
  }

  function reset(value?: T): void {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Storage disabled.
      }
    }
    snapshot = value ?? fallback();
    subscription.notify();
  }

  function use(): T {
    return useSyncExternalStore(subscription.subscribe, get, getServerSnapshot);
  }

  return { use, get, set, reset };
}
