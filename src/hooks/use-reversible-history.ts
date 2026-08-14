import { toast } from "sonner";
import { type HistoryItem, useHistory } from "./use-history";
import { useUndo } from "./use-undo";

const UNDO_WINDOW_MS = 5000;

export interface UseReversibleHistoryReturn {
  history: HistoryItem[];
  add: (item: Omit<HistoryItem, "id" | "addedAt">) => void;
  removeWithUndo: (item: HistoryItem) => void;
  clearAllWithUndo: () => void;
}

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
