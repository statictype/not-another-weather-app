import { useCallback, useEffect, useRef, useState } from "react";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DropletIcon,
  PersonStandingIcon,
  SnowflakeIcon,
  ThermometerIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { HourlyForecast } from "@/api/types";
import { precipAmount, type PrecipAmount } from "@/lib/precip";
import { cn } from "@/lib/utils";
import { ConditionIcon } from "./condition-icon";
import { TabButton } from "./tab-button";

type HourlyMode = "temp" | "precip";

interface HourlyCardProps {
  hourly: HourlyForecast[] | undefined;
  tz: string;
}

/**
 * The next 24 hours, one column each, in one of two modes.
 *
 * Two modes rather than three. Snow is not a dimension of an hour the way
 * temperature and precipitation are — it is a property of that hour's
 * precipitation — so it is a variant inside Precip mode rather than a third
 * option that would be blank for 22 of 24 slots and would change the
 * control's shape under the reader.
 *
 * The mode is component state, so it survives a city change. Switching cities
 * should not reset how you are reading the data.
 */
export function HourlyCard({ hourly, tz }: HourlyCardProps) {
  const [mode, setMode] = useState<HourlyMode>("temp");
  const slots = hourly ? pickSlots(hourly, tz) : undefined;

  return (
    <section className="swap-in swap-d-3 bento-tile flex flex-col p-6 sm:col-span-12 xl:order-3 xl:col-span-12">
      <div className="flex items-center justify-between gap-3">
        <p className="label-section">Hourly</p>
        <div className="flex items-center gap-1.5">
          <TabButton
            active={mode === "temp"}
            onClick={() => setMode("temp")}
            label="Show hourly temperature"
          >
            <ThermometerIcon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </TabButton>
          <TabButton
            active={mode === "precip"}
            onClick={() => setMode("precip")}
            label="Show hourly precipitation"
          >
            <DropletIcon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </TabButton>
        </div>
      </div>

      <div className="mt-3">
        {slots ? <HourlyStrip slots={slots} mode={mode} /> : <StripSkeleton />}
      </div>
    </section>
  );
}

/**
 * The strip is not remounted when the mode changes, and each rung is a
 * fixed-height box, so switching modes moves neither the card's height nor
 * the scroll position. That rules out an entrance animation on the readings:
 * the only way to play one is to remount the row, and a remounted row is a
 * momentary `scrollWidth` of zero, which the browser clamps `scrollLeft`
 * against. The swap is instant on purpose.
 */
