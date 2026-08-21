import { toast } from "sonner";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { setSearchParam } from "@/hooks/use-search-param";
import { normalizeQuery } from "@/lib/query";
import { pickRandomCity } from "@/lib/random-cities";

/**
 * Every way a city becomes the active city. One call resolves the intent and
 * writes `?city=`, so the query in the URL and the query a caller waits for are
 * the same string and cannot drift.
 */
export type CitySelectionIntent =
  | { kind: "recent"; item: HistoryItem }
  | { kind: "suggestion"; item: SuggestionItem }
  | { kind: "random" }
  | { kind: "location" }
  | { kind: "starter"; query: string };

export function suggestionToQuery(item: SuggestionItem): string {
  return item.region
    ? `${item.name}, ${item.region}, ${item.country}`
    : `${item.name}, ${item.country}`;
}

/** The resolution rule, with no URL write. `null` when the intent produced no
 *  city — an empty query, or a geolocation read that failed. */
export async function resolveIntent(intent: CitySelectionIntent): Promise<string | null> {
  switch (intent.kind) {
    case "recent":
      return usable(intent.item.query);
    case "suggestion":
      return usable(suggestionToQuery(intent.item));
    case "starter":
      return usable(intent.query);
    case "random":
      return usable(pickRandomCity());
    case "location":
      return resolveLocation();
  }
}

/** Resolves the intent to a query, writes `?city=`, and returns what it
 *  committed. `null` when the intent produced no city. */
export async function selectCity(intent: CitySelectionIntent): Promise<string | null> {
  const query = await resolveIntent(intent);
  if (query === null) return null;
  setSearchParam("city", query);
  return query;
}

function usable(query: string): string | null {
  return normalizeQuery(query) === null ? null : query;
}

function resolveLocation(): Promise<string | null> {
  if (!navigator.geolocation) {
    toast("Geolocation is not supported by your browser");
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // ~100m, coarser than GPS noise, so repeated reads dedupe in history.
        const lat = position.coords.latitude.toFixed(3);
        const lon = position.coords.longitude.toFixed(3);
        resolve(`${lat},${lon}`);
      },
      () => {
        toast("Could not determine your location");
        resolve(null);
      },
    );
  });
}
