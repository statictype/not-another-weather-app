import {
  BubblesIcon,
  DropletsIcon,
  EyeIcon,
  MilestoneIcon,
} from "lucide-react";
import type { ReactNode } from "react";

interface AirComfortCardProps {
  dewpointC: number;
  humidity: number;
  windKph: number;
  windDir: string;
  visibilityKm: number;
}

export function AirComfortCard({
  dewpointC,
  humidity,
  windKph,
  windDir,
  visibilityKm,
}: AirComfortCardProps) {
  return (
    <section className="swap-in swap-d-4 tile-wind bento-tile relative overflow-hidden p-6 sm:col-span-6 xl:col-span-3">
      <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
        Air
      </p>

      <dl className="mt-4 divide-y divide-foreground/10">
        <Metric
          icon={
            <BubblesIcon
              className="size-4 text-foreground/55"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          }
          label="Dew"
          value={`${Math.round(dewpointC)}°`}
        />
        <Metric
          icon={
            <DropletsIcon
              className="size-4 text-foreground/55"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          }
          label="Humidity"
          value={`${humidity}%`}
        />
        <Metric
          icon={
            <MilestoneIcon
              className="size-4 text-foreground/55"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          }
          label="Wind"
          value={`${Math.round(windKph)} km/h ${windDir}`}
        />
        <Metric
          icon={
            <EyeIcon
              className="size-4 text-foreground/55"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          }
          label="Visibility"
          value={`${Math.round(visibilityKm)} km`}
        />
      </dl>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-2.5">
        {icon}
        <dt className="font-display text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/60">
          {label}
        </dt>
      </div>
      <dd className="font-display text-sm tracking-tight">{value}</dd>
    </div>
  );
}
