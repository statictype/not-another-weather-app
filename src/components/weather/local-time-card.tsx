import { useEffect, useState } from "react";

interface LocalTimeCardProps {
  tz: string;
  isDay: boolean;
}

/**
 * Ticks its own 1-second interval in isolation. Because this is its own
 * component, the tick re-renders only this tile — hero, wind, UV,
 * forecast, etc. stay untouched. This is the biggest perf win from
 * splitting the weather card: the old monolithic card re-rendered all
 * 546 LOC of JSX every second.
 */
export function LocalTimeCard({ tz, isDay }: LocalTimeCardProps) {
  const localTime = useLocalTime(tz);

  return (
    <section className="swap-in swap-d-3 tile-sun flex items-center bento-tile relative overflow-hidden p-7 sm:col-span-6 xl:col-span-2">
      {isDay && (
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-rose-300/40 blur-3xl" />
      )}
      <div className="relative">
        <p className="font-display font-normal text-foreground/55 text-[10px] uppercase tracking-[0.2em] 2xl:text-xs">
          Local time
        </p>
        <p className="font-display font-light mt-3 text-4xl leading-none tracking-tight xl:text-2xl 2xl:text-4xl">
          {localTime}
        </p>
      </div>
    </section>
  );
}

function useLocalTime(tz: string): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return formatLocalTime(tz);
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
