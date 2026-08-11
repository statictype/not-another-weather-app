import { useId, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import type { Astro } from "@/api/types";
import { cn } from "@/lib/utils";

type AstroView = "sun" | "moon";

interface AstroCardProps {
  astro: Astro | undefined;
}

export function AstroCard({ astro }: AstroCardProps) {
  const [view, setView] = useState<AstroView>("sun");

  return (
    <section
      className={cn(
        "swap-in swap-d-3 bento-tile relative overflow-hidden p-6 sm:col-span-6 xl:col-span-3",
        view === "sun" ? "tile-astro" : "tile-astro-moon",
      )}
    >
      <Stars />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <TabButton active={view === "sun"} onClick={() => setView("sun")} label="Show sun times">
            <SunIcon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </TabButton>
          <TabButton
            active={view === "moon"}
            onClick={() => setView("moon")}
            label="Show moon times and phase"
          >
            {astro ? (
              <MoonGlyph illumination={astro.moonIllumination} phase={astro.moonPhase} size={20} />
            ) : (
              <MoonIcon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
            )}
          </TabButton>
        </div>

        <div key={`info-${view}`} className="astro-fade min-w-0 pt-1 text-right">
          {astro ? <SideInfo view={view} astro={astro} /> : <SideInfoSkeleton />}
        </div>
      </div>

      <div key={`panel-${view}`} className="astro-fade relative mt-3">
        {view === "sun" ? (
          <ArcPanel kind="sun" rise={astro?.sunrise} set={astro?.sunset} />
        ) : (
          <ArcPanel kind="moon" rise={astro?.moonrise} set={astro?.moonset} astro={astro} />
        )}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-9 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-foreground/10 text-foreground"
          : "text-foreground/55 hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SideInfo({ view, astro }: { view: AstroView; astro: Astro }) {
  if (view === "moon") {
    return (
      <>
        <p className="truncate text-sm leading-tight tracking-tight">{astro.moonPhase}</p>
        <p className="mt-0.5 text-xs text-foreground/70">{astro.moonIllumination}% illuminated</p>
      </>
    );
  }
  return (
    <>
      <p className="label-sub">Daylight</p>
      <p className="mt-0.5 text-sm leading-tight tracking-tight">
        {computeDayLength(astro.sunrise, astro.sunset)}
      </p>
    </>
  );
}

function SideInfoSkeleton() {
  return (
    <>
      <div className="ml-auto h-4 w-24 animate-pulse rounded bg-foreground/10" aria-hidden="true" />
      <div
        className="mt-1.5 ml-auto h-3 w-16 animate-pulse rounded bg-foreground/10"
        aria-hidden="true"
      />
    </>
  );
}

interface ArcPanelProps {
  kind: "sun" | "moon";
  rise: string | undefined;
  set: string | undefined;
  astro?: Astro | undefined;
}

function ArcPanel({ kind, rise, set, astro }: ArcPanelProps) {
  const labels =
    kind === "sun" ? { rise: "Sunrise", set: "Sunset" } : { rise: "Moonrise", set: "Moonset" };

  return (
    <div>
      <Arc kind={kind} astro={astro} />
      <div className="mt-2 flex items-end justify-between">
        <div>
          {rise ? (
            <p className="text-base leading-none tracking-tight">{formatClock(rise)}</p>
          ) : (
            <Skeleton />
          )}
          <p className="label-sub mt-1">{labels.rise}</p>
        </div>
        <div className="text-right">
          {set ? (
            <p className="text-base leading-none tracking-tight">{formatClock(set)}</p>
          ) : (
            <Skeleton />
          )}
          <p className="label-sub mt-1">{labels.set}</p>
        </div>
      </div>
    </div>
  );
}

function Arc({ kind, astro }: { kind: "sun" | "moon"; astro?: Astro | undefined }) {
  const uid = useId();
  const arcGradId = `${uid}-arc`;
  const sunDiscId = `${uid}-sun-disc`;
  const sunGlowId = `${uid}-sun-glow`;
  const moonLitId = `${uid}-moon-lit`;
  const dotColor = kind === "sun" ? "oklch(0.85 0.15 65)" : "oklch(0.85 0.04 250)";

  return (
    <svg viewBox="0 0 320 116" className="block aspect-[320/116] w-full" aria-hidden="true">
      <defs>
        <linearGradient id={arcGradId} x1="0" y1="0" x2="1" y2="0">
          {kind === "sun" ? (
            <>
              <stop offset="0" stopColor="oklch(0.85 0.15 65)" stopOpacity="0" />
              <stop offset="0.18" stopColor="oklch(0.85 0.15 65)" stopOpacity="0.5" />
              <stop offset="0.5" stopColor="oklch(0.9 0.18 85)" stopOpacity="1" />
              <stop offset="0.82" stopColor="oklch(0.85 0.15 65)" stopOpacity="0.5" />
              <stop offset="1" stopColor="oklch(0.85 0.15 65)" stopOpacity="0" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="oklch(0.8 0.04 250)" stopOpacity="0" />
              <stop offset="0.18" stopColor="oklch(0.8 0.04 250)" stopOpacity="0.45" />
              <stop offset="0.5" stopColor="oklch(0.95 0.02 250)" stopOpacity="1" />
              <stop offset="0.82" stopColor="oklch(0.8 0.04 250)" stopOpacity="0.45" />
              <stop offset="1" stopColor="oklch(0.8 0.04 250)" stopOpacity="0" />
            </>
          )}
        </linearGradient>
        {kind === "sun" && (
          <>
            <radialGradient id={sunGlowId} cx="0.5" cy="0.5">
              <stop offset="0" stopColor="oklch(0.95 0.18 85)" stopOpacity="0.5" />
              <stop offset="0.55" stopColor="oklch(0.92 0.17 80)" stopOpacity="0.18" />
              <stop offset="1" stopColor="oklch(0.95 0.18 85)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={sunDiscId} cx="0.4" cy="0.35">
              <stop offset="0" stopColor="oklch(0.97 0.13 90)" />
              <stop offset="1" stopColor="oklch(0.85 0.18 65)" />
            </radialGradient>
          </>
        )}
        {kind === "moon" && (
          <radialGradient id={moonLitId} cx="0.4" cy="0.4" r="0.75">
            <stop offset="0" stopColor="oklch(0.98 0.02 80)" />
            <stop offset="1" stopColor="oklch(0.86 0.06 75)" />
          </radialGradient>
        )}
      </defs>

      <line
        x1="0"
        y1="100"
        x2="320"
        y2="100"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="0.6"
        strokeDasharray="2 4"
      />

      <path
        d="M 20 100 Q 160 -16 300 100"
        fill="none"
        stroke={`url(#${arcGradId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <circle cx="20" cy="100" r="3" fill={dotColor} />
      <circle cx="300" cy="100" r="3" fill={dotColor} />

      {kind === "sun" ? (
        <g>
          <circle cx="160" cy="42" r="42" fill={`url(#${sunGlowId})`} />
          <circle cx="160" cy="42" r="22" fill={`url(#${sunDiscId})`} />
        </g>
      ) : astro ? (
        <MoonBodyShapes
          cx={160}
          cy={42}
          r={22}
          illumination={astro.moonIllumination}
          phase={astro.moonPhase}
          litGradId={moonLitId}
        />
      ) : (
        <circle cx="160" cy="42" r="22" fill="currentColor" fillOpacity="0.12" />
      )}
    </svg>
  );
}

function MoonBodyShapes({
  cx,
  cy,
  r,
  illumination,
  phase,
  litGradId,
}: {
  cx: number;
  cy: number;
  r: number;
  illumination: number;
  phase: string;
  litGradId: string;
}) {
  const k = Math.max(0, Math.min(100, illumination)) / 100;
  const phaseLower = phase.toLowerCase();
  const isWaxing =
    phaseLower.includes("waxing") || phaseLower.includes("first") || phaseLower === "new moon";
  const isCrescent = k < 0.5;
  const termRx = Math.abs(1 - 2 * k) * r;
  const outerSweep = isWaxing ? 1 : 0;
  const termSweep = (isWaxing && isCrescent) || (!isWaxing && !isCrescent) ? 1 : 0;
  const litPath = `M ${cx},${cy - r} A ${r},${r} 0 0 ${outerSweep} ${cx},${cy + r} A ${termRx},${r} 0 0 ${termSweep} ${cx},${cy - r} Z`;

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="var(--moon-dark)" />
      <path d={litPath} fill={`url(#${litGradId})`} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="0.5"
      />
    </g>
  );
}

function MoonGlyph({
  illumination,
  phase,
  size = 20,
}: {
  illumination: number;
  phase: string;
  size?: number;
}) {
  const uid = useId();
  const litGradId = `${uid}-lit`;
  const VB = 44;
  const r = 18;
  const c = VB / 2;

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      width={size}
      height={size}
      className="block shrink-0"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={litGradId} cx="0.4" cy="0.4" r="0.75">
          <stop offset="0" stopColor="oklch(0.98 0.02 80)" />
          <stop offset="1" stopColor="oklch(0.86 0.06 75)" />
        </radialGradient>
      </defs>
      <MoonBodyShapes
        cx={c}
        cy={c}
        r={r}
        illumination={illumination}
        phase={phase}
        litGradId={litGradId}
      />
    </svg>
  );
}

