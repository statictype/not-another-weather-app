import type { WeatherCurrent } from "@/api/types";
import { cn } from "@/lib/utils";
import { useWeatherForecast, useWeatherYesterday } from "@/hooks/use-weather";
import { AirComfortCard } from "./air-comfort-card";
import { AstroCard } from "./astro-card";
import { AtmospherePanel } from "./atmosphere-panel";
import { ExposureCard } from "./exposure-card";
import { ForecastCard } from "./forecast-card";
import { HeroCard } from "./hero-card";
import { HourlyCard } from "./hourly-card";
import { TimeCard } from "./time-card";

interface WeatherGridProps {
  query: string | null;
  current: WeatherCurrent;
  isStale: boolean;
}

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
      {/* Row 1: Hero (8) + Time & Hourly stacked (4) */}
      <HeroCard location={c.location} current={c.current} today={forecast.data?.today} />
      <div className="col-span-1 flex flex-col gap-5 sm:col-span-12 sm:gap-6 xl:col-span-4">
        <TimeCard tz={c.location.tz} />
        <HourlyCard hourly={forecast.data?.hourly} tz={c.location.tz} />
      </div>

      {/* Row 2: Astro (3) + Atmosphere (3) + Air Comfort (3) + UV/AQI (3) */}
      <AstroCard astro={forecast.data?.astro} />
      <AtmospherePanel
        pressureMb={c.current.pressureMb}
        visibilityKm={c.current.visibilityKm}
      />
      <AirComfortCard
        tempC={c.current.tempC}
        feelsLikeC={c.current.feelsLikeC}
        dewpointC={c.current.dewpointC}
        humidity={c.current.humidity}
        windKph={c.current.windKph}
        windDir={c.current.windDir}
      />
      <ExposureCard
        uv={c.current.uv}
        airQualityIndex={forecast.data?.airQualityIndex ?? null}
        isDay={c.current.timeOfDay === "day"}
      />

      {/* Row 3: Forecast (12) */}
      <ForecastCard forecast={forecast.data?.forecast} yesterday={yesterday.data?.yesterday} />
    </div>
  );
}
