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
        <p className="font-display font-light text-xs uppercase tracking-[0.15em] text-white flex flex-wrap gap-0.5">
        <span>{location.region}</span> <span>·</span> <span className="shrink-0">{location.country}</span>
        </p>

        <div className="grid grid-cols-[1fr_auto] md:flex-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(8rem,12rem)] md:items-center md:gap-x-2">
          <h2 className="col-span-2 font-display font-light text-balance text-4xl leading-[0.95] md:col-span-1 xl:text-5xl xl:tracking-tight">
            {location.name}
          </h2>

          <div className="col-start-1 row-start-2 mt-6 flex items-center justify-start md:col-start-2 md:row-start-1 md:row-end-3 md:mt-0 md:justify-center md:px-3">
            <ConditionIcon
              text={current.conditionText}
              isDay={isDay}
              className={cn(
                "shrink-0 size-20 md:size-36 lg:size-40 xl:size-40",
                isDay ? "text-white/90" : "text-[oklch(0.52_0.02_250)]",
              )}
              strokeWidth={1}
              aria-hidden="true"
            />
          </div>

          <div className="col-start-2 row-start-2 row-end-4 mt-6 flex flex-col items-end justify-end gap-1.5 pl-6 md:col-start-1 md:row-end-3 md:flex-row md:flex-wrap md:items-baseline md:justify-start md:gap-x-4 md:gap-y-2 md:pl-0">
            {today ? (
              <p className="order-1 font-display font-light text-sm md:text-base min-h-3.5 text-white md:order-3">
                ↑ {Math.round(today.maxC)}°
                <span className="ml-1">↓ {Math.round(today.minC)}°</span>
              </p>
            ) : (
              <div className="order-1 h-4 w-16 animate-pulse rounded bg-white/20 md:order-3" aria-hidden="true" />
            )}

            <div className="order-2 flex items-stretch text-6xl md:text-[5.5rem] lg:text-[8rem] md:order-1 md:basis-full">
              <span className="font-display leading-[0.78] tracking-[-0.06em]">
                {Math.round(current.tempC)}
              </span>
              <span className="ml-[0.06em] flex flex-col justify-between pt-[0.025em] pb-[0.038em] font-display font-light text-white md:text-white/80 xl:pb-[0.026em]">
                <span className="text-[0.38em] leading-none xl:text-[0.3em]">°</span>
                <span className="text-[0.26em] leading-none font-normal xl:text-[0.2em]">C</span>
              </span>
            </div>

            <p className="order-3 font-display font-light text-sm md:text-base min-h-3.5 text-white md:order-2">
              feels like {Math.round(current.feelsLikeC)}°
            </p>
          </div>

          <div className="col-start-1 row-start-3 flex min-w-0 flex-col justify-end gap-0.5 pt-4 md:col-start-3 md:row-start-1 md:row-end-3 md:gap-2 md:pt-0 md:text-right">
            <p className="font-display font-normal text-base md:text-2xl lg:text-lg 2xl:text-xl">
              {current.conditionText}
            </p>
            {today ? (
              <p className="font-display font-light text-sm md:text-base text-white">
                {today.chanceOfRain}% chance of rain
              </p>
            ) : (
              <p
                aria-hidden="true"
                className="h-[1.25rem] w-32 animate-pulse rounded bg-white/20 md:self-end"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

