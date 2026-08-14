import { useEffect, useState } from "react";
import type { CurrentConditions, WeatherForecast, WeatherLocation } from "@/api/types";
import { airComfort } from "@/lib/air-comfort";
import { cn } from "@/lib/utils";
import { ConditionIcon } from "./condition-icon";
import { PrecipStrip } from "./precip-strip";

interface HeroCardProps {
  location: WeatherLocation;
  current: CurrentConditions;
  today: WeatherForecast["today"] | undefined;
}

/** Hierarchy is by size step, never opacity: faded white fails 4.5:1 on the day gradient. */
const PEAK =
  "font-light leading-[1.05] tracking-tight text-[2.125rem] sm:text-[2.5rem] md:text-[3rem] xl:text-[3.5rem]";

const SPOKEN = "font-light leading-tight text-lg md:text-xl xl:text-2xl";

const CLOCK = "font-light text-base md:text-lg";

export function HeroCard({ location, current, today }: HeroCardProps) {
  const isDay = current.timeOfDay === "day";
  const { sentence } = airComfort({
    tempC: current.tempC,
    feelsLikeC: current.feelsLikeC,
    dewpointC: current.dewpointC,
    humidity: current.humidity,
  });
  const country = location.country;
  const now = useTicker();

  return (
    <section
      className={cn(
        "swap-in swap-d-1 relative col-span-1 xl:order-1 overflow-hidden rounded-[2rem] p-7 text-white sm:col-span-12 sm:p-10 xl:col-span-8 xl:p-12",
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

      <div className="relative flex h-full flex-col">
        {/* Stacked below `sm`: side by side at 390 px the left column resolves
            to 117 px and the city name overflows it. */}
        <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          <div className="min-w-0">
            {country && <p className="label-section text-white leading-none">{country}</p>}
            <h2 className={cn(PEAK, "mt-1.5 text-balance md:mt-2")}>{location.name}</h2>
            <p className={cn(CLOCK, "mt-3 md:mt-4")}>
              <time dateTime={new Date(now).toISOString()}>{formatTime(now, location.tz)}</time>
              <span className="px-2 text-white/50" aria-hidden="true">
                ·
              </span>
              {formatDate(now, location.tz)}
            </p>
            <PrecipStrip today={today} className="mt-4 md:mt-5" />
          </div>

          <div className="flex min-w-0 shrink-0 flex-col items-end gap-2 text-right">
            <ConditionIcon
              text={current.conditionText}
              isDay={isDay}
              className={cn(
                "size-28 shrink-0 sm:size-32 xl:size-40",
                isDay ? "text-white/90" : "text-[oklch(0.62_0.03_250)]",
              )}
              strokeWidth={1}
              aria-hidden="true"
            />
            <p className={SPOKEN}>{current.conditionText}</p>
            <p className={cn(SPOKEN, "text-balance")}>{sentence}</p>
          </div>
        </div>
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
