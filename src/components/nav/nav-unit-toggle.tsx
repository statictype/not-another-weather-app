import { motion } from "motion/react";
import { useUnitSystemControl } from "@/hooks/use-unit-system";
import { PILL_SPRING } from "@/lib/motion/constants";
import type { UnitSystem } from "@/lib/units";
import { cn } from "@/lib/utils";
import { ICON_BUTTON } from "./contract";

const OPTIONS: readonly { system: UnitSystem; glyph: string; label: string }[] = [
  { system: "metric", glyph: "°C", label: "Metric units" },
  { system: "imperial", glyph: "°F", label: "Imperial units" },
];

/**
 * The unit switch, in the bar at every placement. Two controls of the nav's own
 * 44 px family, laid along the bar's long axis — a column on the rail, a row on
 * the top and bottom bars. The active well is one node moving between them, so
 * the switch reads as one control rather than two independent buttons.
 */
export function NavUnitToggle({ vertical }: { vertical: boolean }) {
  const [system, setSystem] = useUnitSystemControl();

  return (
    <div
      role="group"
      aria-label="Units"
      className={cn("flex shrink-0 items-center gap-0.5", vertical ? "flex-col" : "flex-row")}
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
            style={{ width: ICON_BUTTON, height: ICON_BUTTON }}
            className={cn(
              "relative flex shrink-0 items-center justify-center rounded-full outline-none",
              "transition-[color,transform] duration-150 active:scale-95",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active ? "text-foreground" : "text-foreground/55 hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-unit-well"
                aria-hidden="true"
                className="bg-foreground/10 absolute inset-0 rounded-full"
                transition={PILL_SPRING}
              />
            )}
            <span className="relative text-[13px] font-medium tracking-tight tabular-nums">
              {option.glyph}
            </span>
          </button>
        );
      })}
    </div>
  );
}
