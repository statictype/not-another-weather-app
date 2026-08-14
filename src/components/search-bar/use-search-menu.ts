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

export interface UseSearchMenuArgs {
  recentItems: HistoryItem[];
  suggestions: SuggestionItem[];
  isSuggestionsLoading: boolean;
  onSuggestionSelect: (item: SuggestionItem) => void;
  onRecentSelect: (item: HistoryItem) => void;
  onLocationRequest: () => void;
  onRandomSelect: () => void;
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
  cancel: () => void;
  hoverKey: (key: string | null) => void;
  /** Wired to row onMouseDown so the row owns its own preventDefault. */
  selectRecent: (item: HistoryItem) => void;
  selectSuggestion: (item: SuggestionItem) => void;
  requestLocation: () => void;
  selectRandom: () => void;
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

  // The dialog traps focus, blurring the input; treat it as a held-open signal.
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