function HourlyStrip({ slots, mode }: { slots: HourlyForecast[]; mode: HourlyMode }) {
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

  /**
   * Most of a viewport, not a fixed 180px. The strip is four hours wide on a
   * phone and twelve on a desktop; one press should mean the same thing on
   * both. The 0.8 leaves a column of overlap so the reader keeps their place.
   */
  const scroll = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({
      left: dir * el.clientWidth * 0.8,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return (
    <div className="relative">
      <ScrollButton dir={-1} enabled={canLeft} onClick={() => scroll(-1)} />

      <div
        ref={ref}
        className="hour-fade scrollbar-none flex snap-x snap-proximity overflow-x-auto"
        style={
          {
            "--hour-fade-l": canLeft ? "2.5rem" : "0px",
            "--hour-fade-r": canRight ? "2.5rem" : "0px",
          } as CSSProperties
        }
      >
        {slots.map((slot, i) => {
          const prev = slots[i - 1];
          return (
            <Slot
              key={slot.time}
              slot={slot}
              mode={mode}
              dayBreak={prev !== undefined && dateOf(slot.time) !== dateOf(prev.time)}
            />
          );
        })}
      </div>

      <ScrollButton dir={1} enabled={canRight} onClick={() => scroll(1)} />
    </div>
  );
}

function ScrollButton({
  dir,
  enabled,
  onClick,
}: {
  dir: -1 | 1;
  enabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === -1 ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === -1 ? "Scroll to earlier hours" : "Scroll to later hours"}
      className={cn(
        "absolute top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/8 text-foreground/60 transition-opacity duration-200 hover:bg-foreground/12",
        dir === -1 ? "-left-2" : "-right-2",
        enabled ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

interface SlotProps {
  slot: HourlyForecast;
  mode: HourlyMode;
  /** First hour of a new date. Takes the heavy rule and names the day. */
  dayBreak: boolean;
}

/**
 * One column of the table: a head naming the hour, then the mode's reading
 * under it.
 *
 * The rules are the structure. A hairline between every pair of columns and
 * one under every head meet at the corners into a grid, so the value row is a
 * row the eye can run along rather than a series of numbers that happen to be
 * level. The columns carry no field of their own — every hour sits on the
 * tile's own surface, and the only marks are the rules.
 *
 * The 12px on either side of the head rule is the strip's one generous
 * interval, against 8px inside the head and 4px inside the reading. The head
 * rule sits in the middle of it.
 *
 * Both reading rungs are fixed-height boxes, so a column whose precipitation
 * has no amount holds itself open rather than pulling the row up.
 *
 * `role="img"` gives the column one accessible name in place of the glyph
 * soup underneath it — the same treatment the hero's precipitation chips use.
 */
function Slot({ slot, mode, dayBreak }: SlotProps) {
  const reading = mode === "temp" ? tempReading(slot) : precipReading(slot);

  return (
    <div
      role="img"
      aria-label={`${spokenHour(slot.time, dayBreak)}, ${slot.conditionText}, ${reading.spoken}`}
      className={cn(
        "hour-col flex w-22 shrink-0 snap-start flex-col py-1 sm:w-26",
        dayBreak && "hour-daybreak",
      )}
    >
      <div className="hour-head flex flex-col items-center gap-2 pb-3">
        <span className={cn("label-section", dayBreak && "text-foreground")}>
          {dayBreak ? weekdayLabel(slot.time) : formatHourLabel(slot.time)}
        </span>
        <ConditionIcon
          text={slot.conditionText}
          isDay={slot.isDay}
          className="size-7 shrink-0 text-foreground/55"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>

      <div className="flex flex-col items-center gap-1 pt-3">
        <span className="flex h-6 items-center text-xl leading-none tracking-tight tabular-nums">
          {reading.value}
        </span>
        <span className="flex h-4 items-center gap-1 text-xs leading-none tracking-tight tabular-nums text-foreground/70">
          {reading.detail}
        </span>
      </div>
    </div>
  );
}

interface Reading {
  value: string;
  /** `null` holds the box open at its fixed height rather than closing it. */
  detail: ReactNode;
  spoken: string;
}

/**
 * The temperature, then the feels-like under it. Both, every hour.
 *
 * The card previously printed the higher of the two as the headline and
 * dropped the pair whenever they were within 2°. Both were wrong: a windy
 * hour put the feels-like where the temperature belongs, and a reader could
 * not tell an omitted second reading from an equal one. The temperature is
 * always the headline, and the feels-like is always under it — an hour where
 * they agree says that by printing the same number twice, which is a fact
 * about the hour rather than a gap in the table.
 *
 * The `PersonStandingIcon` is the one the Now tile puts beside `Feels like`,
 * so the row is read from a label the reader has already seen rather than
 * from 24 repetitions of the word.
 */
function tempReading(slot: HourlyForecast): Reading {
  const temp = Math.round(slot.tempC);
  const feels = Math.round(slot.feelsLikeC);

  return {
    value: `${temp}°`,
    detail: (
      <>
        <PersonStandingIcon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        {feels}°
      </>
    ),
    spoken: `${temp} degrees, feels like ${feels} degrees`,
  };
}

/**
 * The chance, and how much of it there is.
 *
 * Snow wins over rain when both are in play — a reader planning around sleet
 * cares about the snow. The chance comparison catches what the flags miss:
 * upstream reports `chanceOfRain: 0` for an hour at −4°C with snow falling,
 * which is how a snowy hour used to render as a struck-out droplet.
 *
 * Dry hours print `0%` at the same size and place as every other chance
 * rather than swapping in a struck droplet. The value rung is the row the eye
 * runs along, and a glyph in the middle of it breaks the run; a stretch of
 * zeros is the shape of "nothing until this evening".
 */
function precipReading(slot: HourlyForecast): Reading {
  const snowy = slot.willItSnow || slot.chanceOfSnow > slot.chanceOfRain;
  const chance = snowy ? slot.chanceOfSnow : slot.chanceOfRain;

  // The flags gate the amount, not the chance, so an hour where the vendor
  // disagrees with itself prints the chance alone instead of a contradiction.
  let amount: PrecipAmount | null = null;
  if (snowy && slot.willItSnow) amount = precipAmount(slot.snowCm, "cm");
  else if (!snowy && slot.willItRain) amount = precipAmount(slot.precipMm, "mm");

  const Icon = snowy ? SnowflakeIcon : DropletIcon;

  return {
    value: `${chance}%`,
    detail: amount ? (
      <>
        <Icon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        {amount.text}
      </>
    ) : null,
    spoken: `${chance} percent chance of ${snowy ? "snow" : "rain"}${
      amount ? `, ${amount.spoken}` : ""
    }`,
  };
}

function StripSkeleton() {
  return (
    <div className="flex" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="hour-col flex w-22 shrink-0 flex-col py-1 sm:w-26">
          <div className="hour-head flex flex-col items-center gap-2 pb-3">
            <div className="h-3 w-9 animate-pulse rounded bg-foreground/10" />
            <div className="size-7 animate-pulse rounded-full bg-foreground/10" />
          </div>
          <div className="flex flex-col items-center gap-1 pt-3">
            <div className="h-6 w-11 animate-pulse rounded bg-foreground/10" />
            <div className="h-4 w-9 animate-pulse rounded bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
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

/**
 * Date arithmetic in UTC. The dates here are the located city's calendar
 * dates, not the viewer's, so anchoring them to the viewer's local midday and
 * reading back an ISO date returned the wrong day for viewers east of UTC+12.
 */
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

/**
 * The new day's name in place of its first hour's label.
 *
 * That first hour is midnight in all but one case — the strip starts at the
 * next full hour, so the rollover lands on `12am` unless the reader opened
 * the page during the 11pm hour, when the strip starts there. Either way the
 * hour is one column from its neighbours and the ruled edge, and the day is
 * the thing the reader cannot infer. The full hour stays in the spoken name.
 */
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
