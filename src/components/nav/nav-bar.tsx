import { SearchIcon, SettingsIcon } from "lucide-react";
import type { Ref } from "react";
import { cn } from "@/lib/utils";
import { LOGO_BOX, type NavPlacement } from "./contract";
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
 * The bar's contents. The container's box is `barGeometry(placement)`; what
 * changes here is only the axis — the mark leads, the triggers trail, which on
 * the rail reads top and bottom.
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
        "flex h-full w-full items-center justify-between",
        isRail ? "flex-col py-1.5" : "flex-row px-1.5",
      )}
    >
      <NavMark />
      <div className={cn("flex items-center gap-0.5", isRail ? "flex-col" : "flex-row")}>
        <NavTrigger
          ref={searchRef}
          icon={SearchIcon}
          label="Search"
          isOpen={isOpen}
          onClick={onOpenSearch}
        />
        <NavTrigger
          ref={settingsRef}
          icon={SettingsIcon}
          label="Settings"
          isOpen={isOpen}
          onClick={onOpenSettings}
        />
      </div>
    </div>
  );
}

/** The page's only `<h1>`, non-interactive, in the bar and in the open panel
 *  alike. Branding is out of scope — the placeholder stands. */
export function NavMark() {
  return (
    <h1
      className="flex shrink-0 items-center justify-center leading-none"
      style={{ width: LOGO_BOX, height: LOGO_BOX }}
      aria-label="Weather"
    >
      <span aria-hidden="true" className="text-2xl">
        😶‍🌫️
      </span>
    </h1>
  );
}
