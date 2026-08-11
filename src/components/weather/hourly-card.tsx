import { useCallback, useEffect, useRef, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon, DropletIcon, DropletOffIcon } from "lucide-react";
import type { HourlyForecast } from "@/api/types";
import { cn } from "@/lib/utils";
import { ConditionIcon } from "./condition-icon";

interface HourlyCardProps {
  hourly: HourlyForecast[] | undefined;
  tz: string;
}

export function HourlyCard({ hourly, tz }: HourlyCardProps) {
  const slots = hourly ? pickSlots(hourly, tz) : undefined;

  return (
    <section className="swap-in swap-d-3 bento-tile flex flex-col p-6">
      <p className="label-section">Hourly</p>
      <div className="mt-4">
        {slots ? (
          <HourlyStrip slots={slots} />
        ) : (
          <div className="flex">
            {Array.from({ length: 4 }, (_, i) => (
              <SlotSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HourlyStrip({ slots }: { slots: HourlyForecast[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    check();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [check]);

  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 180, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        className={cn(
          "absolute -left-2 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/8 text-foreground/60 transition-opacity duration-200 hover:bg-foreground/12",
          canLeft ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronLeftIcon className="size-4" strokeWidth={2} />
      </button>

      <div ref={ref} className="scrollbar-none flex overflow-x-auto divide-x divide-foreground/6">
        {slots.map((s) => (
          <Slot key={s.time} slot={s} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        className={cn(
          "absolute -right-2 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/8 text-foreground/60 transition-opacity duration-200 hover:bg-foreground/12",
          canRight ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronRightIcon className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function Slot({ slot }: { slot: HourlyForecast }) {
  const label = formatHourLabel(slot.time);
  const temp = Math.round(slot.tempC);
  const feels = Math.round(slot.feelsLikeC);
  const max = Math.max(temp, feels);
  const min = Math.min(temp, feels);
  const collapse = max - min < 2;
  const noRain = slot.chanceOfRain === 0;

  return (
    <div className="flex w-20 shrink-0 flex-col items-center gap-1.5">
      <span className="label-section">{label}</span>
      <ConditionIcon
        text={slot.conditionText}
        isDay={slot.isDay}
        className="size-7 shrink-0 text-foreground/55"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className="leading-none tracking-tight">
        <span className="text-lg">{max}°</span>
        {!collapse && <span className="ml-0.5 text-xs text-foreground/70">{min}°</span>}
      </span>
      <span className="flex items-center gap-0.5 text-foreground/70">
        {noRain ? (
          <DropletOffIcon
            className="size-3.5 shrink-0 text-foreground/55 md:size-4.5"
            strokeWidth={2}
            aria-hidden="true"
          />
        ) : (
          <>
            <DropletIcon
              className="size-3 shrink-0 md:size-4.5"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="text-xs">{slot.chanceOfRain}%</span>
          </>
        )}
      </span>
    </div>
  );
}

function SlotSkeleton() {
  return (
    <div className="flex w-20 shrink-0 flex-col items-center gap-1.5" aria-hidden="true">
      <div className="h-3 w-8 animate-pulse rounded bg-foreground/10" />
      <div className="size-7 animate-pulse rounded-full bg-foreground/10" />
      <div className="h-4 w-10 animate-pulse rounded bg-foreground/10" />
      <div className="h-3 w-7 animate-pulse rounded bg-foreground/10" />
    </div>
  );
}

function pickSlots(hourly: HourlyForecast[], tz: string): HourlyForecast[] {
  const { hour: nowHour, date: nowDate } = localNow(tz);

  const hourMap = new Map<string, HourlyForecast>();
  for (const h of hourly) {
    const key = h.time.replace(/:00$/, "").trim();
    hourMap.set(key, h);
  }

  const results: HourlyForecast[] = [];

  for (let offset = 1; offset <= 24; offset++) {
    const targetHour = nowHour + offset;
    const { date, hour } = rollForward(nowDate, targetHour);
    const hh = String(hour).padStart(2, "0");
    const key = `${date} ${hh}`;
    const match = hourMap.get(key);
    if (match) results.push(match);
  }

  return results;
}

function localNow(tz: string): { hour: number; date: string } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  const h = Number(parts.find((p) => p.type === "hour")!.value);
  return { hour: h === 24 ? 0 : h, date: `${y}-${m}-${d}` };
}

function rollForward(date: string, hour: number): { date: string; hour: number } {
  if (hour < 24) return { date, hour };
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + Math.floor(hour / 24));
  const rolled = d.toISOString().slice(0, 10);
  return { date: rolled, hour: hour % 24 };
}

function formatHourLabel(time: string): string {
  const parts = time.split(" ");
  const timePart = parts[1] ?? "00:00";
  const hour = Number.parseInt(timePart.split(":")[0] ?? "0", 10);
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}
