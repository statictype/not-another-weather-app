import { MoonIcon, SunriseIcon, SunsetIcon } from "lucide-react";
import type { Astro } from "@/api/types";

interface AstroCardProps {
  /** Undefined until the forecast tier lands — renders a skeleton. */
  astro: Astro | undefined;
}

export function AstroCard({ astro }: AstroCardProps) {
  return (
    <section className="swap-in swap-d-3b bento-tile relative overflow-hidden p-7 sm:col-span-6 xl:col-span-4">
      <div className="flex flex-col xl:divide-y xl:divide-foreground/6">
        <Row
          icon={
            <SunriseIcon
              className="text-foreground/70 size-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          }
          value={astro ? formatClock(astro.sunrise) : undefined}
          label="Sunrise"
        />
        <Row
          icon={
            <SunsetIcon
              className="text-foreground/70 size-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          }
          value={astro ? formatClock(astro.sunset) : undefined}
          label="Sunset"
        />
        <Row
          icon={
            <MoonIcon className="text-foreground/70 size-5" strokeWidth={1.75} aria-hidden="true" />
          }
          value={astro?.moonPhase}
          label={astro ? `${astro.moonIllumination}% illuminated` : "Moon"}
        />
      </div>
    </section>
  );
}

function Row({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | undefined;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 xl:py-4">
      <div className="shrink-0">{icon}</div>
      <div className="flex min-w-0 flex-1 flex-col">
        {value ? (
          <p className="font-display text-base leading-tight tracking-tight">{value}</p>
        ) : (
          <p aria-hidden="true" className="h-[1rem] w-20 animate-pulse rounded bg-foreground/10" />
        )}
        <p className="font-display font-normal text-foreground/55 text-xs uppercase tracking-[0.16em]">
          {label}
        </p>
      </div>
    </div>
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
