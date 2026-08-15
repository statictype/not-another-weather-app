import { motion } from "motion/react";
import { TabButton } from "@/components/tab-button";
import { useUnitSystemControl } from "@/hooks/use-unit-system";

interface UnitToggleProps {
  /** The mobile search overlay spans the full header, so the toggle gives its
   *  width back for as long as that surface is open. */
  collapsed: boolean;
}

const collapseTransition = { type: "spring" as const, stiffness: 400, damping: 30 };

export function UnitToggle({ collapsed }: UnitToggleProps) {
  const [system, setSystem] = useUnitSystemControl();

  return (
    <motion.div
      role="group"
      aria-label="Units"
      className="flex shrink-0 items-center gap-0.5 overflow-hidden"
      initial={false}
      animate={{ width: collapsed ? 0 : "auto", opacity: collapsed ? 0 : 1 }}
      transition={collapseTransition}
    >
      <TabButton
        active={system === "metric"}
        onClick={() => setSystem("metric")}
        label="Metric units"
      >
        <span className="text-sm tracking-tight">°C</span>
      </TabButton>
      <TabButton
        active={system === "imperial"}
        onClick={() => setSystem("imperial")}
        label="Imperial units"
      >
        <span className="text-sm tracking-tight">°F</span>
      </TabButton>
    </motion.div>
  );
}
