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
  onValueChange?: (next: string) => void;
  /** The only selection channel: every row reports here and nowhere else. The
   *  owner decides what happens to the panel — the hook never closes on one. */
  onSelect: (item: NavigableItem) => void;
  /** The close control, Escape and the scrim. Clears the value first. */
  onClose: () => void;
}

export interface UseSearchMenuReturn {
  value: string;
  model: MenuModel;
  focusedKey: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  inputProps: {
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  };
  formProps: { onSubmit: (e: FormEvent<HTMLFormElement>) => void };
  close: () => void;
  hoverKey: (key: string | null) => void;
  /** Wired to row onMouseDown so the row owns its own preventDefault. */
  selectRecent: (item: HistoryItem) => void;
  selectSuggestion: (item: SuggestionItem) => void;
  requestLocation: () => void;
  selectRandom: () => void;
  isDialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
}

/**
 * Controlled. Open state belongs to the nav shell: two triggers open this panel
 * with different focus intent and one of them never touches the input, so
 * `isFocused` cannot be the open signal. Blur does not close.
 */
export function useSearchMenu(args: UseSearchMenuArgs): UseSearchMenuReturn {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState("");
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

  const updateValue = (next: string) => {
    setValue(next);
    args.onValueChange?.(next);
  };

  const close = () => {
    updateValue("");
    setSelectedKey(null);
    args.onClose();
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
    args.onSelect(item);
  };

  return {
    value,
    model,
    focusedKey,
    inputRef,
    inputProps: {
      value,
      onChange: (e) => {
        updateValue(e.target.value);
        setSelectedKey(null);
      },
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
    close,
    hoverKey: setSelectedKey,
    selectRecent: (item) => args.onSelect({ kind: "recent", key: `recent:${item.id}`, item }),
    selectSuggestion: (item) =>
      args.onSelect({ kind: "suggestion", key: `suggestion:${item.id}`, item }),
    requestLocation: () =>
      args.onSelect({ kind: "action", key: "action:location", action: "location" }),
    selectRandom: () => args.onSelect({ kind: "action", key: "action:random", action: "random" }),
    isDialogOpen,
    setDialogOpen: setIsDialogOpen,
  };
}
