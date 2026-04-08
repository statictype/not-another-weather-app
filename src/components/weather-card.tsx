import {
  ActivityIcon,
  BubblesIcon,
  CloudDrizzleIcon,
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudMoonIcon,
  CloudMoonRainIcon,
  CloudRainIcon,
  CloudRainWindIcon,
  CloudSnowIcon,
  CloudSunIcon,
  CloudSunRainIcon,
  DropletsIcon,
  EyeIcon,
  GaugeIcon,
  type LucideIcon,
  MoonIcon,
  MoonStarIcon,
  SunIcon,
  SunriseIcon,
  SunsetIcon,
  WindIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ForecastDay, WeatherResponse } from "@/api/types";
import { cn } from "@/lib/utils";

/** Ticks every second and returns the current time string in the given tz. */
function useLocalTime(tz: string): string {
  const [now, setNow] = useState(() => formatLocalTime(tz));
  useEffect(() => {
    setNow(formatLocalTime(tz));
    const id = setInterval(() => setNow(formatLocalTime(tz)), 1000);
    return () => clearInterval(id);
  }, [tz]);
  return now;
}

function formatLocalTime(tz: string): string {
  try {
    return new Date()
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

interface WeatherCardProps {
  data: WeatherResponse;
  isStale?: boolean;
}

export function WeatherCard({ data, isStale = false }: WeatherCardProps) {
  const { location, current, today } = data;
  const forecast = data.forecast ?? [];
  const days: Array<{ day: ForecastDay; label: string }> = [
    ...(data.yesterday ? [{ day: data.yesterday, label: "Yesterday" }] : []),
    ...forecast.slice(0, 3).map((d, i) => ({ day: d, label: forecastLabel(d.date, i) })),
  ];
  const astro = data.astro ?? {
    sunrise: "—",
    sunset: "—",
    moonrise: "—",
    moonset: "—",
    moonPhase: "—",
    moonIllumination: 0,
  };
  const isDay = current.timeOfDay === "day";
  const ConditionIcon = conditionIcon(current.conditionText, isDay);
  const localTime = useLocalTime(location.tz);
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
      <section
        className={cn(
          "swap-in swap-d-1 relative col-span-1 overflow-hidden rounded-[2rem] p-8 text-white sm:col-span-12 sm:p-10 lg:col-span-8",
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
          {/* Location label — always full width */}
          <p className="font-display font-medium text-xs uppercase tracking-[0.22em] text-white/80">
            {[location.region, location.country].filter(Boolean).join(" · ") || "Now"}
          </p>

          {/* Mobile: 2-col [left content | icon], condition details full-width below.
              sm+:    3-col [left | icon | right] */}
          <div className="grid flex-1 grid-cols-[1fr_auto] items-start gap-x-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-1">
            {/* Left: city + temp + feels like */}
            <div className="flex min-w-0 flex-col">
              <h2 className="font-display font-light text-balance text-3xl leading-[0.95] tracking-tight sm:text-4xl 2xl:text-5xl">
                {location.name}
              </h2>
              <div className="mt-4 flex items-start sm:mt-6">
                <span className="font-display text-[4rem] leading-[0.78] tracking-[-0.06em] sm:text-[5.5rem] lg:text-[7rem]">
                  {Math.round(current.tempC)}
                </span>
                <span className="font-display font-light mt-3 ml-2 text-3xl text-white/70">°C</span>
              </div>
              <p className="font-display font-medium mt-2 text-xs uppercase tracking-[0.2em] text-white/85">
                Feels like {Math.round(current.feelsLikeC)}°
              </p>
            </div>

            {/* Mobile: top-right icon. sm+: center column */}
            <div className="flex items-start justify-center pt-3 sm:items-center sm:px-3 sm:pt-0">
              <ConditionIcon
                className={cn(
                  "size-20 sm:size-28 md:size-36 lg:size-40 xl:size-52",
                  isDay ? "text-white/90" : "text-[oklch(0.52_0.02_250)]",
                )}
                strokeWidth={1}
                aria-hidden="true"
              />
            </div>

            {/* Mobile: full-width below. sm+: right column */}
            <div className="col-span-2 mt-3 flex flex-col gap-1.5 text-right sm:col-span-1 sm:mt-0 sm:gap-3">
              <p className="font-display font-normal text-xl sm:text-2xl 2xl:text-3xl">
                {current.conditionText}
              </p>
              <p className="font-display font-normal text-sm text-white/90">
                {today.chanceOfRain}% chance of rain
              </p>
              <p className="font-display font-normal text-white/90">
                <span className="text-xl">{Math.round(today.maxC)}°</span>
                <span className="text-sm"> / {Math.round(today.minC)}°</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ATMOSPHERE ─── 4 col × 2 rows */}
      <section className="swap-in swap-d-2 bento-tile flex flex-col p-7 sm:col-span-6 sm:row-span-2 lg:col-span-4 lg:row-span-1">
        <ul className="flex flex-1 flex-col divide-y divide-foreground/10">
          <AtmosphereRow icon={DropletsIcon} label="Humidity" value={`${current.humidity}%`} />
          <AtmosphereRow icon={CloudIcon} label="Cloud cover" value={`${current.cloud ?? 0}%`} />
          <AtmosphereRow
            icon={GaugeIcon}
            label="Pressure"
            value={`${Math.round(current.pressureMb ?? 0)} mb`}
          />
          <AtmosphereRow
            icon={BubblesIcon}
            label="Dew point"
            value={`${Math.round(current.dewpointC ?? 0)}°`}
          />

          <AtmosphereRow
            icon={EyeIcon}
            label="Visibility"
            value={`${Math.round(current.visibilityKm ?? 0)} km`}
          />
        </ul>
      </section>

      {/* LOCAL TIME */}
      <section className="swap-in swap-d-3 tile-sun flex items-center bento-tile relative overflow-hidden p-7 sm:col-span-6 lg:col-span-2">
        {isDay && (
          <div className="absolute -right-16 -top-16 size-56 rounded-full bg-rose-300/40 blur-3xl" />
        )}
        <div className="relative">
          <p className="font-display font-normal text-foreground/55 text-[10px] uppercase tracking-[0.2em] 2xl:text-xs">
            Local time
          </p>
          <p className="font-display font-light mt-2 text-4xl leading-none tracking-tight lg:text-2xl xl:text-4xl 2xl:text-5xl">
            {localTime}
          </p>
        </div>
      </section>

      {/* ASTRO (sunrise/sunset/moon) */}
      <section className="swap-in swap-d-3b bento-tile relative overflow-hidden p-7 sm:col-span-6 lg:col-span-4">
        <div className="flex flex-col lg:divide-y lg:divide-foreground/10">
          <SkyRow
            icon={
              <SunriseIcon
                className="text-foreground/70 size-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            value={formatClock(astro.sunrise)}
            label="Sunrise"
          />
          <SkyRow
            icon={
              <SunsetIcon
                className="text-foreground/70 size-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            value={formatClock(astro.sunset)}
            label="Sunset"
          />
          <SkyRow
            icon={
              <MoonIcon
                className="text-foreground/70 size-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            value={astro.moonPhase}
            label={`${astro.moonIllumination}% illuminated`}
          />
        </div>
      </section>

      {/* WIND ─── 5 col */}
      <section className="swap-in swap-d-4 tile-wind bento-tile relative overflow-hidden p-7 sm:col-span-8 lg:col-span-4">
        <WindIcon
          className="text-foreground/30 absolute -right-6 -top-6 size-44"
          strokeWidth={0.9}
          aria-hidden="true"
        />
        <TileLabel>Wind</TileLabel>
        <div className="relative mt-2 flex items-baseline gap-2">
          <span className="font-display text-5xl leading-[0.85] tracking-tight">
            {Math.round(current.windKph)}
          </span>
          <span className="font-display font-light text-foreground/55 text-base">km/h</span>
        </div>
        <p className="font-display font-normal text-foreground/55 mt-1.5 text-[10px] uppercase tracking-[0.18em] 2xl:text-xs">
          {beaufort(current.windKph)}
        </p>
        <div className="relative mt-3 grid grid-cols-3 gap-3 border-t border-foreground/10 pt-3">
          <WindStat
            label="Direction"
            value={current.windDir}
            sub={compassDegrees(current.windDir)}
          />
          <WindStat label="Gusts" value={`${Math.round(current.gustKph ?? 0)}`} sub="km/h" />
          <WindStat label="In mph" value={`${Math.round(current.windKph * 0.621371)}`} sub="mph" />
        </div>
      </section>

      {/* UV INDEX ─── 4 col */}
      <section
        className={cn(
          "swap-in swap-d-5 bento-tile relative overflow-hidden p-7 sm:col-span-4 lg:col-span-2",
          !isDay && "tile-uv-off opacity-55",
        )}
        style={{ background: isDay ? uvTint(current.uv ?? 0) : undefined }}
      >
        <ActivityIcon
          className="text-foreground/30 absolute -right-6 -top-6 size-44"
          strokeWidth={0.9}
          aria-hidden="true"
        />
        <TileLabel>UV index</TileLabel>
        <p
          className={cn(
            "font-display mt-4 text-5xl leading-none tracking-tight",
            !isDay && "text-white/25",
          )}
        >
          {isDay ? Math.round(current.uv ?? 0) : "—"}
        </p>
        {isDay && (
          <p className="font-display font-normal text-foreground/65 mt-3 text-sm uppercase tracking-[0.16em]">
            {uvLabel(current.uv ?? 0)}
          </p>
        )}
      </section>

      {/* FORECAST STRIP ─── 12 col */}
      <section className="swap-in swap-d-6 bento-tile flex flex-col p-7 sm:col-span-12">
        <div
          className={cn(
            "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-0 sm:gap-y-6 sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(odd)]:border-foreground/10 md:grid-cols-4 md:gap-0 md:[&>*]:border-r md:[&>*]:border-foreground/10 md:[&>*:last-child]:border-r-0",
          )}
        >
          {days.map(({ day, label }) => (
            <div key={day.date} className="sm:px-6">
              <ForecastRow day={day} label={label} />
            </div>
          ))}
          {days.length === 0 && (
            <p className="font-display font-light text-foreground/40 text-sm">
              No forecast available
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

/* ─────────────── helpers ─────────────── */

function TileLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <p className="font-display font-normal text-foreground/55 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] 2xl:text-xs">
      {icon}
      {children}
    </p>
  );
}

function AtmosphereRow({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <li className="flex flex-1 items-center justify-between gap-4 py-3 first:pt-2 last:pb-0">
      <div className="flex items-center gap-3">
        <Icon className="text-foreground/55 size-6" strokeWidth={1.5} aria-hidden="true" />
        <div className="flex flex-col">
          <span className="font-display font-normal text-foreground/65 text-xs uppercase tracking-[0.14em]">
            {label}
          </span>
          {sub && (
            <span className="font-display font-light text-foreground/45 text-[11px]">{sub}</span>
          )}
        </div>
      </div>
      <span className="font-display text-xl tracking-tight">{value}</span>
    </li>
  );
}

function SkyRow({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 py-2 first:pt-0 last:pb-0 lg:py-3">
      <div className="bg-foreground/10 shrink-0 rounded-xl p-2 backdrop-blur">{icon}</div>
      <div>
        <p className="font-display text-base leading-tight tracking-tight">{value}</p>
        <p className="font-display font-normal text-foreground/55 text-[10px] uppercase tracking-[0.16em]">
          {label}
        </p>
      </div>
    </div>
  );
}

function ForecastRow({ day, label }: { day: ForecastDay; label: string }) {
  const Icon = conditionIcon(day.conditionText, day.isDay);
  return (
    <div className="flex items-center gap-3">
      <Icon className="text-foreground/60 size-10 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-display font-normal text-foreground/55 text-[10px] uppercase tracking-[0.18em]">
          {label}
        </span>
        <span className="font-display mt-1 text-3xl leading-none tracking-tight">
          {Math.round(day.maxC)}°
          <span className="font-display font-light text-foreground/45 ml-1 text-base">
            / {Math.round(day.minC)}°
          </span>
        </span>
        <span className="font-display font-light text-foreground/55 mt-1 truncate text-xs">
          {day.conditionText}
        </span>
      </div>
    </div>
  );
}

function WindStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="font-display font-normal text-foreground/55 text-[10px] uppercase tracking-[0.18em]">
        {label}
      </p>
      <p className="font-display mt-0.5 text-lg tracking-tight">
        {value}
        {sub && (
          <span className="font-display font-light text-foreground/45 ml-1 text-sm">{sub}</span>
        )}
      </p>
    </div>
  );
}

function beaufort(kph: number): string {
  if (kph < 1) return "Calm";
  if (kph < 6) return "Light air";
  if (kph < 12) return "Light breeze";
  if (kph < 20) return "Gentle breeze";
  if (kph < 29) return "Moderate breeze";
  if (kph < 39) return "Fresh breeze";
  if (kph < 50) return "Strong breeze";
  if (kph < 62) return "Near gale";
  if (kph < 75) return "Gale";
  if (kph < 89) return "Strong gale";
  if (kph < 103) return "Storm";
  if (kph < 118) return "Violent storm";
  return "Hurricane";
}

function compassDegrees(dir: string): string {
  const map: Record<string, number> = {
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5,
  };
  const deg = map[dir.toUpperCase()];
  return deg !== undefined ? `${deg}°` : "";
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

/** Pastel OKLCH gradients matching UV severity buckets (same style as .tile-*). */
function uvTint(uv: number): string {
  if (uv < 3) {
    // Low — green
    return "linear-gradient(160deg, oklch(0.94 0.09 150 / 0.95), oklch(0.88 0.12 155 / 0.7))";
  }
  if (uv < 6) {
    // Moderate — yellow-green
    return "linear-gradient(160deg, oklch(0.95 0.10 115 / 0.95), oklch(0.90 0.13 110 / 0.7))";
  }
  if (uv < 8) {
    // High — yellow
    return "linear-gradient(160deg, oklch(0.95 0.11 90 / 0.95), oklch(0.89 0.14 85 / 0.7))";
  }
  if (uv < 11) {
    // Very high — orange
    return "linear-gradient(160deg, oklch(0.92 0.12 60 / 0.95), oklch(0.84 0.15 45 / 0.7))";
  }
  // Extreme — red
  return "linear-gradient(160deg, oklch(0.88 0.13 30 / 0.95), oklch(0.78 0.17 20 / 0.75))";
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

function conditionIcon(text: string, isDay: boolean): LucideIcon {
  const t = text.toLowerCase();
  if (/thunder|lightning/.test(t)) return CloudLightningIcon;
  if (/snow|sleet|blizzard|ice/.test(t)) return CloudSnowIcon;
  if (/fog|mist|haze/.test(t)) return CloudFogIcon;

  const partial = /patchy|nearby|partial/.test(t);
  const rainy = /rain|drizzle|shower/.test(t);

  if (rainy) {
    if (partial) return isDay ? CloudSunRainIcon : CloudMoonRainIcon;
    if (/drizzle|light/.test(t)) return CloudDrizzleIcon;
    if (/heavy|torrential|downpour/.test(t)) return CloudRainWindIcon;
    return CloudRainIcon;
  }

  if (/partly|partial/.test(t)) return isDay ? CloudSunIcon : CloudMoonIcon;
  if (/cloud|overcast/.test(t)) return CloudIcon;
  if (/clear|sun/.test(t)) return isDay ? SunIcon : MoonStarIcon;
  return isDay ? SunIcon : MoonStarIcon;
}
