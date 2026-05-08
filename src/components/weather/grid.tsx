import type { WeatherCurrent } from "@/api/types";
import { cn } from "@/lib/utils";
import { useWeatherForecast, useWeatherYesterday } from "@/hooks/use-weather";
import { AstroCard } from "./astro-card";
import { AtmosphereCardFromCurrent } from "./atmosphere-card";
import { ForecastCard } from "./forecast-card";
import { HeroCard } from "./hero-card";
import { LocalTimeCard } from "./local-time-card";
import { UvCard } from "./uv-card";
import { WindCard } from "./wind-card";

interface WeatherGridProps {
  /** Normalized query string, used as the key for the deferred tier hooks. */
  query: string | null;
  /** Current-tier data — always present by the time this component mounts. */
  current: WeatherCurrent;
  /** True while a refetch is in flight; fades the grid to signal staleness. */
  isStale: boolean;
}

/**
 * Layout shell for the weather view.
 *
 * Fires the two deferred queries (forecast + yesterday) at the top, then
 * distributes narrow prop slices to each card. Cards that depend on a
 * deferred tier accept `undefined` for their slice and render a shimmer
 * until it lands.
 *
 * The three-tier split means:
 *   - HeroCard, AtmosphereCard, LocalTimeCard, WindCard, UvCard paint
 *     the moment `current` lands (the LCP event).
 *   - AstroCard and the HeroCard's stats row populate when
 *     `useWeatherForecast` resolves.
 *   - The "Yesterday" column of ForecastCard slots in when
 *     `useWeatherYesterday` resolves.
 */
export function WeatherGrid({ query, current: c, isStale }: WeatherGridProps) {
  const forecast = useWeatherForecast(query);
  const yesterday = useWeatherYesterday(query);

  const swapKey = `${c.location.name}-${c.location.country}`;
  const isDay = c.current.timeOfDay === "day";

  return (
    <div
      key={swapKey}
      aria-busy={isStale}
      className={cn(
        "grid w-full auto-rows-[minmax(150px,auto)] grid-cols-1 gap-5 transition-opacity duration-300 sm:grid-cols-12 sm:gap-6",
        isStale && "opacity-60",
      )}
    >
      <HeroCard location={c.location} current={c.current} today={forecast.data?.today} />
      <AtmosphereCardFromCurrent current={c.current} />
      <LocalTimeCard tz={c.location.tz} isDay={isDay} />
      <AstroCard astro={forecast.data?.astro} />
      <WindCard
        windKph={c.current.windKph}
        windDir={c.current.windDir}
        gustKph={c.current.gustKph}
      />
      <UvCard uv={c.current.uv} isDay={isDay} />
      <ForecastCard forecast={forecast.data?.forecast} yesterday={yesterday.data?.yesterday} />
    </div>
  );
}
