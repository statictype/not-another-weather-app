import { EyeIcon, GaugeIcon, WindIcon } from "lucide-react";

interface AtmospherePanelProps {
  windKph: number;
  windDir: string;
  pressureMb: number;
  visibilityKm: number;
}

export function AtmospherePanel({
  windKph,
  windDir,
  pressureMb,
  visibilityKm,
}: AtmospherePanelProps) {
  return (
    <section className="swap-in swap-d-4 tile-wind bento-tile relative overflow-hidden p-6 sm:col-span-6 xl:col-span-4">
      <div className="flex items-center gap-2">
        <WindIcon
          className="size-4 text-foreground/50"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
          Wind
        </p>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-5xl leading-[0.85] tracking-tight">
          {Math.round(windKph)}
        </span>
        <span className="font-display text-base text-foreground/55">km/h</span>
        <span className="font-display text-lg tracking-tight text-foreground/70">
          {windDir}
          <span className="ml-1 text-sm text-foreground/40">
            {compassDegrees(windDir)}
          </span>
        </span>
      </div>
      <p className="font-display mt-1 text-sm tracking-tight text-foreground/50">
        {beaufort(windKph)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-foreground/[0.04] p-3">
          <div className="flex items-center gap-1.5">
            <GaugeIcon
              className="size-4 text-foreground/45"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="font-display text-xs font-medium uppercase tracking-wide text-foreground/55">
              Pressure
            </p>
          </div>
          <p className="font-display mt-1.5 text-lg tracking-tight">
            {Math.round(pressureMb)}{" "}
            <span className="text-sm text-foreground/50">mb</span>
          </p>
          <p className="font-display text-sm tracking-tight text-foreground/55">
            {pressureLabel(pressureMb)}
          </p>
        </div>

        <div className="rounded-2xl bg-foreground/[0.04] p-3">
          <div className="flex items-center gap-1.5">
            <EyeIcon
              className="size-4 text-foreground/45"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="font-display text-xs font-medium uppercase tracking-wide text-foreground/55">
              Visibility
            </p>
          </div>
          <p className="font-display mt-1.5 text-lg tracking-tight">
            {Math.round(visibilityKm)}{" "}
            <span className="text-sm text-foreground/50">km</span>
          </p>
          <p className="font-display text-sm tracking-tight text-foreground/55">
            {visibilityLabel(visibilityKm)}
          </p>
        </div>
      </div>
    </section>
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

function compassDegrees(dir: string): string {
  const map: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
    E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  const deg = map[dir.toUpperCase()];
  return deg !== undefined ? `${deg}°` : "";
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
