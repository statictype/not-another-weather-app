import { ClockIcon, Trash2Icon, XIcon } from "lucide-react";
import { useId, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { HistoryItem } from "@/hooks/use-history";

interface HistoryListProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onRemove: (item: HistoryItem) => void;
  onClearAll: () => void;
}

/**
 * Recent searches list.
 *
 * Each row is two *sibling* buttons (never nested — invalid HTML):
 *   1. Primary: load this city
 *   2. Secondary: remove from history
 *
 * After delete-via-keyboard the focused button vanishes; we move focus
 * to the next item (or the heading if the list is now empty) so screen
 * reader and keyboard users don't lose their place.
 */
export function HistoryList({ items, onSelect, onRemove, onClearAll }: HistoryListProps) {
  const headingId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  if (items.length === 0) {
    return null;
  }

  function handleRemove(item: HistoryItem, currentIndex: number) {
    onRemove(item);
    // Move focus to the next item, or the previous if we removed the last.
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[data-history-primary="true"]',
      );
      if (!buttons || buttons.length === 0) return;
      const nextIndex = Math.min(currentIndex, buttons.length - 1);
      buttons[nextIndex]?.focus();
    });
  }

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex items-center justify-between">
        <h2
          id={headingId}
          className="text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-wider"
        >
          <ClockIcon className="size-3.5" aria-hidden="true" />
          Recent
        </h2>
        <ClearAllButton onConfirm={onClearAll} />
      </div>
      <ul ref={listRef} className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="bg-secondary/40 hover:bg-secondary group inline-flex items-center rounded-full transition-colors"
          >
            <button
              type="button"
              data-history-primary="true"
              onClick={() => onSelect(item)}
              className="rounded-l-full py-1.5 pl-4 pr-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Load weather for ${item.displayName}`}
            >
              {item.displayName}
            </button>
            <button
              type="button"
              onClick={() => handleRemove(item, index)}
              className="text-muted-foreground hover:text-foreground rounded-r-full py-1.5 pl-1 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Remove ${item.displayName} from history`}
            >
              <XIcon className="size-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClearAllButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive h-7 px-2 text-xs"
        >
          <Trash2Icon className="size-3.5" aria-hidden="true" />
          Clear
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all recent searches?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes every entry from your history. You'll be able to undo for a few seconds.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Clear all</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
