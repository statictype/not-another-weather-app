import { useId } from "react";

interface PressureCardProps {
  pressureMb: number;
}

export function PressureCard({ pressureMb }: PressureCardProps) {
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
    <section className="swap-in swap-d-8 bento-tile flex flex-col p-6 sm:col-span-4 lg:col-span-2 xl:order-8 xl:col-span-1">
      <p className="label-section">Pressure</p>
      <div className="flex flex-1 flex-col justify-center">
        <div className="relative mx-auto mt-2 w-full max-w-[260px]">
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
    </section>
  );
}

function pressureLabel(mb: number): string {
  if (mb < 1000) return "Low";
  if (mb < 1013) return "Below normal";
  if (mb <= 1022) return "Normal";
  if (mb <= 1035) return "Above normal";
  return "High";
}
