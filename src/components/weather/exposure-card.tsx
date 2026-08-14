import { useId } from "react";
import { cn } from "@/lib/utils";

interface ExposureCardProps {
  uv: number;
  airQualityIndex: number | null;
  pressureMb: number;
  isDay: boolean;
}

export function ExposureCard({ uv, airQualityIndex, pressureMb, isDay }: ExposureCardProps) {
  return (
    <section className="swap-in swap-d-6 bento-tile flex flex-col p-6 sm:col-span-4 xl:order-6 xl:col-span-3">
      <div className="flex flex-1 flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex flex-1 flex-col gap-4 xl:contents">
          <MetricRow
            label="UV Index"
            value={isDay ? Math.round(uv) : null}
            tag={isDay ? uvLabel(uv) : "Nighttime"}
            scale={isDay ? uvScale(uv) : null}
            dim={!isDay}
          />
          <Rule />
          <MetricRow
            label="Air Quality"
            value={airQualityIndex}
            tag={airQualityIndex == null ? "Not available" : aqiLabel(airQualityIndex)}
            scale={airQualityIndex == null ? null : aqiScale(airQualityIndex)}
            dim={airQualityIndex == null}
          />
        </div>
        <Rule className="hidden xl:block" />
        <PressureGauge pressureMb={pressureMb} />
      </div>
    </section>
  );
}

interface Scale {
  pct: number;
  gradient: string;
}

function Rule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-px w-full shrink-0 self-stretch bg-foreground/8 xl:h-auto xl:w-px",
        className,
      )}
    />
  );
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
    <div className={cn("flex flex-col gap-1.5 xl:flex-1", dim && "opacity-55")}>
      <p className="label-section">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl leading-[0.85] tracking-tight">{value ?? "—"}</span>
        <span className="text-sm tracking-tight text-foreground/70">{tag}</span>
      </div>
      <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/6">
        {scale && (
          <div
            className="absolute inset-0 rounded-full transition-[clip-path] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{
              background: scale.gradient,
              clipPath: `inset(0 ${100 - scale.pct}% 0 0)`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function PressureGauge({ pressureMb }: { pressureMb: number }) {
  // 980–1050 mb across the half-circle, so 1013–1022 sits under the apex.
  const PRESSURE_MIN = 980;
  const PRESSURE_MAX = 1050;
  const clamped = Math.max(PRESSURE_MIN, Math.min(PRESSURE_MAX, pressureMb));
  const pct = (clamped - PRESSURE_MIN) / (PRESSURE_MAX - PRESSURE_MIN);

  const CX = 110;
  const CY = 110;
  const R = 90;
  const ARC_LEN = Math.PI * R;

  const uid = useId();
  const gradId = `${uid}-pressure-grad`;
  const arcPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  return (
    <div className="relative flex w-full flex-col sm:w-[240px] sm:shrink-0 sm:self-center xl:w-auto xl:max-w-[260px] xl:flex-1">
      <p className="label-section">Pressure</p>
      <div className="relative mt-2 w-full">
        <svg viewBox="0 0 220 130" className="block w-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#1e3a8a" />
              <stop offset="0.07" stopColor="#3b82f6" />
              <stop offset="0.30" stopColor="#06b6d4" />
              <stop offset="0.47" stopColor="#4ade80" />
              <stop offset="0.60" stopColor="#4ade80" />
              <stop offset="0.78" stopColor="#facc15" />
              <stop offset="0.92" stopColor="#fb923c" />
              <stop offset="1" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          <path
            d={arcPath}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d={arcPath}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${pct * ARC_LEN} ${ARC_LEN}`}
            style={{
              transition: "stroke-dasharray 700ms cubic-bezier(0.32,0.72,0,1)",
            }}
          />
        </svg>

        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center">
          <p className="text-2xl leading-none tracking-tight">
            {Math.round(pressureMb)}
            <span className="ml-1.5 text-sm text-foreground/70">mb</span>
          </p>
          <p className="mt-1 text-xs tracking-tight text-foreground/70">
            {pressureLabel(pressureMb)}
          </p>
        </div>

        <div className="label-sub mt-1 flex justify-between px-1">
          <span>{PRESSURE_MIN}</span>
          <span>{PRESSURE_MAX}</span>
        </div>
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
      "linear-gradient(to right, oklch(0.8003 0.1821 151.71) 0%, oklch(0.8493 0.2073 128.85) 20%, oklch(0.8606 0.1731 91.94) 40%, oklch(0.7576 0.1590 55.93) 60%, oklch(0.6368 0.2078 25.33) 88%, oklch(0.3958 0.1331 25.72) 100%)",
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
      "linear-gradient(to right, oklch(0.8003 0.1821 151.71) 0%, oklch(0.8606 0.1731 91.94) 25%, oklch(0.7576 0.1590 55.93) 50%, oklch(0.6368 0.2078 25.33) 75%, oklch(0.5054 0.1905 27.52) 90%, oklch(0.3958 0.1331 25.72) 100%)",
  };
}

function pressureLabel(mb: number): string {
  if (mb < 1000) return "Low";
  if (mb < 1013) return "Below normal";
  if (mb <= 1022) return "Normal";
  if (mb <= 1035) return "Above normal";
  return "High";
}
