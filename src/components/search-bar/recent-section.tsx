import { FileTextIcon, Trash2Icon, XIcon } from "lucide-react";
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
import { SectionHeader } from "./section-header";

interface RecentSectionProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onRemove: (item: HistoryItem) => void;
  onClearAll: () => void;
}

export function RecentSection({ items, onSelect, onRemove, onClearAll }: RecentSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <SectionHeader label="Recent" />
        <ClearAllButton onConfirm={onClearAll} />
      </div>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            key={item.id}
            className="group hover:bg-muted flex items-center gap-3 rounded-2xl px-3 py-2.5"
          >
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
              className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none"
              aria-label={`Load weather for ${item.displayName}`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-foreground/15 text-foreground/60">
                <FileTextIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="font-display font-normal text-base text-foreground tracking-tight">
                {item.displayName}
              </span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onRemove(item);
              }}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-foreground/40 opacity-0 transition hover:bg-foreground/10 hover:text-foreground/80 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
              aria-label={`Remove ${item.displayName} from history`}
            >
              <XIcon className="size-4" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClearAllButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          className="text-foreground/55 hover:text-destructive h-7 px-2 text-xs uppercase tracking-wider"
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
