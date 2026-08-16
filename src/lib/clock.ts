interface ClockConfig {
  /** `undefined` falls back to the runtime default. */
  locale: string | undefined;
  hour: "2-digit" | "numeric";
  is12Hour: boolean;
}

/** The Worker formats what comes from the payload; the client formats what
 *  comes from the clock. Every time and date in `src/components` renders
 *  through this file. The locale is the viewer's, not the unit system's: a
 *  °C/°F toggle says nothing about whether they read 15:45 or 3:45 PM. */
const DEVICE_LOCALE = typeof navigator === "undefined" ? "" : navigator.language;

const DASH = "—";

const configs = new Map<string, ClockConfig>();

function clockFor(locale: string): ClockConfig {
  const cached = configs.get(locale);
  if (cached) return cached;
  const config = resolve(locale);
  configs.set(locale, config);
  return config;
}

/** An unusable `navigator.language` must not dash every string on the page, so
 *  a locale Intl rejects resolves to the runtime default instead. */
function resolve(locale: string): ClockConfig {
  let tag: string | undefined = locale;
  let hourCycle: string | undefined;
  try {
    hourCycle = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
  } catch {
    tag = undefined;
    hourCycle = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle;
  }
  const is12Hour = hourCycle === "h11" || hourCycle === "h12";
  return { locale: tag, hour: is12Hour ? "numeric" : "2-digit", is12Hour };
}

function lowerMeridiem(text: string): string {
  return text.replace(/\b([AP])M\b/, (half) => half.toLowerCase());
}

function condense(text: string): string {
  return lowerMeridiem(text).replace(/\s+([ap]m)\b/, "$1");
}

function format(
  at: Date | number,
  options: Intl.DateTimeFormatOptions,
  locale: string | undefined,
): string {
  try {
    return new Intl.DateTimeFormat(locale, options).format(at);
  } catch {
    return DASH;
  }
}

export function formatTime(at: number, tz: string, locale = DEVICE_LOCALE): string {
  const config = clockFor(locale);
  return format(at, { timeZone: tz, hour: config.hour, minute: "2-digit" }, config.locale);
}

export function formatDate(at: number, tz: string, locale = DEVICE_LOCALE): string {
  const text = format(
    at,
    { timeZone: tz, weekday: "short", month: "short", day: "numeric" },
    clockFor(locale).locale,
  );
  return text === DASH ? "" : text.replace(",", "");
}

export function formatWeekday(
  date: string,
  weekday: "short" | "long" = "short",
  locale = DEVICE_LOCALE,
): string | null {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, { weekday }, clockFor(locale).locale);
}

/** Astro times arrive as upstream's `"06:23 AM"`, which carries no date. */
export function formatClock(time: string, locale = DEVICE_LOCALE): string {
  const minutes = parseClockMinutes(time);
  if (minutes === null) return time;
  const config = clockFor(locale);
  const at = Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return lowerMeridiem(
    format(at, { timeZone: "UTC", hour: config.hour, minute: "2-digit" }, config.locale),
  );
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

/** Hour-only in every locale: `--hour-col-w` is a fixed 3.5rem, 4rem from `sm`,
 *  so the hour drops the minutes, drops the words some locales attach to it
 *  (`15 Uhr`, `15時`) and keeps the meridiem where there is one. */
export function formatHour(hour: number, locale = DEVICE_LOCALE): string {
  const config = clockFor(locale);
  const at = Date.UTC(2000, 0, 1, hour);
  try {
    const parts = new Intl.DateTimeFormat(config.locale, {
      timeZone: "UTC",
      hour: config.hour,
    }).formatToParts(at);
    const keep = (part: Intl.DateTimeFormatPart) =>
      part.type === "hour" || part.type === "dayPeriod";
    const first = parts.findIndex(keep);
    if (first === -1) return DASH;
    const last = parts.findLastIndex(keep);
    return condense(
      parts
        .slice(first, last + 1)
        .map((part) => part.value)
        .join(""),
    );
  } catch {
    return DASH;
  }
}

export function spokenHour(hour: number, locale = DEVICE_LOCALE): string {
  const config = clockFor(locale);
  const at = Date.UTC(2000, 0, 1, hour);
  const options: Intl.DateTimeFormatOptions = config.is12Hour
    ? { timeZone: "UTC", hour: config.hour }
    : { timeZone: "UTC", hour: config.hour, minute: "2-digit" };
  return lowerMeridiem(format(at, options, config.locale));
}

export function formatStamp(
  at: number,
  tz: string,
  withDate: boolean,
  locale = DEVICE_LOCALE,
): string {
  const config = clockFor(locale);
  const time = lowerMeridiem(
    format(at, { timeZone: tz, hour: config.hour, minute: "2-digit" }, config.locale),
  );
  if (time === DASH) return DASH;
  if (!withDate) return time;
  const date = format(
    at,
    { timeZone: tz, weekday: "short", month: "short", day: "numeric" },
    config.locale,
  );
  return date === DASH ? DASH : `${date}, ${time}`;
}
