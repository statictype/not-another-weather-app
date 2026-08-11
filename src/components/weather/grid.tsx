import type { WeatherCurrent } from "@/api/types";
import { cn } from "@/lib/utils";
import { useWeatherForecast, useWeatherYesterday } from "@/hooks/use-weather";
import { AirComfortCard } from "./air-comfort-card";
import { AlertsCard } from "./alerts-card";
import { demoAlerts } from "./alerts-demo";
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

      {/* The right column beside the hero: what is urgent, then what is
          current. `contents` keeps both tiles as direct grid children below
          `xl`, so document order stays the mobile reading order; at `xl` the
          wrapper becomes the one 4-wide grid cell they stack inside. */}
      <div className="contents xl:order-2 xl:col-span-4 xl:flex xl:flex-col xl:gap-6">
        <AlertsCard
          alerts={demoAlerts() ?? forecast.data?.alerts}
          tz={c.location.tz}
          isNight={c.current.timeOfDay === "night"}
        />
        <NowCard
          tempC={c.current.tempC}
          feelsLikeC={c.current.feelsLikeC}
          windKph={c.current.windKph}
          chanceOfRain={forecast.data?.today.chanceOfRain}
        />
      </div>
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
      <AstroCard astro={forecast.data?.astro} lat={c.location.lat} />
      <ExposureCard
        uv={c.current.uv}
        airQualityIndex={forecast.data?.airQualityIndex ?? null}
        pressureMb={c.current.pressureMb}
        isDay={c.current.timeOfDay === "day"}
      />
    </div>
  );
}
