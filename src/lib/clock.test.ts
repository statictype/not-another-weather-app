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

describe("formatTime", () => {
  it("is 24-hour in metric and 12-hour in imperial", () => {
    expect(formatTime(AT, TZ, "metric")).toBe("15:45");
    expect(formatTime(AT, TZ, "imperial")).toBe("3:45 PM");
  });

  it("pads the metric hour past midnight", () => {
    const midnight = Date.UTC(2026, 7, 15, 0, 5);
    expect(formatTime(midnight, TZ, "metric")).toBe("00:05");
    expect(formatTime(midnight, TZ, "imperial")).toBe("12:05 AM");
  });

  it("returns a dash for an unknown time zone rather than throwing", () => {
    expect(formatTime(AT, "Mars/Olympus", "metric")).toBe("—");
  });
});

describe("formatDate", () => {
  it("puts the day before the month in metric and after it in imperial", () => {
    expect(formatDate(AT, TZ, "metric")).toBe("Sat 15 Aug");
    expect(formatDate(AT, TZ, "imperial")).toBe("Sat Aug 15");
  });

  it("returns an empty string for an unknown time zone", () => {
    expect(formatDate(AT, "Mars/Olympus", "metric")).toBe("");
  });
});

describe("formatClock", () => {
  it("reads upstream's 12-hour astro string in either system", () => {
    expect(formatClock("06:23 AM", "metric")).toBe("06:23");
    expect(formatClock("06:23 AM", "imperial")).toBe("6:23 am");
    expect(formatClock("07:48 PM", "metric")).toBe("19:48");
    expect(formatClock("07:48 PM", "imperial")).toBe("7:48 pm");
  });

  it("passes an unparseable string through", () => {
    expect(formatClock("No moonrise", "metric")).toBe("No moonrise");
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
  it("renders hour-only in both systems", () => {
    expect(formatHour(15, "metric")).toBe("15");
    expect(formatHour(15, "imperial")).toBe("3pm");
    expect(formatHour(0, "metric")).toBe("00");
    expect(formatHour(0, "imperial")).toBe("12am");
  });
});

describe("spokenHour", () => {
  it("says the whole time in metric and the meridiem in imperial", () => {
    expect(spokenHour(15, "metric")).toBe("15:00");
    expect(spokenHour(15, "imperial")).toBe("3 pm");
    expect(spokenHour(0, "imperial")).toBe("12 am");
  });
});

describe("formatWeekday", () => {
  it("names the day in both systems", () => {
    expect(formatWeekday("2026-08-15", "metric")).toBe("Sat");
    expect(formatWeekday("2026-08-15", "imperial", "long")).toBe("Saturday");
  });

  it("returns null for an unparseable date", () => {
    expect(formatWeekday("not-a-date", "metric")).toBeNull();
  });
});

describe("formatStamp", () => {
  it("lowercases the meridiem and optionally leads with the date", () => {
    expect(formatStamp(AT, TZ, "imperial", false)).toBe("3:45 pm");
    expect(formatStamp(AT, TZ, "metric", false)).toBe("15:45");
    expect(formatStamp(AT, TZ, "imperial", true)).toBe("Sat, Aug 15, 3:45 pm");
    expect(formatStamp(AT, TZ, "metric", true)).toBe("Sat 15 Aug, 15:45");
  });

  it("returns a dash for an unknown time zone", () => {
    expect(formatStamp(AT, "Mars/Olympus", "metric", true)).toBe("—");
  });
});
