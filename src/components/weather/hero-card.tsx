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

      <div className="relative flex h-full flex-col gap-2">
        <p className="font-display font-normal text-xs uppercase tracking-[0.15em] text-white/60 flex flex-wrap gap-0.5">
        <span>{location.region}</span> <span className="">·</span>  <span className="shrink-0">{location.country}</span>
          {/* {[location.region, location.country].filter(Boolean).join(" · ") || "Now"} */}
        </p>

        {/* Mobile layout: 2-col grid — city top, icon|temp middle, condition|feels bottom */}
        <div className="grid grid-cols-[1fr_auto] sm:hidden">
          <h2 className="col-span-2 font-display font-light text-balance text-4xl leading-[0.95]">
            {location.name}
          </h2>

          <div className="mt-6 flex items-center justify-start">
            <ConditionIcon
              text={current.conditionText}
              isDay={isDay}
              size={60}
              className={cn(
                "shrink-0",
                isDay ? "text-white/90" : "text-[oklch(0.52_0.02_250)]",
              )}
              strokeWidth={1}
              aria-hidden="true"
            />
          </div>

          <div className="row-span-2 mt-6 flex flex-col items-end justify-end gap-1.5 pl-6">
            {today ? (
              <p className="font-display font-normal text-sm text-white/60">
                ↑ {Math.round(today.maxC)}°
                <span className="ml-1">↓{Math.round(today.minC)}°</span>
              </p>
            ) : (
              <div className="h-4 w-16 animate-pulse rounded bg-white/20" aria-hidden="true" />
            )}
            <div className="flex items-end">
              <span className="font-display text-6xl leading-[0.78] tracking-[-0.06em]">
                {Math.round(current.tempC)}
              </span>
              <span className="font-display font-light mb-0.5 ml-0.5 text-base text-white/80">
                °c
              </span>
            </div>
            <p className="font-display font-normal text-base text-white/60">
              feels like {Math.round(current.feelsLikeC)}°
            </p>
          </div>

          <div className="flex min-w-0 flex-col justify-end gap-1.5 pt-4">
            <p className="font-display font-normal text-base">{current.conditionText}</p>
            {today && (
              <p className="font-display font-normal text-base text-white/60">
                {today.chanceOfRain}% chance of rain 
              </p>
            )}
          </div>
        </div>

        {/* sm+ layout: unchanged grid. */}
        <div className="hidden flex-1 items-center gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(8rem,12rem)] lg:grid-cols-[minmax(0,1fr)_auto_minmax(8rem,12rem)]">
          {/* Left: city + temp + feels like */}
          <div className="flex min-w-0 flex-col">
            <h2 className="font-display font-light text-balance leading-[0.95] sm:text-4xl lg:text-5xl 2xl:text-6xl 2xl:tracking-tight">
              {location.name}
            </h2>
            <div className="mt-6 flex items-end">
              <span className="font-display leading-[0.78] tracking-[-0.06em] sm:text-[5.5rem] lg:text-[8rem]">
                {Math.round(current.tempC)}
              </span>
              <span className="font-display font-light mb-1 ml-1 text-lg text-white/60 lg:mb-2 lg:ml-2 lg:text-xl">
                °C
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-4">
              <p className="font-display font-normal text-base text-white/60">
                feels like {Math.round(current.feelsLikeC)}°
              </p>
              {today ? (
                <p className="font-display font-normal text-sm text-white/60">
                  ↑ {Math.round(today.maxC)}°
                  <span className="ml-1">↓{Math.round(today.minC)}°</span>
                </p>
              ) : (
                <div className="h-4 w-16 animate-pulse rounded bg-white/20" aria-hidden="true" />
              )}
            </div>
          </div>

          {/* Condition icon */}
          <div className="flex items-center justify-center px-3">
            <ConditionIcon
              text={current.conditionText}
              isDay={isDay}
              className={cn(
                "sm:size-60 md:size-36 lg:size-40 xl:size-40",
                isDay ? "text-white/90" : "text-[oklch(0.52_0.02_250)]",
              )}
              strokeWidth={1}
              aria-hidden="true"
            />
          </div>

          {/* Stats column — shimmers until the forecast tier lands */}
          <div className="flex flex-col gap-2 text-right">
            <p className="font-display font-normal sm:text-2xl lg:text-lg 2xl:text-xl">
              {current.conditionText}
            </p>
            <HeroStatsRow today={today} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Reserves exact space for the max/min/rain row via a shimmer bar until
 * the forecast tier arrives. Matching heights keep CLS at zero.
 */
function HeroStatsRow({ today }: { today: WeatherForecast["today"] | undefined }) {
  if (!today) {
    return (
      <p
        aria-hidden="true"
        className="h-[1.25rem] w-32 animate-pulse self-end rounded bg-white/20"
      />
    );
  }
  return (
    <p className="font-display font-normal text-base text-white/60">
      {today.chanceOfRain}% chance of rain
    </p>
  );
}
