import { toast } from "sonner";
import { type HistoryItem, useHistory } from "./use-history";
import { useUndo } from "./use-undo";

const UNDO_WINDOW_MS = 5000;

export interface UseReversibleHistoryReturn {
  history: HistoryItem[];
  add: (item: Omit<HistoryItem, "id" | "addedAt">) => void;
  /** Remove a single item with a 5 s undo toast. */
  removeWithUndo: (item: HistoryItem) => void;
  /** Clear all items with a 5 s undo toast. No-op if history is empty. */
  clearAllWithUndo: () => void;
}

/**
 * History + "remove with undo toast" interaction, in one hook.
 *
 * Composes `useHistory` and `useUndo` with the sonner toast call so each
 * destructive action is a single call at the call site — and the
 * ordering invariant (mutate → stage the pending removal → fire the
 * toast → wire its Undo action to restore) lives in one place instead
 * of being re-implemented at every caller.
 *
 * Tied to sonner because that's the app's only toast lib. If we ever
 * swap libs, this file is the seam.
 */
export function useReversibleHistory(): UseReversibleHistoryReturn {
  const { history, add, remove, clear, restore } = useHistory();
  const undo = useUndo<HistoryItem>(UNDO_WINDOW_MS);

  const restoreFromUndo = () => {
    const restored = undo.undo();
    if (restored) restore(restored.items);
  };

  const removeWithUndo = (item: HistoryItem) => {
    remove(item.id);
    undo.stage({ items: [item], label: `Removed ${item.displayName}` });
    toast(`Removed ${item.displayName}`, {
      action: { label: "Undo", onClick: restoreFromUndo },
    });
  };

  const clearAllWithUndo = () => {
    if (history.length === 0) return;
    const snapshot = [...history];
    clear();
    undo.stage({ items: snapshot, label: `Cleared ${snapshot.length} searches` });
    toast(`Cleared ${snapshot.length} recent searches`, {
      action: { label: "Undo", onClick: restoreFromUndo },
    });
  };

  return { history, add, removeWithUndo, clearAllWithUndo };
}
