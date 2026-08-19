import type { LucideIcon } from "lucide-react";
import type { Ref } from "react";
import { GLYPH_SIZE, GLYPH_STROKE, ICON_BUTTON, NAV_PANEL_ID } from "./contract";

interface NavTriggerProps {
  icon: LucideIcon;
  label: string;
  isOpen: boolean;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}

export function NavTrigger({ icon: Icon, label, isOpen, onClick, ref }: NavTriggerProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={isOpen}
      aria-controls={NAV_PANEL_ID}
      className="flex shrink-0 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
      style={{ width: ICON_BUTTON, height: ICON_BUTTON }}
    >
      <Icon size={GLYPH_SIZE} strokeWidth={GLYPH_STROKE} aria-hidden="true" className="shrink-0" />
    </button>
  );
}
