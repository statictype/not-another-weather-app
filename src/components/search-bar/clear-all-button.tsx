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

interface ClearAllButtonProps {
  onConfirm: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClearAllButton({ onConfirm, open, onOpenChange }: ClearAllButtonProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          className="label-section flex items-center gap-1.5 transition-colors hover:text-destructive"
        >
          <Trash2Icon className="size-3" aria-hidden="true" />
          Clear
        </button>
      </AlertDialogTrigger>
      {/* The panel is the same glass as the two content dialogs, at the same
          2.25rem radius. `signal-red` is licensed for destructive confirmation,
          so the committing button takes it — the vendored default put the
          product's interactive blue on "delete everything". */}
      <AlertDialogContent className="glass-panel dialog-panel gap-5 rounded-[2.25rem] border-0 p-6 text-foreground data-[size=default]:sm:max-w-md sm:p-8">
        <AlertDialogHeader className="gap-2 place-items-start text-left">
          <AlertDialogTitle className="text-xl font-light tracking-tight">
            Clear all recent searches?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-foreground/70">
            This removes every entry from your history. You'll be able to undo for a few seconds.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          {/* Ghost plus a rim. The `outline` variant fills with `bg-background`,
              which is opaque and would sit as a solid chip on the glass. */}
          <AlertDialogCancel variant="ghost" className="border border-foreground/15">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Clear all
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ClearAllButton;
