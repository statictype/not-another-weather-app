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
    onClose: vi.fn(),
    ...overrides,
  };
}

type ChangeArg = Parameters<ReturnType<typeof useSearchMenu>["inputProps"]["onChange"]>[0];
type KeyArg = Parameters<ReturnType<typeof useSearchMenu>["inputProps"]["onKeyDown"]>[0];
type SubmitArg = Parameters<ReturnType<typeof useSearchMenu>["formProps"]["onSubmit"]>[0];

const change = (value: string) => ({ target: { value } }) as unknown as ChangeArg;
const key = (k: string) => ({ key: k, preventDefault: () => {} }) as unknown as KeyArg;
const submit = () => ({ preventDefault: () => {} }) as unknown as SubmitArg;

describe("useSearchMenu", () => {
  it("starts with an empty value", () => {
    const { result } = renderHook(() => useSearchMenu(makeArgs()));
    expect(result.current.value).toBe("");
  });

  it("close clears the value and hands the decision to the owner", () => {
    const onClose = vi.fn();
    const onValueChange = vi.fn();
    const { result } = renderHook(() => useSearchMenu(makeArgs({ onClose, onValueChange })));

    act(() => result.current.inputProps.onChange(change("Par")));
    expect(onValueChange).toHaveBeenLastCalledWith("Par");

    act(() => result.current.close());
    expect(onValueChange).toHaveBeenLastCalledWith("");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("running a row reports through onCommit and never closes by itself", () => {
    const onClose = vi.fn();
    const onCommit = vi.fn();
    const onRecentSelect = vi.fn();
    const recents = [recent("a", "Paris")];
    const { result } = renderHook(() =>
      useSearchMenu(makeArgs({ recentItems: recents, onRecentSelect, onCommit, onClose })),
    );

    act(() => result.current.selectRecent(recents[0]!));

    expect(onRecentSelect).toHaveBeenCalledWith(recents[0]);
    expect(onCommit).toHaveBeenCalledWith({ kind: "recent", key: "recent:a", item: recents[0] });
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.value).toBe("");
  });

  it("keeps the clear-history dialog state without it meaning anything about open", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useSearchMenu(makeArgs({ onClose })));

    act(() => result.current.setDialogOpen(true));
    expect(result.current.isDialogOpen).toBe(true);

    act(() => result.current.setDialogOpen(false));
    expect(result.current.isDialogOpen).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("defaults focus to the first city row when value is empty", () => {
    const recents = [recent("a", "Paris"), recent("b", "London")];
    const { result } = renderHook(() => useSearchMenu(makeArgs({ recentItems: recents })));
    expect(result.current.focusedKey).toBe("recent:a");
  });

  it("submit runs the focused row", () => {
    const onRecentSelect = vi.fn();
    const onCommit = vi.fn();
    const recents = [recent("a", "Paris")];
    const { result } = renderHook(() =>
      useSearchMenu(makeArgs({ recentItems: recents, onRecentSelect, onCommit })),
    );

    act(() => result.current.formProps.onSubmit(submit()));

    expect(onRecentSelect).toHaveBeenCalledWith(recents[0]);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("submit with no rows is a silent no-op (no select-prompt flash)", () => {
    const onRecentSelect = vi.fn();
    const onSuggestionSelect = vi.fn();
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useSearchMenu(makeArgs({ onRecentSelect, onSuggestionSelect, onCommit })),
    );

    act(() => result.current.formProps.onSubmit(submit()));

    expect(onRecentSelect).not.toHaveBeenCalled();
    expect(onSuggestionSelect).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("ArrowDown / ArrowUp move the focused key through the navigable list", () => {
    const recents = [recent("a", "Paris"), recent("b", "London")];
    const { result } = renderHook(() => useSearchMenu(makeArgs({ recentItems: recents })));

    expect(result.current.focusedKey).toBe("recent:a");

    act(() => result.current.inputProps.onKeyDown(key("ArrowDown")));
    expect(result.current.focusedKey).toBe("recent:b");
    act(() => result.current.inputProps.onKeyDown(key("ArrowDown")));
    expect(result.current.focusedKey).toBe("action:location");
    act(() => result.current.inputProps.onKeyDown(key("ArrowUp")));
    expect(result.current.focusedKey).toBe("recent:b");
  });

  it("Escape in the field closes and clears the value", () => {
    const onClose = vi.fn();
    const onValueChange = vi.fn();
    const { result } = renderHook(() => useSearchMenu(makeArgs({ onClose, onValueChange })));

    act(() => result.current.inputProps.onChange(change("Par")));
    act(() => result.current.inputProps.onKeyDown(key("Escape")));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.value).toBe("");
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("each row kind reaches its own callback and reports its own key", () => {
    const onSuggestionSelect = vi.fn();
    const onLocationRequest = vi.fn();
    const onRandomSelect = vi.fn();
    const onCommit = vi.fn();
    const suggestions = [sugg(1, "Paris")];
    const { result } = renderHook(() =>
      useSearchMenu(
        makeArgs({ suggestions, onSuggestionSelect, onLocationRequest, onRandomSelect, onCommit }),
      ),
    );

    act(() => result.current.selectSuggestion(suggestions[0]!));
    expect(onSuggestionSelect).toHaveBeenCalledWith(suggestions[0]);
    expect(onCommit).toHaveBeenLastCalledWith(expect.objectContaining({ key: "suggestion:1" }));

    act(() => result.current.requestLocation());
    expect(onLocationRequest).toHaveBeenCalled();
    expect(onCommit).toHaveBeenLastCalledWith(expect.objectContaining({ key: "action:location" }));

    act(() => result.current.selectRandom());
    expect(onRandomSelect).toHaveBeenCalled();
    expect(onCommit).toHaveBeenLastCalledWith(expect.objectContaining({ key: "action:random" }));
  });

  it("typing clears any explicitly-selected key (falls back to the new first row)", () => {
    const recents = [recent("a", "Paris"), recent("b", "London")];
    const { result } = renderHook(() => useSearchMenu(makeArgs({ recentItems: recents })));

    act(() => result.current.inputProps.onKeyDown(key("ArrowDown")));
    expect(result.current.focusedKey).toBe("recent:b");

    act(() => result.current.inputProps.onChange(change("P")));
    expect(result.current.focusedKey).toBe("recent:a");
  });
});
