import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
  useRef,
  useState,
} from "react";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { buildMenuModel, type MenuModel, type NavigableItem } from "./menu-model";

/**
 * Search menu state machine.
 *
 * Owns the input value, focus state, and explicit row selection. Returns
 * the rendered `MenuModel`, ready-to-spread `inputProps`/`formProps`,
 * and a small set of imperative actions for the row-click handlers.
 *
 * Platform-agnostic — there is no `isDesktop` branch. Both layouts
 * consume the same state. Default focus always lands on the first
 * city row (recent or suggestion), so Enter always has something to
 * run when results exist; the old "Select a city from the list"
 * prompt is gone.
 *
 * After every commit (suggestion / recent / location / random) the
 * menu performs the same close: clear the input value and blur it.
 * On desktop that dismisses the dropdown; on mobile it closes the
 * overlay. Re-opening is a single user focus event.
 */

export interface UseSearchMenuArgs {
  recentItems: HistoryItem[];
  suggestions: SuggestionItem[];
  isSuggestionsLoading: boolean;
  onSuggestionSelect: (item: SuggestionItem) => void;
  onRecentSelect: (item: HistoryItem) => void;
  onLocationRequest: () => void;
  onRandomSelect: () => void;
  /**
   * Fires every time the input value changes (typing or close-on-commit).
   * App-level code reads it to drive the debounced suggestion fetch via
   * `useSuggestions`. Kept as a callback so the input value has exactly
   * one owner — this hook — and the parent observes it.
   */
  onValueChange?: (next: string) => void;
}

export interface UseSearchMenuReturn {
  value: string;
  isOpen: boolean;
  model: MenuModel;
  focusedKey: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  inputProps: {
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onFocus: () => void;
    onBlur: () => void;
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  };
  formProps: { onSubmit: (e: FormEvent<HTMLFormElement>) => void };
  /** Close + clear. Wired to Escape, mobile Cancel, and post-commit. */
  cancel: () => void;
  /** Set the focused row by hover (desktop) or no-op (touch). */
  hoverKey: (key: string | null) => void;
  /** Imperative commit helpers — wired to row onMouseDown so the row owns its own preventDefault. */
  selectRecent: (item: HistoryItem) => void;
  selectSuggestion: (item: SuggestionItem) => void;
  requestLocation: () => void;
  selectRandom: () => void;
  /** Alert-dialog open state, exposed so clear-all confirmation can keep the menu visible. */
  isDialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
}

export function useSearchMenu(args: UseSearchMenuArgs): UseSearchMenuReturn {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const trimmed = value.trim();
  const model = buildMenuModel({
    value: trimmed,
    recentItems: args.recentItems,
    suggestions: args.suggestions,
    isSuggestionsLoading: args.isSuggestionsLoading,
  });

  const focusedKey =
    selectedKey && model.navigable.some((i) => i.key === selectedKey)
      ? selectedKey
      : model.defaultFocusKey;

  // The dialog is itself a focus trap — when it opens, the input blurs
  // and the menu would otherwise close. Treat the dialog as a held-open
  // signal so the user returns to the same menu state when the dialog
  // resolves.
  const isOpen = isFocused || isDialogOpen;

  const updateValue = (next: string) => {
    setValue(next);
    args.onValueChange?.(next);
  };

  const close = () => {
    updateValue("");
    setSelectedKey(null);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const moveFocus = (delta: 1 | -1) => {
    if (model.navigable.length === 0) return;
    const idx = model.navigable.findIndex((i) => i.key === focusedKey);
    const nextIdx =
      idx === -1
        ? delta === 1
          ? 0
          : model.navigable.length - 1
        : Math.max(0, Math.min(model.navigable.length - 1, idx + delta));
    const nextKey = model.navigable[nextIdx]?.key;
    if (nextKey) setSelectedKey(nextKey);
  };

  const runFocused = () => {
    if (!focusedKey) return;
    const item = model.navigable.find((i) => i.key === focusedKey);
    if (!item) return;
    runItem(item);
  };

  const runItem = (item: NavigableItem) => {
    if (item.kind === "recent") {
      args.onRecentSelect(item.item);
    } else if (item.kind === "suggestion") {
      args.onSuggestionSelect(item.item);
    } else if (item.action === "location") {
      args.onLocationRequest();
    } else {
      args.onRandomSelect();
    }
    close();
  };

  return {
    value,
    isOpen,
    model,
    focusedKey,
    inputRef,
    inputProps: {
      value,
      onChange: (e) => {
        updateValue(e.target.value);
        setSelectedKey(null);
      },
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      onKeyDown: (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          moveFocus(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          moveFocus(-1);
        } else if (e.key === "Escape") {
          e.preventDefault();
          close();
        }
      },
    },
    formProps: {
      onSubmit: (e) => {
        e.preventDefault();
        runFocused();
      },
    },
    cancel: close,
    hoverKey: setSelectedKey,
    selectRecent: (item) => runItem({ kind: "recent", key: `recent:${item.id}`, item }),
    selectSuggestion: (item) => runItem({ kind: "suggestion", key: `suggestion:${item.id}`, item }),
    requestLocation: () => runItem({ kind: "action", key: "action:location", action: "location" }),
    selectRandom: () => runItem({ kind: "action", key: "action:random", action: "random" }),
    isDialogOpen,
    setDialogOpen: setIsDialogOpen,
  };
}
