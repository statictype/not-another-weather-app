import {
  CloudIcon,
  DropletsIcon,
  EyeIcon,
  GaugeIcon,
  MoonIcon,
  MoonStarIcon,
  SunIcon,
  SunriseIcon,
  SunsetIcon,
  ThermometerIcon,
  UmbrellaIcon,
  WindIcon,
  ZapIcon,
} from "lucide-react";
import type { ForecastDay, WeatherResponse } from "@/api/types";
import { cn } from "@/lib/utils";

interface WeatherCardProps {
  data: WeatherResponse;
  isStale?: boolean;
}

export function WeatherCard({ data, isStale = false }: WeatherCardProps) {
  const { location, current, today } = data;
  const forecast = data.forecast ?? [];
  const astro = data.astro ?? {
    sunrise: "—",
    sunset: "—",
    moonrise: "—",
    moonset: "—",
    moonPhase: "—",
    moonIllumination: 0,
  };
  const isDay = current.timeOfDay === "day";
  const swapKey = `${location.name}-${location.country}`;

  return (
    <div
      key={swapKey}
      aria-busy={isStale}
      className={cn(
        "grid w-full auto-rows-[minmax(150px,auto)] grid-cols-1 gap-4 transition-opacity duration-300 sm:grid-cols-12 sm:gap-5",
        isStale && "opacity-60",
      )}
    >
      {/* HERO ─── 8 col × 2 rows */}
      <section className="swap-in swap-d-1 relative col-span-1 overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 p-8 text-white shadow-[0_30px_60px_-25px_rgba(56,140,255,0.55)] sm:col-span-8 sm:row-span-2 sm:p-10">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-cyan-300/40 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between gap-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display font-light text-xs uppercase tracking-[0.22em] text-white/75">
                {[location.region, location.country].filter(Boolean).join(" · ") || "Now"}
              </p>
              <h2 className="font-display font-light mt-2 text-6xl leading-[0.95] tracking-tight sm:text-8xl">
                {location.name}
              </h2>
            </div>
            <div className="inline-flex shrink-0 items-center gap-3 rounded-full bg-white/20 px-5 py-3 text-sm uppercase tracking-[0.18em] backdrop-blur">
              {isDay ? (
                <SunIcon className="size-7" strokeWidth={2.25} aria-hidden="true" />
              ) : (
                <MoonStarIcon className="size-7" strokeWidth={2.25} aria-hidden="true" />
              )}
              <span className="font-display font-light">{isDay ? "Daylight" : "Night"}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-start">
              <span className="font-display text-[10rem] leading-[0.78] tracking-[-0.06em] sm:text-[14rem]">
                {Math.round(current.tempC)}
              </span>
              <span className="font-display font-light mt-4 ml-2 text-5xl text-white/70">
                °C
              </span>
            </div>
            <div className="pb-3 text-right">
              <p className="font-display font-light text-3xl sm:text-4xl">
                {current.conditionText}
              </p>
              <p className="font-display font-normal mt-2 text-xs uppercase tracking-[0.2em] text-white/75">
                Feels like {Math.round(current.feelsLikeC)}°
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3-DAY FORECAST ─── 4 col × 2 rows */}
      <section className="swap-in swap-d-2 bento-tile flex flex-col gap-3 p-7 sm:col-span-4 sm:row-span-2 sm:p-8">
        <TileLabel icon={<ThermometerIcon className="size-6" strokeWidth={1.75} />}>
          3-day outlook
        </TileLabel>
        <div className="flex flex-1 flex-col justify-between gap-3 pt-2">
          {forecast.slice(0, 3).map((day, i) => (
            <ForecastRow key={day.date} day={day} index={i} />
          ))}
          {forecast.length === 0 && (
            <p className="font-display font-light text-foreground/40 text-sm">
              No forecast available
            </p>
          )}
        </div>
      </section>

      {/* SUN ─── 4 col × 2 rows TALL */}
      <section className="swap-in swap-d-3 tile-sun bento-tile relative overflow-hidden p-7 sm:col-span-4 sm:row-span-2">
        <div className="absolute -right-12 -top-12 size-44 rounded-full bg-amber-300/50 blur-2xl" />
        <div className="absolute -bottom-16 right-10 size-32 rounded-full bg-orange-300/40 blur-2xl" />
        <TileLabel icon={<SunIcon className="size-6 text-amber-600" strokeWidth={1.75} />}>
          Sun
        </TileLabel>

        <div className="relative mt-8 flex flex-col gap-7">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/60 p-3 backdrop-blur">
              <SunriseIcon
                className="size-10 text-amber-600"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="font-display text-5xl leading-none tracking-tight">
                {formatClock(astro.sunrise)}
              </p>
              <p className="font-display font-normal text-foreground/55 mt-1.5 text-[11px] uppercase tracking-[0.18em]">
                Sunrise
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/60 p-3 backdrop-blur">
              <SunsetIcon
                className="size-10 text-orange-600"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="font-display text-5xl leading-none tracking-tight">
                {formatClock(astro.sunset)}
              </p>
              <p className="font-display font-normal text-foreground/55 mt-1.5 text-[11px] uppercase tracking-[0.18em]">
                Sunset
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MOON ─── 4 col */}
      <section className="swap-in swap-d-4 bento-tile relative overflow-hidden bg-gradient-to-br from-indigo-100 via-indigo-50 to-slate-100 p-7 sm:col-span-4">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br from-slate-200 via-indigo-100 to-indigo-300 shadow-inner" />
        <div className="relative flex h-full flex-col justify-between">
          <TileLabel icon={<MoonIcon className="size-6 text-indigo-500" strokeWidth={1.75} />}>
            Moon
          </TileLabel>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-7xl leading-none tracking-tight">
              {astro.moonIllumination}
            </span>
            <span className="font-display font-light text-foreground/55 text-3xl">
              %
            </span>
          </div>
          <p className="font-display font-normal text-foreground/65 mt-2 text-sm uppercase tracking-[0.14em]">
            {astro.moonPhase}
          </p>
        </div>
      </section>

      {/* UV ─── 4 col */}
      <section className="swap-in swap-d-5 bento-tile relative overflow-hidden bg-gradient-to-br from-fuchsia-200 via-pink-100 to-orange-100 p-7 sm:col-span-4">
        <ZapIcon
          className="absolute right-5 top-5 size-12 text-fuchsia-500/70"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <TileLabel>UV index</TileLabel>
        <p className="font-display mt-6 text-7xl leading-none tracking-tight">
          {Math.round(current.uv ?? 0)}
        </p>
        <p className="font-display font-normal text-foreground/65 mt-3 text-sm uppercase tracking-[0.16em]">
          {uvLabel(current.uv ?? 0)}
        </p>
      </section>

      {/* WIND ─── 5 col, tall row */}
      <section className="swap-in swap-d-1 tile-wind bento-tile relative overflow-hidden p-7 sm:col-span-5">
        <WindIcon
          className="text-foreground/40 absolute right-6 top-6 size-14"
          strokeWidth={1.25}
          aria-hidden="true"
        />
        <TileLabel>Wind · {current.windDir}</TileLabel>
        <div className="mt-5 flex items-baseline gap-2">
          <span className="font-display text-7xl leading-none tracking-tight">
            {Math.round(current.windKph)}
          </span>
          <span className="font-display font-light text-foreground/55 text-2xl">
            km/h
          </span>
        </div>
        <p className="font-display font-normal text-foreground/55 mt-3 text-xs uppercase tracking-[0.16em]">
          Gusts {Math.round(current.gustKph ?? 0)} km/h
        </p>
      </section>

      {/* HUMIDITY ─── 3 col */}
      <section className="swap-in swap-d-2 tile-drop bento-tile relative overflow-hidden p-7 sm:col-span-3">
        <DropletsIcon
          className="text-foreground/40 absolute right-5 top-5 size-12"
          strokeWidth={1.25}
          aria-hidden="true"
        />
        <TileLabel>Humidity</TileLabel>
        <div className="mt-6 flex items-baseline gap-1.5">
          <span className="font-display text-6xl leading-none tracking-tight">
            {current.humidity}
          </span>
          <span className="font-display font-light text-foreground/55 text-2xl">
            %
          </span>
        </div>
      </section>

      {/* RAIN ─── 4 col */}
      <section className="swap-in swap-d-3 tile-rain bento-tile relative overflow-hidden p-7 sm:col-span-4">
        <UmbrellaIcon
          className="text-foreground/40 absolute right-5 top-5 size-12"
          strokeWidth={1.25}
          aria-hidden="true"
        />
        <TileLabel>Chance of rain</TileLabel>
        <div className="mt-6 flex items-baseline gap-1.5">
          <span className="font-display text-7xl leading-none tracking-tight">
            {today.chanceOfRain}
          </span>
          <span className="font-display font-light text-foreground/55 text-2xl">
            %
          </span>
        </div>
        {(current.precipMm ?? 0) > 0 && (
          <p className="font-display font-normal text-foreground/55 mt-2 text-xs uppercase tracking-[0.16em]">
            {current.precipMm} mm now
          </p>
        )}
      </section>

      {/* PRESSURE ─── 4 col × 2 rows TALL */}
      <section className="swap-in swap-d-4 tile-feels bento-tile relative overflow-hidden p-7 sm:col-span-4 sm:row-span-2">
        <GaugeIcon
          className="text-foreground/30 absolute -right-6 -top-6 size-44"
          strokeWidth={0.9}
          aria-hidden="true"
        />
        <TileLabel>Pressure</TileLabel>
        <div className="relative mt-8 flex items-baseline gap-2">
          <span className="font-display text-[7rem] leading-[0.85] tracking-tight">
            {Math.round(current.pressureMb ?? 0)}
          </span>
        </div>
        <p className="font-display font-normal text-foreground/55 mt-1 text-base uppercase tracking-[0.18em]">
          millibars
        </p>
        <div className="relative mt-6 grid grid-cols-2 gap-4 border-t border-foreground/10 pt-5">
          <div>
            <p className="font-display text-3xl tracking-tight">
              {Math.round(current.dewpointC ?? 0)}°
            </p>
            <p className="font-display font-normal text-foreground/55 mt-1 text-[10px] uppercase tracking-[0.18em]">
              Dew point
            </p>
          </div>
          <div>
            <p className="font-display text-3xl tracking-tight">
              {Math.round(today.maxC)}°/{Math.round(today.minC)}°
            </p>
            <p className="font-display font-normal text-foreground/55 mt-1 text-[10px] uppercase tracking-[0.18em]">
              Today's range
            </p>
          </div>
        </div>
      </section>

      {/* VISIBILITY ─── 4 col */}
      <section className="swap-in swap-d-5 bento-tile relative overflow-hidden bg-gradient-to-br from-teal-100 via-cyan-50 to-sky-100 p-7 sm:col-span-4">
        <EyeIcon
          className="text-foreground/40 absolute right-5 top-5 size-12"
          strokeWidth={1.25}
          aria-hidden="true"
        />
        <TileLabel>Visibility</TileLabel>
        <div className="mt-6 flex items-baseline gap-1.5">
          <span className="font-display text-7xl leading-none tracking-tight">
            {Math.round(current.visibilityKm ?? 0)}
          </span>
          <span className="font-display font-light text-foreground/55 text-2xl">
            km
          </span>
        </div>
      </section>

      {/* CLOUD ─── 4 col */}
      <section className="swap-in swap-d-6 bento-tile relative overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-7 sm:col-span-4">
        <CloudIcon
          className="text-foreground/40 absolute right-5 top-5 size-12"
          strokeWidth={1.25}
          aria-hidden="true"
        />
        <TileLabel>Cloud cover</TileLabel>
        <div className="mt-6 flex items-baseline gap-1.5">
          <span className="font-display text-7xl leading-none tracking-tight">
            {current.cloud ?? 0}
          </span>
          <span className="font-display font-light text-foreground/55 text-2xl">
            %
          </span>
        </div>
      </section>
    </div>
  );
}

