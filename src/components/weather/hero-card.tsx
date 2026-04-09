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
          ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 shadow-[0_30px_60px_-25px_rgba(56,140,255,0.55)]"
          : "hero-night shadow-[0_30px_60px_-25px_rgba(8,8,24,0.85)]",
      )}
    >
      {isDay && (
        <>
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-cyan-300/40 blur-3xl" />
        </>
      )}

      <div className="relative flex h-full flex-col gap-1">
        <p className="font-display font-medium text-xs uppercase tracking-[0.22em] text-white/80">
          {[location.region, location.country].filter(Boolean).join(" · ") || "Now"}
        </p>

        <div className="grid flex-1 grid-cols-[1fr_auto] items-start gap-x-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-1 lg:grid-cols-[60%_1fr_2fr]">
          {/* Left: city + temp + feels like */}
          <div className="flex min-w-0 flex-col">
            <h2 className="font-display font-light text-balance text-3xl leading-[0.95] 2xl:tracking-tight sm:text-4xl lg:text-5xl 2xl:text-6xl">
              {location.name}
            </h2>
            <div className="mt-4 flex items-start sm:mt-6">
              <span className="font-display text-[4rem] leading-[0.78] tracking-[-0.06em] sm:text-[5.5rem] lg:text-[8rem]">
                {Math.round(current.tempC)}
              </span>
              <span className="font-display font-light mt-3 ml-2 text-3xl text-white/70 lg:text-4xl">
                °C
              </span>
            </div>
            <p className="font-display font-medium mt-2 text-xs uppercase tracking-[0.2em] text-white/85">
              Feels like {Math.round(current.feelsLikeC)}°
            </p>
          </div>

          {/* Condition icon */}
          <div className="flex items-start justify-center pt-3 sm:items-center sm:px-3 sm:pt-0">
            <ConditionIcon
              text={current.conditionText}
              isDay={isDay}
              className={cn(
                "size-20 sm:size-28 md:size-36 lg:size-40 xl:size-52",
                isDay ? "text-white/90" : "text-[oklch(0.52_0.02_250)]",
              )}
              strokeWidth={1}
              aria-hidden="true"
            />
          </div>

          {/* Stats column — shimmers until the forecast tier lands */}
          <div className="col-span-2 mt-3 flex flex-col gap-1.5 text-right sm:col-span-1 sm:mt-0 sm:gap-3">
            <p className="font-display font-normal text-xl sm:text-2xl lg:text-lg 2xl:text-xl">
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
      <>
        <p
          aria-hidden="true"
          className="h-[1.25rem] w-32 animate-pulse self-end rounded bg-white/20"
        />
        <p
          aria-hidden="true"
          className="h-[1.75rem] w-24 animate-pulse self-end rounded bg-white/20"
        />
      </>
    );
  }
  return (
    <>
      <p className="font-display font-normal text-sm text-white/90">
        {today.chanceOfRain}% chance of rain
      </p>
      <p className="font-display font-normal text-white/90">
        <span className="text-xl">{Math.round(today.maxC)}°</span>
        <span className="text-sm"> / {Math.round(today.minC)}°</span>
      </p>
    </>
  );
}
