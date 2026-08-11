import { UmbrellaIcon, WindIcon } from "lucide-react";
import type { CurrentConditions, WeatherForecast, WeatherLocation } from "@/api/types";
import { airComfort, airComfortInk, beaufort } from "@/lib/air-comfort";
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
  const { sentence, thermal, air } = airComfort({
    tempC: current.tempC,
    feelsLikeC: current.feelsLikeC,
    dewpointC: current.dewpointC,
    humidity: current.humidity,
  });
  const place = [location.region, location.country].filter(Boolean).join(" · ");

  return (
    <section
      className={cn(
        "swap-in swap-d-1 relative col-span-1 xl:order-1 overflow-hidden rounded-[2rem] p-6 text-white sm:col-span-12 sm:p-10 xl:col-span-8 xl:row-span-2",
        isDay
          ? "bg-linear-to-tr from-blue-700 via-sky-800 to-sky-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_30px_60px_-25px_rgba(32,53,213,0.55)]"
          : "hero-night shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_30px_60px_-25px_rgba(8,8,24,0.85)]",
      )}
    >
      {isDay && (
        <>
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-cyan-300/20 blur-3xl" />
        </>
      )}

      <div className="relative flex h-full flex-col gap-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 flex-col gap-1.5">
            {place && (
              <p className="font-light text-xs uppercase tracking-[0.15em] text-white">{place}</p>
            )}
            <h2 className="font-light text-balance text-xl leading-[1.1] md:text-2xl xl:text-[1.75rem] xl:tracking-tight">
              {location.name}
            </h2>
            <p className="font-normal text-sm md:text-base">{current.conditionText}</p>
          </div>

          <ConditionIcon
            text={current.conditionText}
            isDay={isDay}
            className={cn(
              "shrink-0 size-16 md:size-24 xl:size-28",
              isDay ? "text-white/90" : "text-[oklch(0.62_0.03_250)]",
            )}
            strokeWidth={1}
            aria-hidden="true"
          />
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <span
            className="h-1 w-14 shrink-0 rounded-full ring-1 ring-white/40"
            style={{ background: airComfortInk({ thermal, air }) }}
            aria-hidden="true"
          />
          <p className="font-light text-balance text-[1.75rem] leading-[1.05] tracking-tight sm:text-[2rem] md:text-[3rem] xl:text-[4rem]">
            {sentence}
          </p>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className="font-light text-[1.375rem] leading-none tracking-tight md:text-3xl xl:text-[2.25rem]">
            {Math.round(current.tempC)}
            <span className="ml-0.5 text-[0.45em] font-normal">°C</span>
          </p>
          <p className="font-light text-sm md:text-base">
            feels like {Math.round(current.feelsLikeC)}°
          </p>
          {today ? (
            <p className="font-light text-sm md:text-base">
              <span className="sr-only">High </span>
              <span aria-hidden="true">↑ </span>
              {Math.round(today.maxC)}°<span className="ml-2 sr-only">Low </span>
              <span aria-hidden="true">↓ </span>
              {Math.round(today.minC)}°
            </p>
          ) : (
            <span className="h-4 w-16 animate-pulse rounded bg-white/20" aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-light text-sm md:text-base">
          <span className="flex items-center gap-1.5">
            <WindIcon className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            {beaufort(current.windKph)}
          </span>
          {today ? (
            <span className="flex items-center gap-1.5">
              <UmbrellaIcon className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              {today.chanceOfRain}% rain
            </span>
          ) : (
            <span className="h-4 w-20 animate-pulse rounded bg-white/20" aria-hidden="true" />
          )}
          <span className="flex items-center gap-1.5">
            <svg
              className="size-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
            {current.cloud}% cloud
          </span>
        </div>
      </div>
    </section>
  );
}
