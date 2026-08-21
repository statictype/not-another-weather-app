import { SearchIcon } from "lucide-react";
import type { Ref } from "react";
import { cn } from "@/lib/utils";
import type { NavPlacement } from "./contract";
import { NavTrigger } from "./nav-trigger";
import { NavUnitToggle } from "./nav-unit-toggle";

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
      <NavUnitToggle vertical={isRail} />
    </div>
  );
}