function Stars() {
  return (
    <svg className="pointer-events-none absolute inset-0 size-full opacity-50" aria-hidden="true">
      <circle cx="8%" cy="14%" r="0.8" fill="currentColor" opacity="0.35" />
      <circle cx="22%" cy="6%" r="0.5" fill="currentColor" opacity="0.3" />
      <circle cx="68%" cy="3%" r="0.7" fill="currentColor" opacity="0.28" />
      <circle cx="86%" cy="11%" r="0.6" fill="currentColor" opacity="0.3" />
      <circle cx="93%" cy="24%" r="0.9" fill="currentColor" opacity="0.22" />
      <circle cx="4%" cy="42%" r="0.5" fill="currentColor" opacity="0.25" />
      <circle cx="97%" cy="58%" r="0.6" fill="currentColor" opacity="0.22" />
    </svg>
  );
}

function Skeleton() {
  return <div className="h-4 w-14 animate-pulse rounded bg-foreground/10" aria-hidden="true" />;
}

function formatClock(t: string): string {
  const [time, ampm] = t.trim().split(" ");
  if (!time) return t;
  const [h, m] = time.split(":");
  const hour = Number.parseInt(h ?? "0", 10);
  const suffix = ampm ? ampm.toLowerCase() : "";
  return `${hour}:${m}${suffix ? ` ${suffix}` : ""}`;
}

function computeDayLength(sunrise: string, sunset: string): string {
  const rise = parseClockMinutes(sunrise);
  const setM = parseClockMinutes(sunset);
  if (rise === null || setM === null) return "—";
  let diff = setM - rise;
  if (diff < 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m}m`;
}

function parseClockMinutes(t: string): number | null {
  const [time, ampm] = t.trim().split(" ");
  if (!time) return null;
  const [hStr, mStr] = time.split(":");
  let hour = Number.parseInt(hStr ?? "", 10);
  const min = Number.parseInt(mStr ?? "", 10);
  if (Number.isNaN(hour) || Number.isNaN(min)) return null;
  const ampmU = (ampm ?? "").toUpperCase();
  if (ampmU === "PM" && hour < 12) hour += 12;
  if (ampmU === "AM" && hour === 12) hour = 0;
  return hour * 60 + min;
}
