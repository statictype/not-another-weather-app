import { UmbrellaIcon } from "lucide-react";
import type { CurrentConditions, WeatherForecast, WeatherLocation } from "@/api/types";
import { cn } from "@/lib/utils";
import { ConditionIcon } from "./condition-icon";

interface HeroCardProps {
  location: WeatherLocation;
  current: CurrentConditions;
  /** Undefined until the forecast tier lands — the stats row shimmers in the meantime. */
  today: WeatherForecast["today"] | undefined;
}

export function HeroCard({ location, current, today }: HeroCardProps) {
  const isDay = current.timeOfDay === "day";

  return (
    <section
      className={cn(
        "swap-in swap-d-1 relative col-span-1 overflow-hidden rounded-[2rem] p-8 text-white sm:col-span-12 sm:p-10 xl:col-span-8",
        isDay
          ? "bg-linear-to-tr from-blue-500 via-sky-500 to-sky-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_30px_60px_-25px_rgba(32,53,213,0.55)]"
          : "hero-night shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_30px_60px_-25px_rgba(8,8,24,0.85)]",
      )}
    >
      {isDay && (
        <>
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-cyan-300/40 blur-3xl" />
        </>
      )}

      <div className="relative grid h-full grid-cols-[1fr_auto] grid-rows-[auto_1fr_auto] gap-x-4 gap-y-6 md:grid-cols-[4fr_minmax(0,12rem)]">
        {/* TOP-LEFT: country/region label + city name */}
        <div className="col-start-1 row-start-1 flex min-w-0 flex-col gap-2">
          <p className="font-display font-light text-xs uppercase tracking-[0.15em] text-white flex flex-wrap gap-0.5">
            <span>{location.region}</span> <span>·</span> <span className="shrink-0">{location.country}</span>
          </p>
          <h2 className="font-display font-light text-balance text-4xl leading-[0.95] md:text-5xl xl:tracking-tight">
            {location.name}
          </h2>
        </div>

        {/* ICON: middle-left on mobile, vertically centered col 2 on desktop */}
        <div className="col-start-1 row-start-2 flex items-center justify-start md:row-span-2 md:col-end-1 md:row-start-2 md:self-center md:justify-self-end 2xl:self-end">
          <ConditionIcon
            text={current.conditionText}
            isDay={isDay}
            className={cn(
              "shrink-0 size-20 md:size-36 lg:size-40 xl:size-40 2xl:size-52",
              isDay ? "text-white/90" : "text-[oklch(0.52_0.02_250)]",
            )}
            strokeWidth={1}
            aria-hidden="true"
          />
        </div>

        {/* CONDITIONS: bottom-left on mobile, right column middle row on desktop */}
        <div className="col-start-1 row-start-3 flex min-w-0 flex-col items-start justify-end gap-1 text-left md:col-start-2 md:row-start-3 md:self-center md:items-end md:justify-start md:gap-2 md:text-right 2xl:self-end">
          <p className="font-display font-normal text-base md:text-xl">
            {current.conditionText}
          </p>
          {today ? (
            <div className="flex flex-col gap-1">
              <p className="font-display font-light text-sm md:text-base text-white flex items-center gap-1.5 md:justify-end">
                <UmbrellaIcon className="size-4 shrink-0 md:size-5" strokeWidth={2} aria-hidden="true" />
                {today.chanceOfRain}% rain
              </p>
              <p className="font-display font-light text-sm md:text-base text-white/75 flex items-center gap-1.5 md:justify-end">
                <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
                {current.cloud}% cloud
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p aria-hidden="true" className="h-[1.25rem] w-28 animate-pulse rounded bg-white/20" />
              <p aria-hidden="true" className="h-[1.25rem] w-24 animate-pulse rounded bg-white/20" />
            </div>
          )}
        </div>

        {/* TEMPS: bottom-right on mobile, bottom-left on desktop */}
        <div className="col-start-2 row-start-3 flex flex-col items-end gap-1.5 md:col-start-1 md:row-start-3 md:flex-row md:flex-wrap md:items-baseline md:justify-start md:gap-x-4 md:gap-y-2">
          {today ? (
            <p className="order-1 font-display font-light text-sm md:text-base min-h-3.5 text-white md:order-2">
              ↑ {Math.round(today.maxC)}°
              <span className="ml-1">↓ {Math.round(today.minC)}°</span>
            </p>
          ) : (
            <div className="order-1 h-4 w-16 animate-pulse rounded bg-white/20 md:order-2" aria-hidden="true" />
          )}

          <div className="order-2 flex items-stretch text-6xl md:text-[5.5rem] lg:text-[8rem] md:order-1 md:basis-full">
            <span className="font-display leading-[0.78] tracking-[-0.06em]">
              {Math.round(current.tempC)}
            </span>
            <span className="ml-[0.06em] flex flex-col justify-between pt-[0.025em] pb-[0.038em] font-display font-light text-white md:text-white/80 md:pb-[0.02em]">
              <span className="text-[0.38em] leading-none xl:text-[0.3em]">°</span>
              <span className="text-[0.26em] leading-none font-normal xl:text-[0.2em]">C</span>
            </span>
          </div>

          <p className="order-3 font-display font-light text-sm md:text-base min-h-3.5 text-white md:order-3">
            feels like {Math.round(current.feelsLikeC)}°
          </p>
        </div>
      </div>
    </section>
  );
}
