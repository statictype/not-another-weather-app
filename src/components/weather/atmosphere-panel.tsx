import { EyeIcon, GaugeIcon, type LucideIcon } from "lucide-react";

interface AtmospherePanelProps {
  pressureMb: number;
  visibilityKm: number;
}

export function AtmospherePanel({
  pressureMb,
  visibilityKm,
}: AtmospherePanelProps) {
  return (
    <section className="swap-in swap-d-4 tile-wind bento-tile relative overflow-hidden p-6 sm:col-span-6 xl:col-span-3">
      <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
        Atmosphere
      </p>

      <div className="mt-4 grid grid-cols-2 gap-5">
        <Stat
          icon={GaugeIcon}
          label="Pressure"
          value={Math.round(pressureMb).toString()}
          unit="mb"
          qualifier={pressureLabel(pressureMb)}
        />
        <Stat
          icon={EyeIcon}
          label="Visibility"
          value={Math.round(visibilityKm).toString()}
          unit="km"
          qualifier={visibilityLabel(visibilityKm)}
        />
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  qualifier,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  qualifier: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon
          className="size-4 text-foreground/55"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="font-display text-xs font-medium uppercase tracking-[0.16em] text-foreground/60">
          {label}
        </p>
      </div>
      <p className="font-display mt-3 text-4xl leading-[0.9] tracking-tight">
        {value}
        <span className="ml-1.5 text-base text-foreground/50">{unit}</span>
      </p>
      <p className="font-display mt-1.5 text-sm tracking-tight text-foreground/55">
        {qualifier}
      </p>
    </div>
  );
}

function pressureLabel(mb: number): string {
  if (mb < 1000) return "Low";
  if (mb < 1013) return "Below normal";
  if (mb <= 1022) return "Normal";
  if (mb <= 1035) return "Above normal";
  return "High";
}

function visibilityLabel(km: number): string {
  if (km < 1) return "Very poor";
  if (km < 5) return "Poor";
  if (km < 10) return "Moderate";
  if (km <= 20) return "Clear";
  return "Excellent";
}
