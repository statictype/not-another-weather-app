import { SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import type { Ref } from "react";
import { cn } from "@/lib/utils";
import type { NavPlacement } from "./contract";
import { NavTrigger } from "./nav-trigger";

interface NavBarProps {
  placement: NavPlacement;
  isOpen: boolean;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  searchRef: Ref<HTMLButtonElement>;
  settingsRef: Ref<HTMLButtonElement>;
}

/**
 * The bar's controls. The mark holds the leading corner as its own layer, so
 * what is left here is the trailing group — which on the rail reads as the
 * bottom of the column.
 */
export function NavBar({
  placement,
  isOpen,
  onOpenSearch,
  onOpenSettings,
  searchRef,
  settingsRef,
}: NavBarProps) {
  const isRail = placement.edge === "left";

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-end gap-1",
        isRail ? "flex-col py-1.5" : "flex-row px-1.5",
      )}
    >
      <NavTrigger
        ref={searchRef}
        icon={SearchIcon}
        label="Search"
        isOpen={isOpen}
        onClick={onOpenSearch}
      />
      <NavTrigger
        ref={settingsRef}
        icon={SlidersHorizontalIcon}
        label="Settings"
        isOpen={isOpen}
        onClick={onOpenSettings}
      />
    </div>
  );
}
