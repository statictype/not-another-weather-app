import { BubblesIcon, DropletsIcon, MilestoneIcon, WindIcon } from "lucide-react";
import type { ReactNode } from "react";
import { airComfort, type AirLabel, type ThermalLabel } from "@/lib/air-comfort";

interface AirComfortCardProps {
  tempC: number;
  feelsLikeC: number;
  dewpointC: number;
  humidity: number;
  windKph: number;
  windDir: string;
}

export function AirComfortCard({
  tempC,
  feelsLikeC,
  dewpointC,
  humidity,
  windKph,
  windDir,
}: AirComfortCardProps) {
  const { sentence, thermal, air } = airComfort({
    tempC,
    feelsLikeC,
    dewpointC,
    humidity,
  });

  const bucket = THERMAL_BUCKET[thermal];
  const pct = AIR_HUMID_PCT[air];
  const base = `color-mix(in oklch, color-mix(in oklch, var(--ac-dry), var(--ac-humid) ${pct}%), black var(--ac-base-darken))`;

  return (
    <section
      className={`ac-${bucket} swap-in swap-d-5 bento-tile relative flex flex-col overflow-hidden p-6 sm:col-span-6 xl:col-span-3`}
      style={{
        background: `linear-gradient(160deg,
          color-mix(in oklch, ${base}, white var(--ac-lift)) 0%,
          ${base} 45%,
          color-mix(in oklch, ${base}, black var(--ac-shadow)) 100%)`,
      }}
    >
      <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
        Air comfort
      </p>

      <p className="font-display mt-4 text-balance text-2xl leading-tight tracking-tight">
        {sentence}
      </p>
      <div className="font-display mt-1.5 flex items-center gap-2 text-base tracking-tight text-foreground/55">
        <WindIcon
          className="size-4 shrink-0"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span>{beaufort(windKph)}</span>
      </div>

      <dl className="mt-5 divide-y divide-foreground/10">
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

function beaufort(kph: number): string {
  if (kph < 1) return "Calm";
  if (kph < 6) return "Light air";
  if (kph < 12) return "Light breeze";
  if (kph < 20) return "Gentle breeze";
  if (kph < 29) return "Moderate breeze";
  if (kph < 39) return "Fresh breeze";
  if (kph < 50) return "Strong breeze";
  if (kph < 62) return "Near gale";
  if (kph < 75) return "Gale";
  if (kph < 89) return "Strong gale";
  if (kph < 103) return "Storm";
  if (kph < 118) return "Violent storm";
  return "Hurricane";
}

type Bucket = "red" | "orange" | "yellow" | "green" | "blue" | "silver";

const THERMAL_BUCKET: Record<ThermalLabel, Bucket> = {
  "Dangerously hot": "red",
  "Very hot":        "red",
  "Hot":             "orange",
  "Warm":            "yellow",
  "Mild":            "green",
  "Cool":            "blue",
  "Chilly":          "blue",
  "Cold":            "silver",
  "Very cold":       "silver",
};

const AIR_HUMID_PCT: Record<AirLabel, number> = {
  "Very dry":        0,
  "Dry":            15,
  "Slightly dry":   30,
  "Comfortable":    50,
  "Slightly humid": 65,
  "Humid":          80,
  "Very humid":    100,
  "Damp":           90,
};
