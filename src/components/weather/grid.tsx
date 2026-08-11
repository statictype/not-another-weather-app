import type { WeatherCurrent } from "@/api/types";
import { cn } from "@/lib/utils";
import { useWeatherForecast, useWeatherYesterday } from "@/hooks/use-weather";
import { AirComfortCard } from "./air-comfort-card";
import { AstroCard } from "./astro-card";
import { ExposureCard } from "./exposure-card";
import { ForecastCard } from "./forecast-card";
import { HeroCard } from "./hero-card";
import { HourlyCard } from "./hourly-card";
import { NowCard } from "./now-card";

interface WeatherGridProps {
  query: string | null;
  current: WeatherCurrent;
  isStale: boolean;
}

/**
 * Document order is the small-screen reading order: the answer, then the
 * next hours, then the next days. `xl:order-*` restores the desktop
 * composition, where the hero spans two rows beside a stacked right column.
 */
export function WeatherGrid({ query, current: c, isStale }: WeatherGridProps) {
  const forecast = useWeatherForecast(query);
  const yesterday = useWeatherYesterday(query);

  const swapKey = `${c.location.name}-${c.location.country}`;

  return (
    <div
      key={swapKey}
      aria-busy={isStale}
      className={cn(
        "grid w-full auto-rows-[minmax(150px,auto)] grid-cols-1 gap-5 transition-opacity duration-300 sm:grid-cols-12 sm:gap-6",
        isStale && "opacity-60",
      )}
    >
      <HeroCard location={c.location} current={c.current} />
      <NowCard
        tempC={c.current.tempC}
        feelsLikeC={c.current.feelsLikeC}
        windKph={c.current.windKph}
        chanceOfRain={forecast.data?.today.chanceOfRain}
      />
      <HourlyCard hourly={forecast.data?.hourly} tz={c.location.tz} />
      <ForecastCard forecast={forecast.data?.forecast} yesterday={yesterday.data?.yesterday} />
      <AirComfortCard
        dewpointC={c.current.dewpointC}
        humidity={c.current.humidity}
        cloud={c.current.cloud}
        windKph={c.current.windKph}
        windDir={c.current.windDir}
        visibilityKm={c.current.visibilityKm}
      />
      <AstroCard astro={forecast.data?.astro} />
      <ExposureCard
        uv={c.current.uv}
        airQualityIndex={forecast.data?.airQualityIndex ?? null}
        pressureMb={c.current.pressureMb}
        isDay={c.current.timeOfDay === "day"}
      />
    </div>
  );
}
