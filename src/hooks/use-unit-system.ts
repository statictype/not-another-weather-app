import { useSyncExternalStore } from "react";
import { createSubscription } from "@/lib/external-store";
import { isUnitSystem, type UnitSystem } from "@/lib/units";

export const UNIT_STORAGE_KEY = "air:units";

const IMPERIAL_REGIONS = new Set(["US", "LR", "MM"]);

let cachedSnapshot: UnitSystem = readFromStorage() ?? deriveFromLocale();

const subscription = createSubscription((onChange) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== UNIT_STORAGE_KEY) return;
    cachedSnapshot = readFromStorage() ?? deriveFromLocale();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
});

function deriveFromLocale(): UnitSystem {
  try {
    const region = new Intl.Locale(navigator.language).region;
    return region && IMPERIAL_REGIONS.has(region) ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

/** The stored string indexes the DTO, so a hand-edited value would make
 *  `d.temp[system]` `undefined` at every call site. */
function readFromStorage(): UnitSystem | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(UNIT_STORAGE_KEY);
    return isUnitSystem(raw) ? raw : null;
  } catch {
    return null;
  }
}

function setUnitSystem(next: UnitSystem): void {
  cachedSnapshot = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(UNIT_STORAGE_KEY, next);
    } catch {
      // Quota exceeded or storage disabled — keep in-memory state.
    }
  }
  subscription.notify();
}

function getSnapshot(): UnitSystem {
  return cachedSnapshot;
}

function getServerSnapshot(): UnitSystem {
  return "metric";
}

export function useUnitSystem(): UnitSystem {
  return useSyncExternalStore(subscription.subscribe, getSnapshot, getServerSnapshot);
}

export function useUnitSystemControl(): [UnitSystem, (next: UnitSystem) => void] {
  return [useUnitSystem(), setUnitSystem];
}

export function __resetUnitSystemForTests(system?: UnitSystem): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(UNIT_STORAGE_KEY);
    } catch {
      // Storage disabled.
    }
  }
  cachedSnapshot = system ?? deriveFromLocale();
  subscription.notify();
}
