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
    <section aria-labelledby={headingId}>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2
          id={headingId}
          className="font-display font-normal text-foreground/60 flex items-center gap-2 text-xs uppercase tracking-[0.2em]"
        >
          <ClockIcon className="size-5" strokeWidth={1.75} aria-hidden="true" />
          Recent
        </h2>
        <ClearAllButton onConfirm={onClearAll} />
      </div>
      <ul ref={listRef} className="flex flex-wrap gap-2.5">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="group relative inline-flex items-stretch overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-[0_10px_24px_-12px_rgba(56,140,255,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:from-sky-500 hover:to-blue-600 hover:shadow-[0_18px_32px_-12px_rgba(56,140,255,0.7)]"
          >
            <button
              type="button"
              data-history-primary="true"
              onClick={() => onSelect(item)}
              className="font-display font-normal flex items-center gap-2 py-2.5 pl-4 pr-3 text-base tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label={`Load weather for ${item.displayName}`}
            >
              {item.displayName}
            </button>
            <button
              type="button"
              onClick={() => handleRemove(item, index)}
              className="flex items-center justify-center pr-3 pl-1 text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label={`Remove ${item.displayName} from history`}
            >
              <XIcon className="size-4" strokeWidth={3} aria-hidden="true" />
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
          className="text-foreground/60 hover:text-destructive h-7 px-2 text-xs uppercase tracking-wider"
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
