import type { ForecastDay } from "@/api/types";
import { cn } from "@/lib/utils";
import { ConditionIcon } from "./condition-icon";

interface ForecastCardProps {
  forecast: ForecastDay[] | undefined;
}

/** Index 0 of the upstream array is today, which the hero already shows. */
const FIRST_FUTURE_DAY = 1;
const MAX_FUTURE_DAYS = 3;

/** Free keys cap the payload at 3 days total, so 2 future days is what lands
 *  today; a plan upgrade brings the third, and the columns tighten to fit it.
 *  Static strings, because Tailwind scans source text and cannot see an
 *  interpolated column count. */
const LAYOUTS: Record<number, string> = {
  1: "sm:grid-cols-1 sm:[&>*]:px-6",
  2: "sm:grid-cols-2 sm:[&>*]:px-6",
  3: "sm:grid-cols-3 sm:[&>*]:px-4",
};

/** Matches the current plan's 2 days, so the common case does not reflow. */
const SKELETON_DAYS = 2;

export function ForecastCard({ forecast }: ForecastCardProps) {
  const days = forecast?.slice(FIRST_FUTURE_DAY, FIRST_FUTURE_DAY + MAX_FUTURE_DAYS);
  const layout = LAYOUTS[days?.length ?? SKELETON_DAYS] ?? LAYOUTS[MAX_FUTURE_DAYS];

  return (
    <section className="swap-in swap-d-4 bento-tile flex flex-col justify-center p-7 sm:col-span-12 xl:order-4 xl:col-span-6">
      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:gap-0",
          "sm:[&>*:not(:last-child)]:border-r sm:[&>*:not(:last-child)]:border-foreground/6",
          layout,
        )}
      >
        {days
          ? days.map((day, i) => (
              <div key={day.date}>
                <DayRow day={day} label={forecastLabel(day.date, i)} />
              </div>
            ))
          : Array.from({ length: SKELETON_DAYS }, (_, i) => <DayRowSkeleton key={i} />)}
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
        className="size-10 shrink-0 text-foreground/60"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="label-section">{label}</span>
        <span className="mt-1 text-3xl leading-none tracking-tight">
          {Math.round(day.maxC)}°
          <span className="ml-1 text-base font-light text-foreground/70">
            / {Math.round(day.minC)}°
          </span>
        </span>
        <span className="mt-1 truncate text-sm font-light text-foreground/70">
          {day.conditionText}
        </span>
      </div>
    </div>
  );
}

function DayRowSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3">
      <div className="size-10 shrink-0 animate-pulse rounded-xl bg-foreground/10" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="h-3 w-16 animate-pulse rounded bg-foreground/10" />
        <div className="h-7 w-20 animate-pulse rounded bg-foreground/10" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-foreground/10" />
      </div>
    </div>
  );
}

/** `index` counts from the first future day, so 0 is tomorrow. */
function forecastLabel(date: string, index: number): string {
  if (index === 0) return "Tomorrow";
  try {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { weekday: "short" });
  } catch {
    return date;
  }
}
