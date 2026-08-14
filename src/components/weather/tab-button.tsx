import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}

export function TabButton({ active, onClick, label, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-9 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-foreground/10 text-foreground"
          : "text-foreground/55 hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
