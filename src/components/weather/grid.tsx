import type { WeatherCurrent } from "@/api/types";
import { cn } from "@/lib/utils";
import { useWeatherForecast } from "@/hooks/use-weather";
import { AlertsCard } from "./alerts-card";
import { demoAlerts } from "./alerts-demo";
import { AstroCard } from "./astro-card";
import { ExposureCard } from "./exposure-card";
import { ForecastCard } from "./forecast-card";
import { HeroCard } from "./hero-card";
import { HourlyCard } from "./hourly-card";
import { NowCard } from "./now-card";
import { PressureCard } from "./pressure-card";
import { WindCard } from "./wind-card";

interface WeatherGridProps {
  query: string | null;
  current: WeatherCurrent;
  isStale: boolean;
}

export function WeatherGrid({ query, current: c, isStale }: WeatherGridProps) {
  const forecast = useWeatherForecast(query);

  const swapKey = `${c.location.name}-${c.location.country}`;

  return (
    <div
      key={swapKey}
      aria-busy={isStale}
      className={cn(
        "grid w-full auto-rows-[minmax(150px,auto)] grid-cols-1 gap-5 transition-opacity duration-300 sm:grid-cols-4 sm:gap-6",
        isStale && "opacity-60",
      )}
    >
      <HeroCard location={c.location} current={c.current} />

      {/* One cell at every width: `auto-rows` floors a row at 150px, which is
          taller than the alert strip. */}
      <div className="flex flex-col gap-5 sm:col-span-4 sm:gap-6 xl:order-2 xl:col-span-1">
        <AlertsCard
          alerts={demoAlerts() ?? forecast.data?.alerts}
          tz={c.location.tz}
          isNight={c.current.timeOfDay === "night"}
        />
        <NowCard current={c.current} />
      </div>
      <HourlyCard hourly={forecast.data?.hourly} tz={c.location.tz} />
      <ForecastCard forecast={forecast.data?.forecast} />
      <AstroCard astro={forecast.data?.astro} lat={c.location.lat} />
      <ExposureCard
        uv={c.current.uv}
        airQualityIndex={forecast.data?.airQualityIndex ?? null}
        isDay={c.current.timeOfDay === "day"}
      />
      <WindCard
        windKph={c.current.windKph}
        windDir={c.current.windDir}
        windDegree={c.current.windDegree}
        gustKph={c.current.gustKph}
      />
      <PressureCard pressureMb={c.current.pressureMb} />
    </div>
  );
}
