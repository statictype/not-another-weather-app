import { useEffect, useState } from "react";
import type { CurrentConditions, WeatherLocation } from "@/api/types";
import { cn } from "@/lib/utils";
import { ConditionIcon } from "./condition-icon";

interface HeroCardProps {
  location: WeatherLocation;
  current: CurrentConditions;
}

/** Hierarchy is by size step, never opacity: faded white fails 4.5:1 on the day gradient.
 *
 *  `leading-*` comes last on purpose. tailwind-merge treats a font-size class
 *  as conflicting with line-height, so a `leading-` written before `text-`
 *  is dropped by `cn` — which is how the city shipped at 56px/84px instead of
 *  56px/58.8px, and why the three lines under it read as loose. */
const PEAK =
  "font-light tracking-tight text-[2.125rem] sm:text-[2.5rem] md:text-[3rem] xl:text-[3.5rem] leading-[1.05]";

/** The condition and the local time are peers, both at the body rung. The
 *  condition used to run at 24px light, the same rung as the Now tile's comfort
 *  sentence beside it — two headlines answering the same question, and the
 *  hero's was the less informative one. Regular, not light: at 16–18px over the
 *  day gradient, Work Sans Light has too little stem left to hold against a
 *  saturated ground (see "Light Is a Display Weight"). */
const LINE = "text-base md:text-lg leading-snug";

export function HeroCard({ location, current }: HeroCardProps) {
  const isDay = current.timeOfDay === "day";
  const country = location.country;
  const now = useTicker();

  return (
    <section
      className={cn(
        "swap-in swap-d-1 relative col-span-1 xl:order-1 overflow-hidden rounded-[2rem] p-7 text-white",
        "sm:col-span-4 sm:p-10 xl:col-span-3 xl:p-12",
        isDay
          ? "hero-day shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_30px_60px_-25px_rgba(24,102,225,0.55)]"
          : "hero-night shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_30px_60px_-25px_rgba(8,8,24,0.85)]",
      )}
    >
      {/* Stacked below `sm`: side by side at 390px the words column resolves to
          117px and the city name overflows it. */}
      <div className="flex h-full flex-col gap-8 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
        {/* Two groups, not four lines: the place, then what it is there now.
            4px inside a group, 20–24px between them. */}
        <div className="flex min-w-0 flex-col">
          {country && <p className="label-section leading-none text-white">{country}</p>}
          <h2 className={cn(PEAK, "mt-1 text-balance")}>{location.name}</h2>

          <p className={cn(LINE, "mt-5 md:mt-6")}>{current.conditionText}</p>
          <p className={cn(LINE, "mt-1")}>
            <time dateTime={new Date(now).toISOString()}>{formatTime(now, location.tz)}</time>
            <span className="px-2 text-white/50" aria-hidden="true">
              ·
            </span>
            {formatDate(now, location.tz)}
          </p>
        </div>

        {/* `stroke-width` comes down as the icon goes up so the drawn line
            stays ~6.7px — the weight it had at 160px/stroke 1 — rather than
            thickening with the size. */}
        <ConditionIcon
          text={current.conditionText}
          isDay={isDay}
          className={cn(
            "size-36 shrink-0 self-end [stroke-width:1.1]",
            "sm:size-44 sm:self-center sm:[stroke-width:0.9]",
            "xl:size-56 xl:[stroke-width:0.72]",
            isDay ? "text-white/90" : "text-[oklch(0.62_0.03_250)]",
          )}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}

function useTicker(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatTime(now: number, tz: string): string {
  try {
    return new Date(now)
      .toLocaleTimeString("en-US", {
        timeZone: tz,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
  } catch {
    return "—";
  }
}

function formatDate(now: number, tz: string): string {
  try {
    return new Date(now).toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
