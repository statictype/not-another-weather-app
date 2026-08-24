import { motion } from "motion/react";
import { useUnitSystemControl } from "@/hooks/use-unit-system";
import { PILL_SPRING } from "@/lib/motion/constants";
import type { UnitSystem } from "@/lib/units";
import { cn } from "@/lib/utils";
import { BAR_THICKNESS } from "./contract";

const OPTIONS: readonly { system: UnitSystem; glyph: string; label: string }[] = [
  { system: "metric", glyph: "°C", label: "Metric units" },
  { system: "imperial", glyph: "°F", label: "Imperial units" },
];

/**
 * The unit switch, in the bar at every placement. Two slots the full thickness
 * of the bar, laid along the bar's long axis — stacked on the rail, side by
 * side on the top and bottom bars. The plate behind the active slot is one node
 * moving between the two, so the switch reads as one control rather than two
 * buttons.
 */
export function NavUnitToggle({ vertical }: { vertical: boolean }) {
  const [system, setSystem] = useUnitSystemControl();

  return (
    <div
      role="group"
      aria-label="Units"
      className={cn("unit-switch flex shrink-0 items-center", vertical ? "flex-col" : "flex-row")}
    >
      {OPTIONS.map((option) => {
        const active = system === option.system;
        return (
          <button
            key={option.system}
            type="button"
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => setSystem(option.system)}
            style={{ width: BAR_THICKNESS, height: BAR_THICKNESS }}
            className={cn(
              "unit-switch-option relative flex shrink-0 items-center justify-center",
              "transition-[color,transform] duration-150 active:scale-95",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-unit-plate"
                aria-hidden="true"
                className="unit-switch-plate absolute inset-1.5"
                transition={PILL_SPRING}
              />
            )}
            <span className="relative text-[13px] font-normal tracking-tight tabular-nums">
              {option.glyph}
            </span>
          </button>
        );
      })}
    </div>
  );
}
