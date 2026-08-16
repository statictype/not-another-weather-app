import { useId, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import type { Astro } from "@/api/types";
import { TabButton } from "@/components/tab-button";
import { formatClock, parseClockMinutes } from "@/lib/clock";
import { moonGeometry, moonLitPath } from "@/lib/moon";
import { cn } from "@/lib/utils";

type AstroView = "sun" | "moon";

interface AstroCardProps {
  astro: Astro | undefined;
  /** Viewer latitude. Below the equator the moon's lit side mirrors. */
  lat: number;
}

export function AstroCard({ astro, lat }: AstroCardProps) {
  const [view, setView] = useState<AstroView>("sun");

  return (
    <section
      className={cn(
        "swap-in swap-d-5 bento-tile relative overflow-hidden sm:col-span-4 md:col-span-4 xl:order-5 xl:col-span-1",
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
              <MoonGlyph
                illumination={astro.moonIllumination}
                phase={astro.moonPhase}
                lat={lat}
                size={20}
              />
            ) : (
              <MoonIcon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
            )}
          </TabButton>
        </div>

        <div key={`info-${view}`} className="astro-fade min-w-0 pt-1 text-right">
          {astro ? <SideInfo view={view} astro={astro} /> : <SideInfoSkeleton />}
        </div>
      </div>

      <div key={`panel-${view}`} className="astro-fade relative mt-3 w-full">
        {view === "sun" ? (
          <ArcPanel kind="sun" rise={astro?.sunrise} set={astro?.sunset} lat={lat} />
        ) : (
          <ArcPanel
            kind="moon"
            rise={astro?.moonrise}
            set={astro?.moonset}
            astro={astro}
            lat={lat}
          />
        )}
      </div>
    </section>
  );
}

function SideInfo({ view, astro }: { view: AstroView; astro: Astro }) {
  if (view === "moon") {
    return (
      <>
        <p className="truncate text-sm leading-tight tracking-tight">{astro.moonPhase}</p>
        <p className="mt-0.5 text-sm text-foreground/70">{astro.moonIllumination}% illuminated</p>
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
  lat: number;
  astro?: Astro | undefined;
}

function ArcPanel({ kind, rise, set, lat, astro }: ArcPanelProps) {
  const labels =
    kind === "sun" ? { rise: "Sunrise", set: "Sunset" } : { rise: "Moonrise", set: "Moonset" };

  return (
    <div>
      {/* The arc is capped so its height cannot follow the card's width; the
          times below it are not, and sit on the tile's edges. */}
      <div className="mx-auto w-full max-w-[400px]">
        <Arc kind={kind} astro={astro} lat={lat} />
      </div>
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

function Arc({
  kind,
  astro,
  lat,
}: {
  kind: "sun" | "moon";
  astro?: Astro | undefined;
  lat: number;
}) {
  const uid = useId();
  const arcGradId = `${uid}-arc`;
  const sunDiscId = `${uid}-sun-disc`;
  const sunGlowId = `${uid}-sun-glow`;
  const moonLitId = `${uid}-moon-lit`;
  const dotColor = kind === "sun" ? "oklch(0.85 0.15 65)" : "oklch(0.85 0.04 250)";

  return (
    // Horizon at y=68, control point at y=4, so the apex lands at y=36 and the
    // body's r=16.5 clears both.
    <svg viewBox="0 0 320 76" className="block aspect-[320/76] w-full" aria-hidden="true">
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
        y1="68"
        x2="320"
        y2="68"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="0.6"
        strokeDasharray="2 4"
      />

      <path
        d="M 20 68 Q 160 4 300 68"
        fill="none"
        stroke={`url(#${arcGradId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <circle cx="20" cy="68" r="3" fill={dotColor} />
      <circle cx="300" cy="68" r="3" fill={dotColor} />

      {kind === "sun" ? (
        <g>
          <circle cx="160" cy="36" r="31.5" fill={`url(#${sunGlowId})`} />
          <circle cx="160" cy="36" r="16.5" fill={`url(#${sunDiscId})`} />
        </g>
      ) : astro ? (
        <MoonBodyShapes
          cx={160}
          cy={36}
          r={16.5}
          illumination={astro.moonIllumination}
          phase={astro.moonPhase}
          lat={lat}
          litGradId={moonLitId}
        />
      ) : (
        <circle cx="160" cy="36" r="16.5" fill="currentColor" fillOpacity="0.12" />
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
  lat,
  litGradId,
}: {
  cx: number;
  cy: number;
  r: number;
  illumination: number;
  phase: string;
  lat: number;
  litGradId: string;
}) {
  const litPath = moonLitPath(moonGeometry(illumination, phase, lat, r), cx, cy, r);

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
  lat,
  size = 20,
}: {
  illumination: number;
  phase: string;
  lat: number;
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
        lat={lat}
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
