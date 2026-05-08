import type { ForecastDay } from "@/api/types";
import { ConditionIcon } from "./condition-icon";

interface ForecastCardProps {
  /** 3-day forecast days (today first). Undefined until the forecast tier lands. */
  forecast: ForecastDay[] | undefined;
  /** Previous day. Undefined while pending; null when unavailable. */
  yesterday: ForecastDay | null | undefined;
}

export function ForecastCard({ forecast, yesterday }: ForecastCardProps) {
  // Compose the visible day list. "Yesterday" slides in when its tier lands.
  const days: Array<
    { key: string; day: ForecastDay; label: string } | { key: string; skeleton: true }
  > = [];

  if (yesterday === undefined) {
    days.push({ key: "yesterday-skeleton", skeleton: true });
  } else if (yesterday) {
    days.push({ key: `y-${yesterday.date}`, day: yesterday, label: "Yesterday" });
  }

  if (forecast) {
    forecast.slice(0, 3).forEach((d, i) => {
      days.push({ key: `f-${d.date}`, day: d, label: forecastLabel(d.date, i) });
    });
  } else {
    for (let i = 0; i < 3; i++) {
      days.push({ key: `forecast-skeleton-${i}`, skeleton: true });
    }
  }

  return (
    <section className="swap-in swap-d-6 bento-tile flex flex-col p-7 sm:col-span-12">
      <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-0 sm:gap-y-6 sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(odd)]:border-foreground/6 md:grid-cols-4 md:gap-0 md:[&>*]:border-r md:[&>*]:border-foreground/6 md:[&>*:last-child]:border-r-0">
        {days.map((entry) =>
          "skeleton" in entry ? (
            <DayRowSkeleton key={entry.key} />
          ) : (
            <div key={entry.key} className="sm:px-6">
              <DayRow day={entry.day} label={entry.label} />
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function DayRow({ day, label }: { day: ForecastDay; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <ConditionIcon
        text={day.conditionText}
        isDay={day.isDay}
        className="text-foreground/60 size-10 shrink-0"
        strokeWidth={1.5}
        aria-hidden="true"
      />
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

function DayRowSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 sm:px-6">
      <div className="size-10 shrink-0 animate-pulse rounded-xl bg-foreground/10" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="h-3 w-16 animate-pulse rounded bg-foreground/10" />
        <div className="h-7 w-20 animate-pulse rounded bg-foreground/10" />
        <div className="h-3 w-24 animate-pulse rounded bg-foreground/10" />
      </div>
    </div>
  );
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
