import { TabButton } from "@/components/tab-button";
import { useUnitSystemControl } from "@/hooks/use-unit-system";

export function UnitToggle() {
  const [system, setSystem] = useUnitSystemControl();

  return (
    <div role="group" aria-label="Units" className="flex shrink-0 flex-row items-center gap-0.5">
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
    </div>
  );
}
