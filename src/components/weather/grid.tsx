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

  const alerts = demoAlerts() ?? forecast.data?.alerts;
  const hasAlerts = alerts !== undefined && alerts.length > 0;

  return (
    <div
      key={swapKey}
      aria-busy={isStale}
      className={cn(
        // 8 columns from `md` to `xl`, so the Now column can take 3 of them —
        // 1.5 of the 4-column track the other breakpoints use.
        "grid w-full auto-rows-[minmax(150px,auto)] grid-cols-1 gap-5 transition-opacity duration-300 sm:grid-cols-4 sm:gap-6 md:grid-cols-8 xl:grid-cols-4",
        // Row 2 holds the alert strip alone from `md` to `xl`, so it is sized by
        // its content instead of the 150px floor `auto-rows` puts on every row.
        hasAlerts && "md:grid-rows-[auto_auto] xl:grid-rows-none",
        isStale && "opacity-60",
      )}
    >
      <HeroCard location={c.location} current={c.current} />

      {/* One cell below `md` and from `xl`: `auto-rows` floors a row at 150px,
          which is taller than the alert strip. Between them the wrapper is
          `display: contents`, so both cards place themselves on the grid. */}
      <div className="flex flex-col gap-5 sm:col-span-4 sm:gap-6 md:contents xl:order-2 xl:col-span-1 xl:row-span-1 xl:flex">
        <AlertsCard
          alerts={alerts}
          tz={c.location.tz}
          isNight={c.current.timeOfDay === "night"}
          className="md:col-span-8"
        />
        <NowCard current={c.current} className="md:col-span-3 md:row-span-2" />
      </div>
      <HourlyCard hourly={forecast.data?.hourly} tz={c.location.tz} />
      <ForecastCard forecast={forecast.data?.forecast} />
      <AstroCard
        astro={forecast.data?.astro}
        lat={c.location.lat}
        isNight={c.current.timeOfDay === "night"}
      />
      <ExposureCard
        uv={c.current.uv}
        airQualityIndex={forecast.data?.airQualityIndex ?? null}
        isDay={c.current.timeOfDay === "day"}
      />
      <WindCard
        wind={c.current.wind}
        windDir={c.current.windDir}
        windDegree={c.current.windDegree}
        gust={c.current.gust}
      />
      <PressureCard pressureMb={c.current.pressureMb} pressure={c.current.pressure} />
    </div>
  );
}
