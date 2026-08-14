import { useEffect, useRef, useState } from "react";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PersonStandingIcon,
  ThermometerIcon,
  UmbrellaIcon,
} from "lucide-react";
import type { ComponentType, CSSProperties, ReactNode, SVGProps } from "react";
import type { HourlyForecast } from "@/api/types";
import { cn } from "@/lib/utils";
import { ConditionIcon } from "./condition-icon";

interface HourlyCardProps {
  hourly: HourlyForecast[] | undefined;
  tz: string;
}

interface HourRow {
  key: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  name: string;
  lead?: boolean;
  cell: (slot: HourlyForecast) => ReactNode;
}

const ROWS: HourRow[] = [
  {
    key: "temp",
    icon: ThermometerIcon,
    name: "Temperature",
    lead: true,
    cell: (slot) => `${Math.round(slot.tempC)}°`,
  },
  {
    key: "feels",
    icon: PersonStandingIcon,
    name: "Feels like",
    cell: (slot) => `${Math.round(slot.feelsLikeC)}°`,
  },
  {
    key: "precip",
    icon: UmbrellaIcon,
    name: "Chance of precipitation",
    cell: (slot) => `${precipChance(slot)}%`,
  },
];

/** The chance comparison catches what `willItSnow` misses: upstream reports
 *  `chanceOfRain: 0` for a sub-zero hour with snow falling. */
function precipChance(slot: HourlyForecast): number {
  const snowy = slot.willItSnow || slot.chanceOfSnow > slot.chanceOfRain;
  return snowy ? slot.chanceOfSnow : slot.chanceOfRain;
}

const SKELETON_COLUMNS = 24;

export function HourlyCard({ hourly, tz }: HourlyCardProps) {
  const slots = hourly ? pickSlots(hourly, tz) : undefined;
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      setCanLeft(el.scrollLeft > 1);
      setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [slots?.length]);

  const step = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const col = el.querySelector<HTMLElement>("[data-hour-col]")?.offsetWidth ?? 0;
    const span =
      col > 0 ? Math.max(1, Math.floor((el.clientWidth * 0.8) / col)) * col : el.clientWidth * 0.8;
    el.scrollBy({
      left: dir * span,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return (
    <section className="swap-in swap-d-3 bento-tile flex flex-col p-6 sm:col-span-4 xl:order-3 xl:col-span-2">
      <div className="flex items-center justify-end gap-1">
        <StepButton dir={-1} disabled={!canLeft} onClick={() => step(-1)} />
        <StepButton dir={1} disabled={!canRight} onClick={() => step(1)} />
      </div>

      <div className="hour-frame mt-2 flex">
        <div className="hour-gutter" aria-hidden="true">
          <div className="hour-gutter-head" />
          {ROWS.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.key} className="hour-gutter-cell">
                <Icon className="size-4 text-foreground/70" strokeWidth={1.75} aria-hidden="true" />
              </div>
            );
          })}
        </div>

        <div
          ref={ref}
          className="hour-fade scrollbar-none min-w-0 flex-1 overflow-x-auto"
          style={
            {
              "--hour-fade-l": canLeft ? "1.5rem" : "0px",
              "--hour-fade-r": canRight ? "2rem" : "0px",
            } as CSSProperties
          }
        >
          {slots ? <HourTable slots={slots} /> : <HourTableSkeleton />}
        </div>
      </div>
    </section>
  );
}

interface Column {
  slot: HourlyForecast;
  isBreak: boolean;
}

function HourTable({ slots }: { slots: HourlyForecast[] }) {
  const columns: Column[] = slots.map((slot, i) => {
    const prev = slots[i - 1];
    return { slot, isBreak: prev !== undefined && dateOf(slot.time) !== dateOf(prev.time) };
  });

  return (
    <table className="hour-table" style={{ "--hour-cols": columns.length } as CSSProperties}>
      <caption className="sr-only">The next 24 hours</caption>
      <thead>
        <tr>
          <td className="hour-gut-cell" />
          {columns.map(({ slot, isBreak }) => (
            <th
              key={slot.time}
              scope="col"
              data-hour-col=""
              className={cn("hour-head-cell", isBreak && "hour-daybreak")}
            >
              <span className="hour-head-inner">
                <span aria-hidden="true" className={cn("label-sub", isBreak && "text-foreground")}>
                  {isBreak ? weekdayLabel(slot.time) : formatHourLabel(slot.time)}
                </span>
                <ConditionIcon
                  text={slot.conditionText}
                  isDay={slot.isDay}
                  className="size-7 shrink-0 text-foreground/55"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>
              <span className="sr-only">
                {spokenHour(slot.time, isBreak)}, {slot.conditionText}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.key}>
            <th scope="row" className="hour-gut-cell">
              <span className="sr-only">{row.name}</span>
            </th>
            {columns.map(({ slot, isBreak }) => (
              <td
                key={slot.time}
                className={cn(
                  "hour-cell",
                  row.lead && "hour-cell-lead",
                  isBreak && "hour-daybreak",
                )}
              >
                {row.cell(slot)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StepButton({
  dir,
  disabled,
  onClick,
}: {
  dir: -1 | 1;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === -1 ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === -1 ? "Scroll to earlier hours" : "Scroll to later hours"}
      className="flex size-9 items-center justify-center rounded-full text-foreground/55 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:text-foreground/25"
    >
      <Icon className="size-[18px]" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

function HourTableSkeleton() {
  const columns = Array.from({ length: SKELETON_COLUMNS }, (_, i) => i);
  return (
    <table
      className="hour-table"
      style={{ "--hour-cols": SKELETON_COLUMNS } as CSSProperties}
      aria-hidden="true"
    >
      <tbody>
        <tr>
          <td className="hour-gut-cell" />
          {columns.map((i) => (
            <td key={i} className="hour-head-cell">
              <span className="hour-head-inner">
                <span className="h-2.5 w-7 animate-pulse rounded bg-foreground/10" />
                <span className="size-5 animate-pulse rounded-full bg-foreground/10" />
              </span>
            </td>
          ))}
        </tr>
        {ROWS.map((row) => (
          <tr key={row.key}>
            <td className="hour-gut-cell" />
            {columns.map((i) => (
              <td key={i} className="hour-cell">
                <span className="mx-auto block h-3 w-6 animate-pulse rounded bg-foreground/10" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
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

/** UTC: these are the city's calendar dates. Viewer-local midday broke east of UTC+12. */
function rollForward(date: string, hour: number): { date: string; hour: number } {
  if (hour < 24) return { date, hour };
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.floor(hour / 24));
  return { date: d.toISOString().slice(0, 10), hour: hour % 24 };
}

function dateOf(time: string): string {
  return time.split(" ")[0] ?? time;
}

function formatHourLabel(time: string): string {
  const hour = hourOf(time);
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function weekdayLabel(time: string): string {
  const parsed = new Date(`${dateOf(time)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return formatHourLabel(time);
  return parsed.toLocaleDateString(undefined, { weekday: "short" });
}

function spokenHour(time: string, withDay: boolean): string {
  const hour = hourOf(time);
  const clock =
    hour === 0 ? "12 am" : hour === 12 ? "12 pm" : hour < 12 ? `${hour} am` : `${hour - 12} pm`;
  if (!withDay) return clock;
  const parsed = new Date(`${dateOf(time)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return clock;
  return `${parsed.toLocaleDateString(undefined, { weekday: "long" })}, ${clock}`;
}

function hourOf(time: string): number {
  const timePart = time.split(" ")[1] ?? "00:00";
  return Number.parseInt(timePart.split(":")[0] ?? "0", 10);
}
