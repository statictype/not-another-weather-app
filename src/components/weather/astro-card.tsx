import { SunriseIcon, SunsetIcon } from "lucide-react";
import type { Astro } from "@/api/types";

interface AstroCardProps {
  astro: Astro | undefined;
}

export function AstroCard({ astro }: AstroCardProps) {
  return (
    <section className="swap-in swap-d-3 bento-tile relative overflow-hidden p-6 sm:col-span-6 xl:col-span-2">
      <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
        Sun & Moon
      </p>

      <div className="mt-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5">
          <SunriseIcon
            className="size-4 shrink-0 text-amber-500/70"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          {astro ? (
            <span className="font-display text-base tracking-tight">
              {formatClock(astro.sunrise)}
            </span>
          ) : (
            <Skeleton />
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <SunsetIcon
            className="size-4 shrink-0 text-orange-500/70"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          {astro ? (
            <span className="font-display text-base tracking-tight">
              {formatClock(astro.sunset)}
            </span>
          ) : (
            <Skeleton />
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-foreground/8 pt-3">
        {astro ? (
          <>
            <MoonVisual
              illumination={astro.moonIllumination}
              phase={astro.moonPhase}
            />
            <div className="min-w-0">
              <p className="font-display text-sm leading-snug tracking-tight">
                {astro.moonPhase}
              </p>
              <p className="font-display text-xs text-foreground/55">
                {astro.moonIllumination}% lit
              </p>
            </div>
          </>
        ) : (
          <Skeleton />
        )}
      </div>
    </section>
  );
}

function MoonVisual({
  illumination,
  phase,
}: {
  illumination: number;
  phase: string;
}) {
  const phaseLower = phase.toLowerCase();
  const isWaxing =
    phaseLower.includes("waxing") ||
    phaseLower.includes("first") ||
    phaseLower === "new moon";

  const litPct = Math.max(0, Math.min(100, illumination));
  const leftInset = isWaxing ? `${100 - litPct}%` : "0";
  const rightInset = isWaxing ? "0" : `${100 - litPct}%`;

  return (
    <div
      className="relative size-10 shrink-0 rounded-full bg-foreground/10"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-100 to-amber-200/80"
        style={{ clipPath: `inset(0 ${rightInset} 0 ${leftInset} round 50%)` }}
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div
      className="h-4 w-14 animate-pulse rounded bg-foreground/10"
      aria-hidden="true"
    />
  );
}

function formatClock(t: string): string {
  const [time, ampm] = t.trim().split(" ");
  if (!time) return t;
  const [h, m] = time.split(":");
  const hour = Number.parseInt(h ?? "0", 10);
  const suffix = ampm ? ampm.toLowerCase() : "";
  return `${hour}:${m}${suffix ? ` ${suffix}` : ""}`;
}
