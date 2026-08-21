import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { resolveIntent, selectCity, suggestionToQuery } from "./city-selection";
import { pickRandomCity } from "./random-cities";

vi.mock("sonner", () => ({ toast: vi.fn() }));

const sugg = (over: Partial<SuggestionItem> = {}): SuggestionItem => ({
  id: 1,
  name: "Paris",
  region: "Ile-de-France",
  country: "France",
  lat: 48.85,
  lon: 2.35,
  url: "paris",
  ...over,
});

const recent = (query: string): HistoryItem => ({
  id: "a",
  query,
  displayName: query,
  addedAt: 1,
});

/** jsdom has no geolocation, so the unsupported branch is the default. */
function stubGeolocation(value: unknown) {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value });
}

const cityParam = () => new URL(window.location.href).searchParams.get("city");

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.mocked(toast).mockClear();
});

afterEach(() => {
  stubGeolocation(undefined);
  vi.restoreAllMocks();
});

describe("suggestionToQuery", () => {
  it("names the region when the vendor has one", () => {
    expect(suggestionToQuery(sugg())).toBe("Paris, Ile-de-France, France");
  });

  it("drops the region when it is empty", () => {
    expect(suggestionToQuery(sugg({ region: "" }))).toBe("Paris, France");
  });
});

describe("resolveIntent", () => {
  it("takes a recent item's stored query verbatim", async () => {
    await expect(resolveIntent({ kind: "recent", item: recent("51.523,-0.129") })).resolves.toBe(
      "51.523,-0.129",
    );
  });

  it("takes a starter city's query verbatim", async () => {
    await expect(resolveIntent({ kind: "starter", query: "Tokyo, Japan" })).resolves.toBe(
      "Tokyo, Japan",
    );
  });

  it("resolves a suggestion through the one query rule", async () => {
    await expect(resolveIntent({ kind: "suggestion", item: sugg() })).resolves.toBe(
      "Paris, Ile-de-France, France",
    );
  });

  it("draws a random intent from the city pool", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    await expect(resolveIntent({ kind: "random" })).resolves.toBe(pickRandomCity());
  });

  it("produces no city for a query that is only whitespace", async () => {
    await expect(resolveIntent({ kind: "starter", query: "   " })).resolves.toBeNull();
  });

  it("coarsens a geolocation fix to three decimals", async () => {
    stubGeolocation({
      getCurrentPosition: (success: PositionCallback) =>
        success({
          coords: { latitude: 51.523134, longitude: -0.128934 },
        } as GeolocationPosition),
    });

    await expect(resolveIntent({ kind: "location" })).resolves.toBe("51.523,-0.129");
  });

  it("toasts and produces no city when the browser has no geolocation", async () => {
    await expect(resolveIntent({ kind: "location" })).resolves.toBeNull();
    expect(toast).toHaveBeenCalledWith("Geolocation is not supported by your browser");
  });

  it("toasts and produces no city when the fix is denied", async () => {
    stubGeolocation({
      getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code: 1, message: "denied" } as GeolocationPositionError),
    });

    await expect(resolveIntent({ kind: "location" })).resolves.toBeNull();
    expect(toast).toHaveBeenCalledWith("Could not determine your location");
  });
});

describe("selectCity", () => {
  it("writes the committed query to ?city= and returns it", async () => {
    const committed = await selectCity({ kind: "suggestion", item: sugg({ region: "" }) });

    expect(committed).toBe("Paris, France");
    expect(cityParam()).toBe("Paris, France");
  });

  it("leaves the URL alone when the intent produced no city", async () => {
    window.history.replaceState(null, "", "/?city=London");

    await expect(selectCity({ kind: "location" })).resolves.toBeNull();
    expect(cityParam()).toBe("London");
  });

  it("returns the query even when a repeat fix lands on the city already in the URL", async () => {
    stubGeolocation({
      getCurrentPosition: (success: PositionCallback) =>
        success({
          coords: { latitude: 51.523134, longitude: -0.128934 },
        } as GeolocationPosition),
    });

    const first = await selectCity({ kind: "location" });
    expect(cityParam()).toBe("51.523,-0.129");

    // Jitter under the coarsening: the URL does not change, but the caller
    // still gets the query, so a hold waiting on it settles.
    stubGeolocation({
      getCurrentPosition: (success: PositionCallback) =>
        success({
          coords: { latitude: 51.523189, longitude: -0.128891 },
        } as GeolocationPosition),
    });

    await expect(selectCity({ kind: "location" })).resolves.toBe(first);
    expect(cityParam()).toBe("51.523,-0.129");
  });
});
