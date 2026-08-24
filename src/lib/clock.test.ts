import { describe, expect, it } from "vitest";
import {
  formatClock,
  formatDate,
  formatHour,
  formatStamp,
  formatTime,
  formatWeekday,
  parseClockMinutes,
  spokenHour,
} from "./clock";

/** 2026-08-15 is a Saturday; 15:45 UTC. */
const AT = Date.UTC(2026, 7, 15, 15, 45);
const TZ = "UTC";

/** `en-GB` and `de-DE` read 24-hour, `en-US` 12-hour. The unit system is not
 *  an input to any of these. */
describe("formatTime", () => {
  it("follows the locale's hour cycle", () => {
    expect(formatTime(AT, TZ, "en-GB")).toBe("15:45");
    expect(formatTime(AT, TZ, "de-DE")).toBe("15:45");
    expect(formatTime(AT, TZ, "en-US")).toBe("3:45 PM");
  });

  it("pads the hour past midnight in a 24-hour locale", () => {
    const midnight = Date.UTC(2026, 7, 15, 0, 5);
    expect(formatTime(midnight, TZ, "en-GB")).toBe("00:05");
    expect(formatTime(midnight, TZ, "en-US")).toBe("12:05 AM");
  });

  it("returns a dash for an unknown time zone rather than throwing", () => {
    expect(formatTime(AT, "Mars/Olympus", "en-GB")).toBe("—");
  });

  it("falls back to the runtime default for a locale Intl rejects", () => {
    expect(formatTime(AT, TZ, "not a locale")).not.toBe("—");
  });
});

describe("formatDate", () => {
  it("orders the day and month per locale", () => {
    expect(formatDate(AT, TZ, "en-GB")).toBe("Sat 15 Aug");
    expect(formatDate(AT, TZ, "en-US")).toBe("Sat Aug 15");
  });

  it("returns an empty string for an unknown time zone", () => {
    expect(formatDate(AT, "Mars/Olympus", "en-GB")).toBe("");
  });
});

describe("formatClock", () => {
  it("reads upstream's 12-hour astro string in either hour cycle", () => {
    expect(formatClock("06:23 AM", "en-GB")).toBe("06:23");
    expect(formatClock("06:23 AM", "en-US")).toBe("6:23 am");
    expect(formatClock("07:48 PM", "en-GB")).toBe("19:48");
    expect(formatClock("07:48 PM", "en-US")).toBe("7:48 pm");
  });

  it("dashes a string with no clock in it", () => {
    expect(formatClock("Does not rise today", "en-GB")).toBe("—");
    expect(formatClock("No moonrise", "en-GB")).toBe("—");
  });
});

describe("parseClockMinutes", () => {
  it("folds the meridiem into a minute count", () => {
    expect(parseClockMinutes("12:00 AM")).toBe(0);
    expect(parseClockMinutes("12:00 PM")).toBe(720);
    expect(parseClockMinutes("06:23 AM")).toBe(383);
    expect(parseClockMinutes("07:48 PM")).toBe(1188);
  });

  it("returns null for a string with no clock in it", () => {
    expect(parseClockMinutes("No moonrise")).toBeNull();
  });
});

describe("formatHour", () => {
  it("renders hour-only in either hour cycle", () => {
    expect(formatHour(15, "en-GB")).toBe("15");
    expect(formatHour(15, "en-US")).toBe("3pm");
    expect(formatHour(0, "en-GB")).toBe("00");
    expect(formatHour(0, "en-US")).toBe("12am");
  });

  it("drops the word locales attach to a bare hour", () => {
    expect(formatHour(15, "de-DE")).toBe("15");
    expect(formatHour(15, "ja-JP")).toBe("15");
  });
});

describe("spokenHour", () => {
  it("says the whole time on a 24-hour clock and the meridiem on a 12-hour one", () => {
    expect(spokenHour(15, "en-GB")).toBe("15:00");
    expect(spokenHour(15, "en-US")).toBe("3 pm");
    expect(spokenHour(0, "en-US")).toBe("12 am");
  });
});

describe("formatWeekday", () => {
  it("names the day in the locale's language", () => {
    expect(formatWeekday("2026-08-15", "short", "en-GB")).toBe("Sat");
    expect(formatWeekday("2026-08-15", "long", "en-US")).toBe("Saturday");
    expect(formatWeekday("2026-08-15", "long", "de-DE")).toBe("Samstag");
  });

  it("returns null for an unparseable date", () => {
    expect(formatWeekday("not-a-date", "short", "en-GB")).toBeNull();
  });
});

describe("formatStamp", () => {
  it("lowercases the meridiem and optionally leads with the date", () => {
    expect(formatStamp(AT, TZ, false, "en-US")).toBe("3:45 pm");
    expect(formatStamp(AT, TZ, false, "en-GB")).toBe("15:45");
    expect(formatStamp(AT, TZ, true, "en-US")).toBe("Sat, Aug 15, 3:45 pm");
    expect(formatStamp(AT, TZ, true, "en-GB")).toBe("Sat 15 Aug, 15:45");
  });

  it("returns a dash for an unknown time zone", () => {
    expect(formatStamp(AT, "Mars/Olympus", true, "en-GB")).toBe("—");
  });
});
