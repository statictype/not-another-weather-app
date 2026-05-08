import { WindIcon } from "lucide-react";

interface WindCardProps {
  windKph: number;
  windDir: string;
  gustKph: number;
}

export function WindCard({ windKph, windDir, gustKph }: WindCardProps) {
  return (
    <section className="swap-in swap-d-4 tile-wind bento-tile relative overflow-hidden p-7 sm:col-span-8 xl:col-span-4">
      <WindIcon
        className="text-foreground/15 absolute -right-10 -top-10 size-36"
        strokeWidth={0.8}
        aria-hidden="true"
      />
      <TileLabel>Wind</TileLabel>
      <div className="relative mt-3 flex items-baseline gap-2">
        <span className="font-display text-5xl leading-[0.85] tracking-tight">
          {Math.round(windKph)}
        </span>
        <span className="font-display font-light text-foreground/55 text-base">km/h</span>
      </div>
      <p className="font-display font-normal text-foreground/55 mt-1.5 text-[10px] uppercase tracking-[0.18em] 2xl:text-xs">
        {beaufort(windKph)}
      </p>
      <div className="relative mt-5 grid grid-cols-3 gap-3 border-t border-foreground/6 pt-4">
        <Stat label="Direction" value={windDir} sub={compassDegrees(windDir)} />
        <Stat label="Gusts" value={`${Math.round(gustKph)}`} sub="km/h" />
        <Stat label="In mph" value={`${Math.round(windKph * 0.621371)}`} sub="mph" />
      </div>
    </section>
  );
}

function TileLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display font-normal text-foreground/55 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] 2xl:text-xs">
      {children}
    </p>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="font-display font-normal text-foreground/55 text-[10px] uppercase tracking-[0.18em]">
        {label}
      </p>
      <p className="font-display mt-0.5 text-lg tracking-tight">
        {value}
        {sub && (
          <span className="font-display font-light text-foreground/45 ml-1 text-sm">{sub}</span>
        )}
      </p>
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

function compassDegrees(dir: string): string {
  const map: Record<string, number> = {
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5,
  };
  const deg = map[dir.toUpperCase()];
  return deg !== undefined ? `${deg}°` : "";
}
