import type { ForecastDay } from "@/api/types";
import { cn } from "@/lib/utils";
import { ConditionIcon } from "./condition-icon";
import { PrecipStrip } from "./precip-strip";

interface ForecastCardProps {
  forecast: ForecastDay[] | undefined;
}

/** Index 0 of the upstream array is today, which the card leads with. */
const MAX_DAYS = 4;

/** Free keys cap the payload at 3 days total, so today plus 2 future days is
 *  what lands; a plan upgrade brings a fourth, and the columns tighten to fit
 *  it. Static strings, because Tailwind scans source text and cannot see an
 *  interpolated column count. */
const LAYOUTS: Record<number, string> = {
  1: "sm:grid-cols-1 sm:[&>*]:px-6",
  2: "sm:grid-cols-2 sm:[&>*]:px-6",
  3: "sm:grid-cols-3 sm:[&>*]:px-4",
  4: "sm:grid-cols-4 sm:[&>*]:px-3",
};

/** Matches the current plan's 3 days, so the common case does not reflow. */
const SKELETON_DAYS = 3;

export function ForecastCard({ forecast }: ForecastCardProps) {
  const days = forecast?.slice(0, MAX_DAYS);
  const layout = LAYOUTS[days?.length ?? SKELETON_DAYS] ?? LAYOUTS[MAX_DAYS];

  return (
    <section className="swap-in swap-d-4 bento-tile flex flex-col justify-center p-6 sm:col-span-4 lg:col-span-2 xl:order-4 xl:col-span-2">
      {/* Days are a divided list below `sm` and a column matrix above it, so
          the rule between them turns and the row padding folds away. `-my-3`
          pulls the outer rows' padding back off the tile's own `p-6`. */}
      <div
        className={cn(
          "-my-3 grid grid-cols-1 divide-y divide-foreground/10",
          "sm:my-0 sm:divide-y-0",
          "sm:[&>*:not(:last-child)]:border-r sm:[&>*:not(:last-child)]:border-foreground/6",
          layout,
        )}
      >
        {days
          ? days.map((day, i) => (
              <div key={day.date} className="min-w-0 py-3 sm:py-0">
                <DayColumn day={day} label={forecastLabel(day.date, i)} />
              </div>
            ))
          : Array.from({ length: SKELETON_DAYS }, (_, i) => (
              <div key={i} className="min-w-0 py-3 sm:py-0">
                <DayColumnSkeleton />
              </div>
            ))}
      </div>
    </section>
  );
}

/** Placement is `.fc-day`'s, in `index.css`: a row below `sm`, a stack above
 *  it. Source order is the spoken order in both — name, high/low, condition,
 *  precipitation, with the icon skipped. */
function DayColumn({ day, label }: { day: ForecastDay; label: string }) {
  return (
    <div className="fc-day min-w-0">
      <span className="fc-name label-section truncate">{label}</span>
      <ConditionIcon
        text={day.conditionText}
        isDay={day.isDay}
        className="fc-icon size-10 shrink-0 text-foreground/60"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className="fc-temp text-2xl leading-none tracking-tight tabular-nums whitespace-nowrap">
        {Math.round(day.maxC)}°
        <span className="ml-1 text-base text-foreground/70">/ {Math.round(day.minC)}°</span>
      </span>
      <span className="fc-cond truncate text-sm text-foreground/70">{day.conditionText}</span>
      <PrecipStrip day={day} className="fc-prec" />
    </div>
  );
}

/** Each bar is the height of the line box it stands in — 18 / 40 / 24 / 20 / 20
 *  — so a day measures the same as a row and as a column either way, and the
 *  tile does not resize when the payload lands. */
function DayColumnSkeleton() {
  return (
    <div aria-hidden="true" className="fc-day min-w-0">
      <div className="fc-name h-[18px] w-16 animate-pulse rounded bg-foreground/10" />
      <div className="fc-icon size-10 shrink-0 animate-pulse rounded-xl bg-foreground/10" />
      <div className="fc-temp h-6 w-20 animate-pulse rounded bg-foreground/10" />
      <div className="fc-cond h-5 w-24 animate-pulse rounded bg-foreground/10" />
      <div className="fc-prec h-5 w-14 animate-pulse rounded bg-foreground/10" />
    </div>
  );
}

/** `index` counts from today, so 0 is today and 1 is tomorrow. */
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
