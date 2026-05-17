import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { useSearchMenu } from "./use-search-menu";

const recent = (id: string, displayName: string): HistoryItem => ({
  id,
  query: displayName,
  displayName,
  addedAt: 1,
});

const sugg = (id: number, name: string): SuggestionItem => ({
  id,
  name,
  region: "",
  country: "FR",
  lat: 0,
  lon: 0,
  url: "",
});

function makeArgs(overrides: Partial<Parameters<typeof useSearchMenu>[0]> = {}) {
  return {
    recentItems: [],
    suggestions: [],
    isSuggestionsLoading: false,
    onSuggestionSelect: vi.fn(),
    onRecentSelect: vi.fn(),
    onLocationRequest: vi.fn(),
    onRandomSelect: vi.fn(),
    ...overrides,
  };
}

describe("useSearchMenu", () => {
  it("starts closed with an empty value", () => {
    const { result } = renderHook(() => useSearchMenu(makeArgs()));
    expect(result.current.isOpen).toBe(false);
    expect(result.current.value).toBe("");
  });

  it("opens on focus and closes on blur", () => {
    const { result } = renderHook(() => useSearchMenu(makeArgs()));

    act(() => result.current.inputProps.onFocus());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.inputProps.onBlur());
    expect(result.current.isOpen).toBe(false);
  });

  it("stays open while a dialog is mounted, even when input blurs", () => {
    const { result } = renderHook(() => useSearchMenu(makeArgs()));

    act(() => result.current.inputProps.onFocus());
    act(() => result.current.setDialogOpen(true));
    act(() => result.current.inputProps.onBlur());

    expect(result.current.isOpen).toBe(true);

    act(() => result.current.setDialogOpen(false));
    expect(result.current.isOpen).toBe(false);
  });

  it("emits onValueChange on typing and on close", () => {
    const onValueChange = vi.fn();
    const { result } = renderHook(() => useSearchMenu(makeArgs({ onValueChange })));

    act(() =>
      result.current.inputProps.onChange({
        target: { value: "Par" },
      } as unknown as Parameters<typeof result.current.inputProps.onChange>[0]),
    );
    expect(onValueChange).toHaveBeenLastCalledWith("Par");

    act(() => result.current.cancel());
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("defaults focus to the first city row when value is empty", () => {
    const recents = [recent("a", "Paris"), recent("b", "London")];
    const { result } = renderHook(() => useSearchMenu(makeArgs({ recentItems: recents })));
    expect(result.current.focusedKey).toBe("recent:a");
  });

  it("submit runs the focused row and closes", () => {
    const onRecentSelect = vi.fn();
    const recents = [recent("a", "Paris")];
    const { result } = renderHook(() =>
      useSearchMenu(makeArgs({ recentItems: recents, onRecentSelect })),
    );

    act(() => result.current.inputProps.onFocus());
    act(() =>
      result.current.formProps.onSubmit({
        preventDefault: () => {},
      } as unknown as Parameters<typeof result.current.formProps.onSubmit>[0]),
    );

    expect(onRecentSelect).toHaveBeenCalledWith(recents[0]);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.value).toBe("");
  });

  it("submit with no rows is a silent no-op (no select-prompt flash)", () => {
    const onRecentSelect = vi.fn();
    const onSuggestionSelect = vi.fn();
    const { result } = renderHook(() =>
      useSearchMenu(makeArgs({ onRecentSelect, onSuggestionSelect })),
    );

    act(() => result.current.inputProps.onFocus());
    act(() =>
      result.current.formProps.onSubmit({
        preventDefault: () => {},
      } as unknown as Parameters<typeof result.current.formProps.onSubmit>[0]),
    );

    expect(onRecentSelect).not.toHaveBeenCalled();
    expect(onSuggestionSelect).not.toHaveBeenCalled();
    // The hook does not surface any "Select a city from the list" flag.
    expect(result.current.isOpen).toBe(true);
  });

  it("ArrowDown / ArrowUp move the focused key through the navigable list", () => {
    const recents = [recent("a", "Paris"), recent("b", "London")];
    const { result } = renderHook(() => useSearchMenu(makeArgs({ recentItems: recents })));

    expect(result.current.focusedKey).toBe("recent:a");

    const press = (key: string) =>
      result.current.inputProps.onKeyDown({
        key,
        preventDefault: () => {},
      } as unknown as Parameters<typeof result.current.inputProps.onKeyDown>[0]);

    act(() => press("ArrowDown"));
    expect(result.current.focusedKey).toBe("recent:b");
    act(() => press("ArrowDown"));
    expect(result.current.focusedKey).toBe("action:location");
    act(() => press("ArrowUp"));
    expect(result.current.focusedKey).toBe("recent:b");
  });

  it("Escape closes and clears the value", () => {
    const onValueChange = vi.fn();
    const { result } = renderHook(() => useSearchMenu(makeArgs({ onValueChange })));

    act(() => result.current.inputProps.onFocus());
    act(() =>
      result.current.inputProps.onChange({
        target: { value: "Par" },
      } as unknown as Parameters<typeof result.current.inputProps.onChange>[0]),
    );
    act(() =>
      result.current.inputProps.onKeyDown({
        key: "Escape",
        preventDefault: () => {},
      } as unknown as Parameters<typeof result.current.inputProps.onKeyDown>[0]),
    );

    expect(result.current.isOpen).toBe(false);
    expect(result.current.value).toBe("");
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("selectSuggestion / requestLocation / selectRandom close after running", () => {
    const onSuggestionSelect = vi.fn();
    const onLocationRequest = vi.fn();
    const onRandomSelect = vi.fn();
    const suggestions = [sugg(1, "Paris")];
    const { result } = renderHook(() =>
      useSearchMenu(
        makeArgs({ suggestions, onSuggestionSelect, onLocationRequest, onRandomSelect }),
      ),
    );

    act(() => result.current.inputProps.onFocus());

    act(() => result.current.selectSuggestion(suggestions[0]!));
    expect(onSuggestionSelect).toHaveBeenCalledWith(suggestions[0]);
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.inputProps.onFocus());
    act(() => result.current.requestLocation());
    expect(onLocationRequest).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.inputProps.onFocus());
    act(() => result.current.selectRandom());
    expect(onRandomSelect).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  it("typing clears any explicitly-selected key (falls back to the new first row)", () => {
    const recents = [recent("a", "Paris"), recent("b", "London")];
    const { result } = renderHook(() => useSearchMenu(makeArgs({ recentItems: recents })));

    act(() =>
      result.current.inputProps.onKeyDown({
        key: "ArrowDown",
        preventDefault: () => {},
      } as unknown as Parameters<typeof result.current.inputProps.onKeyDown>[0]),
    );
    expect(result.current.focusedKey).toBe("recent:b");

    act(() =>
      result.current.inputProps.onChange({
        target: { value: "P" },
      } as unknown as Parameters<typeof result.current.inputProps.onChange>[0]),
    );
    // "P" filters recents to just Paris — focus falls back to the new first row.
    expect(result.current.focusedKey).toBe("recent:a");
  });
});
