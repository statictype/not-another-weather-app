import { Trash2Icon } from "lucide-react";
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

interface ClearAllButtonProps {
  onConfirm: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClearAllButton({ onConfirm, open, onOpenChange }: ClearAllButtonProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          className="h-7 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/30 transition-colors hover:text-destructive/70"
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

export default ClearAllButton;
