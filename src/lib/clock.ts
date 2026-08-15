import type { UnitSystem } from "@/lib/units";

interface ClockConfig {
  locale: string;
  hour: "2-digit" | "numeric";
}

/** The Worker formats what comes from the payload; the client formats what
 *  comes from the clock. Every time and date in `src/components` renders
 *  through this file, off this one table. */
const CLOCK: Record<UnitSystem, ClockConfig> = {
  metric: { locale: "en-GB", hour: "2-digit" },
  imperial: { locale: "en-US", hour: "numeric" },
};

const DASH = "—";

function lowerMeridiem(text: string): string {
  return text.replace(/\b([AP])M\b/, (half) => half.toLowerCase());
}

function condense(text: string): string {
  return lowerMeridiem(text).replace(/\s+([ap]m)\b/, "$1");
}

function format(at: Date | number, options: Intl.DateTimeFormatOptions, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, options).format(at);
  } catch {
    return DASH;
  }
}

export function formatTime(at: number, tz: string, system: UnitSystem): string {
  const { locale, hour } = CLOCK[system];
  return format(at, { timeZone: tz, hour, minute: "2-digit" }, locale);
}

export function formatDate(at: number, tz: string, system: UnitSystem): string {
  const { locale } = CLOCK[system];
  const text = format(
    at,
    { timeZone: tz, weekday: "short", month: "short", day: "numeric" },
    locale,
  );
  return text === DASH ? "" : text.replace(",", "");
}

export function formatWeekday(
  date: string,
  system: UnitSystem,
  weekday: "short" | "long" = "short",
): string | null {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, { weekday }, CLOCK[system].locale);
}

/** Astro times arrive as upstream's `"06:23 AM"`, which carries no date. */
export function formatClock(time: string, system: UnitSystem): string {
  const minutes = parseClockMinutes(time);
  if (minutes === null) return time;
  const { locale, hour } = CLOCK[system];
  const at = Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return lowerMeridiem(format(at, { timeZone: "UTC", hour, minute: "2-digit" }, locale));
}

export function parseClockMinutes(time: string): number | null {
  const [clock, meridiem] = time.trim().split(" ");
  if (!clock) return null;
  const [hourPart, minutePart] = clock.split(":");
  let hour = Number.parseInt(hourPart ?? "", 10);
  const minute = Number.parseInt(minutePart ?? "", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  const half = (meridiem ?? "").toUpperCase();
  if (half === "PM" && hour < 12) hour += 12;
  if (half === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/** Hour-only in both systems: `--hour-col-w` is a fixed 4rem below the
 *  breakpoint, and `15:00` is five characters. */
export function formatHour(hour: number, system: UnitSystem): string {
  const { locale, hour: style } = CLOCK[system];
  return condense(format(Date.UTC(2000, 0, 1, hour), { timeZone: "UTC", hour: style }, locale));
}

export function spokenHour(hour: number, system: UnitSystem): string {
  const { locale, hour: style } = CLOCK[system];
  const at = Date.UTC(2000, 0, 1, hour);
  const options: Intl.DateTimeFormatOptions =
    system === "metric"
      ? { timeZone: "UTC", hour: style, minute: "2-digit" }
      : { timeZone: "UTC", hour: style };
  return lowerMeridiem(format(at, options, locale));
}

export function formatStamp(at: number, tz: string, system: UnitSystem, withDate: boolean): string {
  const { locale, hour } = CLOCK[system];
  const time = lowerMeridiem(format(at, { timeZone: tz, hour, minute: "2-digit" }, locale));
  if (time === DASH) return DASH;
  if (!withDate) return time;
  const date = format(
    at,
    { timeZone: tz, weekday: "short", month: "short", day: "numeric" },
    locale,
  );
  return date === DASH ? DASH : `${date}, ${time}`;
}
