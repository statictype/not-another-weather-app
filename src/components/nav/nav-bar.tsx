import { SearchIcon } from "lucide-react";
import type { Ref } from "react";
import { cn } from "@/lib/utils";
import { BAR_END_INSET, BAR_THICKNESS, type NavPlacement } from "./contract";
import { NavTrigger } from "./nav-trigger";
import { NavUnitToggle } from "./nav-unit-toggle";

/** Between the search cell and the unit pair. The two unit cells are adjacent,
 *  so this gap is the only thing grouping them. */
const GROUP_GAP = BAR_THICKNESS / 2;

interface NavBarProps {
  placement: NavPlacement;
  isOpen: boolean;
  onOpenSearch: () => void;
  searchRef: Ref<HTMLButtonElement>;
}

export function NavBar({ placement, isOpen, onOpenSearch, searchRef }: NavBarProps) {
  const isRail = placement.edge === "left";

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-end",
        isRail ? "flex-col" : "flex-row",
      )}
      style={{
        gap: GROUP_GAP,
        [isRail ? "paddingBottom" : "paddingRight"]: BAR_END_INSET,
      }}
    >
      <NavTrigger
        ref={searchRef}
        icon={SearchIcon}
        label="Search"
        isOpen={isOpen}
        onClick={onOpenSearch}
      />
      <NavUnitToggle vertical={isRail} />
    </div>
  );
}
