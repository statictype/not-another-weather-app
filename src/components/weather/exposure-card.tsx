import { cn } from "@/lib/utils";

interface ExposureCardProps {
  uv: number;
  airQualityIndex: number | null;
  isDay: boolean;
}

export function ExposureCard({
  uv,
  airQualityIndex,
  isDay,
}: ExposureCardProps) {
  return (
    <section className="swap-in swap-d-6 bento-tile flex flex-col p-6 sm:col-span-6 xl:col-span-3">
      <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
        UV &amp; Air
      </p>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        <MetricRow
          label="UV Index"
          value={isDay ? Math.round(uv) : null}
          tag={isDay ? uvLabel(uv) : "Nighttime"}
          scale={isDay ? uvScale(uv) : null}
          dim={!isDay}
        />
        <div className="h-px bg-foreground/8" />
        <MetricRow
          label="Air Quality"
          value={airQualityIndex}
          tag={
            airQualityIndex == null ? "Not available" : aqiLabel(airQualityIndex)
          }
          scale={airQualityIndex == null ? null : aqiScale(airQualityIndex)}
          dim={airQualityIndex == null}
        />
      </div>
    </section>
  );
}

interface Scale {
  pct: number;
  gradient: string;
}

function MetricRow({
  label,
  value,
  tag,
  scale,
  dim,
}: {
  label: string;
  value: number | null;
  tag: string;
  scale: Scale | null;
  dim: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", dim && "opacity-55")}>
      <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl leading-[0.85] tracking-tight">
          {value ?? "—"}
        </span>
        <span className="font-display text-sm tracking-tight text-foreground/65">
          {tag}
        </span>
      </div>
      <div className="relative mt-1 h-1.5 overflow-hidden rounded-full">
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            !scale && "bg-foreground/6",
          )}
          style={scale ? { background: scale.gradient } : undefined}
        />
        {scale && (
          <div
            className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_2px_rgba(0,0,0,0.18)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{
              left: `clamp(0px, calc(${scale.pct}% - 6px), calc(100% - 12px))`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function uvLabel(uv: number): string {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

function uvScale(uv: number): Scale {
  const pct = (Math.min(uv, 11) / 11) * 100;
  return {
    pct,
    gradient:
      "linear-gradient(to right, #4ade80, #a3e635, #facc15, #fb923c, #ef4444, #a855f7)",
  };
}

function aqiLabel(epa: number): string {
  switch (epa) {
    case 1:
      return "Good";
    case 2:
      return "Moderate";
    case 3:
      return "Sensitive";
    case 4:
      return "Unhealthy";
    case 5:
      return "Very unhealthy";
    case 6:
      return "Hazardous";
    default:
      return "—";
  }
}

function aqiScale(epa: number): Scale {
  const clamped = Math.max(1, Math.min(6, epa));
  const pct = ((clamped - 0.5) / 6) * 100;
  return {
    pct,
    gradient:
      "linear-gradient(to right, #4ade80, #facc15, #fb923c, #ef4444, #a855f7, #7e22ce)",
  };
}
