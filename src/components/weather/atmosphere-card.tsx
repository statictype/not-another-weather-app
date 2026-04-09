import {
  BubblesIcon,
  CloudIcon,
  DropletsIcon,
  EyeIcon,
  GaugeIcon,
  type LucideIcon,
} from "lucide-react";
import type { CurrentConditions } from "@/api/types";

interface AtmosphereCardProps {
  humidity: number;
  cloud: number;
  pressureMb: number;
  dewpointC: number;
  visibilityKm: number;
}

export function AtmosphereCard({
  humidity,
  cloud,
  pressureMb,
  dewpointC,
  visibilityKm,
}: AtmosphereCardProps) {
  return (
    <section className="swap-in swap-d-2 bento-tile flex flex-col p-7 sm:col-span-6 sm:row-span-2 xl:col-span-4 xl:row-span-1">
      <ul className="flex flex-1 flex-col divide-y divide-foreground/10">
        <Row icon={DropletsIcon} label="Humidity" value={`${humidity}%`} />
        <Row icon={CloudIcon} label="Cloud cover" value={`${cloud}%`} />
        <Row icon={GaugeIcon} label="Pressure" value={`${Math.round(pressureMb)} mb`} />
        <Row icon={BubblesIcon} label="Dew point" value={`${Math.round(dewpointC)}°`} />
        <Row icon={EyeIcon} label="Visibility" value={`${Math.round(visibilityKm)} km`} />
      </ul>
    </section>
  );
}

// Accept the full current slice to avoid threading 5 props at the call site.
export function AtmosphereCardFromCurrent({ current }: { current: CurrentConditions }) {
  return (
    <AtmosphereCard
      humidity={current.humidity}
      cloud={current.cloud}
      pressureMb={current.pressureMb}
      dewpointC={current.dewpointC}
      visibilityKm={current.visibilityKm}
    />
  );
}

function Row({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <li className="flex flex-1 items-center justify-between gap-4 py-3 first:pt-2 last:pb-0">
      <div className="flex items-center gap-3">
        <Icon className="text-foreground/55 size-6" strokeWidth={1.5} aria-hidden="true" />
        <span className="font-display font-normal text-foreground/65 text-xs uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>
      <span className="font-display text-xl tracking-tight">{value}</span>
    </li>
  );
}