/* ─────────────── helpers ─────────────── */

function TileLabel({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <p className="font-display font-normal text-foreground/55 flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
      {icon}
      {children}
    </p>
  );
}

function ForecastRow({ day, index }: { day: ForecastDay; index: number }) {
  const label = forecastLabel(day.date, index);
  return (
    <div className="border-foreground/10 flex items-center justify-between gap-3 border-b border-dashed pb-3 last:border-b-0 last:pb-0">
      <div className="flex flex-col">
        <span className="font-display text-3xl leading-none tracking-tight">
          {Math.round(day.maxC)}°
        </span>
        <span className="font-display font-normal text-foreground/55 mt-1.5 text-[10px] uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <div className="font-display font-light text-foreground/65 flex-1 truncate text-right text-sm">
        {day.conditionText}
      </div>
      <span className="font-display font-light text-foreground/45 w-10 text-right text-base">
        {Math.round(day.minC)}°
      </span>
    </div>
  );
}

function formatClock(t: string): string {
  const [time, ampm] = t.trim().split(" ");
  if (!time) return t;
  const [h, m] = time.split(":");
  const hour = Number.parseInt(h ?? "0", 10);
  const suffix = ampm ? ampm.toLowerCase() : "";
  return `${hour}:${m}${suffix ? ` ${suffix}` : ""}`;
}

function uvLabel(uv: number): string {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

function forecastLabel(date: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  try {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { weekday: "short" });
  } catch {
    return date;
  }
}
