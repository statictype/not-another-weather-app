import { describe, expect, it } from "vitest";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { buildMenuModel } from "./menu-model";

const recent = (id: string, displayName: string): HistoryItem => ({
  id,
  query: displayName,
  displayName,
  addedAt: 1,
});

const sugg = (id: number, name: string, region = "", country = "FR"): SuggestionItem => ({
  id,
  name,
  region,
  country,
  lat: 0,
  lon: 0,
  url: "",
});

describe("buildMenuModel", () => {
  it("shows all recents when input is empty", () => {
    const recents = [recent("a", "Paris"), recent("b", "London")];
    const m = buildMenuModel({
      value: "",
      recentItems: recents,
      suggestions: [],
      isSuggestionsLoading: false,
    });
    expect(m.sections).toEqual([{ kind: "recent", items: recents }]);
    expect(m.defaultFocusKey).toBe("recent:a");
  });

  it("filters recents and shows the keep-typing hint when 0 < len < MIN", () => {
    const recents = [recent("a", "Paris, FR"), recent("b", "London, UK")];
    const m = buildMenuModel({
      value: "lo",
      recentItems: recents,
      suggestions: [],
      isSuggestionsLoading: false,
    });
    expect(m.sections.map((s) => s.kind)).toEqual(["recent", "keep-typing"]);
    const recentSection = m.sections[0];
    if (recentSection?.kind !== "recent") throw new Error("expected recent section");
    expect(recentSection.items.map((i) => i.id)).toEqual(["b"]);
    expect(m.defaultFocusKey).toBe("recent:b");
  });

  it("emits keep-typing alone when no recents match a short value", () => {
    const m = buildMenuModel({
      value: "xy",
      recentItems: [recent("a", "Paris")],
      suggestions: [],
      isSuggestionsLoading: false,
    });
    expect(m.sections.map((s) => s.kind)).toEqual(["keep-typing"]);
    expect(m.defaultFocusKey).toBeNull();
  });

  it("shows suggestions-loading at len >= MIN while pending", () => {
    const m = buildMenuModel({
      value: "lon",
      recentItems: [],
      suggestions: [],
      isSuggestionsLoading: true,
    });
    expect(m.sections.map((s) => s.kind)).toEqual(["suggestions-loading"]);
    expect(m.defaultFocusKey).toBeNull();
  });

  it("shows suggestions with header toggled by whether any recents are visible", () => {
    const recents = [recent("a", "London")];
    const suggestions = [sugg(1, "London, UK"), sugg(2, "London, ON")];
    const m = buildMenuModel({
      value: "lon",
      recentItems: recents,
      suggestions,
      isSuggestionsLoading: false,
    });
    expect(m.sections.map((s) => s.kind)).toEqual(["recent", "suggestions"]);
    const suggSection = m.sections[1];
    if (suggSection?.kind !== "suggestions") throw new Error("expected suggestions section");
    expect(suggSection.showHeader).toBe(true);

    const noRecent = buildMenuModel({
      value: "lon",
      recentItems: [],
      suggestions,
      isSuggestionsLoading: false,
    });
    const sug2 = noRecent.sections[0];
    if (sug2?.kind !== "suggestions") throw new Error("expected suggestions section");
    expect(sug2.showHeader).toBe(false);
  });

  it("emits empty-results when len >= MIN with no recents and no suggestions", () => {
    const m = buildMenuModel({
      value: "xyz",
      recentItems: [],
      suggestions: [],
      isSuggestionsLoading: false,
    });
    expect(m.sections.map((s) => s.kind)).toEqual(["empty-results"]);
    expect(m.defaultFocusKey).toBeNull();
  });

  it("omits empty-results if filtered recents still match", () => {
    const m = buildMenuModel({
      value: "par",
      recentItems: [recent("a", "Paris")],
      suggestions: [],
      isSuggestionsLoading: false,
    });
    expect(m.sections.map((s) => s.kind)).toEqual(["recent"]);
  });

  it("always returns the two action footer items", () => {
    const m = buildMenuModel({
      value: "",
      recentItems: [],
      suggestions: [],
      isSuggestionsLoading: false,
    });
    expect(m.actions.map((a) => a.kind === "action" && a.action)).toEqual(["location", "random"]);
  });

  it("navigable lists city rows then actions in render order", () => {
    const m = buildMenuModel({
      value: "lon",
      recentItems: [recent("a", "London Recent")],
      suggestions: [sugg(1, "London")],
      isSuggestionsLoading: false,
    });
    expect(m.navigable.map((n) => n.key)).toEqual([
      "recent:a",
      "suggestion:1",
      "action:location",
      "action:random",
    ]);
  });

  it("defaultFocusKey is the first city row (never an action)", () => {
    const m = buildMenuModel({
      value: "",
      recentItems: [],
      suggestions: [],
      isSuggestionsLoading: false,
    });
    expect(m.defaultFocusKey).toBeNull();
    expect(m.navigable.length).toBe(2); // both actions
  });
});
