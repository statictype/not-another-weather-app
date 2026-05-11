import { airComfort, type AirLabel, type ThermalLabel } from "@/lib/air-comfort";

interface AirComfortCardProps {
  tempC: number;
  feelsLikeC: number;
  dewpointC: number;
  humidity: number;
}

export function AirComfortCard({
  tempC,
  feelsLikeC,
  dewpointC,
  humidity,
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

      <div className="mt-auto flex items-baseline gap-5 border-t border-foreground/10 pt-4">
        <FooterStat label="Dew" value={`${Math.round(dewpointC)}°`} />
        <FooterStat label="Humidity" value={`${humidity}%`} />
      </div>
    </section>
  );
}

function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-xs font-medium uppercase tracking-wider text-foreground/50">
        {label}
      </span>
      <span className="font-display text-sm tracking-tight">{value}</span>
    </div>
  );
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
