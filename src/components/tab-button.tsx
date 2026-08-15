import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}

/** `min-w-9` with `px-2` keeps an 18px icon child on a 36px square and lets a
 *  text child set its own width. */
export function TabButton({ active, onClick, label, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-9 min-w-9 items-center justify-center rounded-full px-2 transition-colors",
        active
          ? "bg-foreground/10 text-foreground"
          : "text-foreground/55 hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
