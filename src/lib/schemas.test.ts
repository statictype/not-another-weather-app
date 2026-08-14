import { describe, expect, it } from "vitest";
import {
  ALERT_SEVERITIES,
  AstroSchema,
  CurrentConditionsSchema,
  ForecastDaySchema,
  HourlyForecastSchema,
  WeatherAlertSchema,
  WeatherCurrentSchema,
  WeatherForecastSchema,
  WeatherLocationSchema,
} from "./schemas";

const location = {
  name: "London",
  region: "Greater London",
  country: "United Kingdom",
  localTime: "2026-04-07T14:32",
  tz: "Europe/London",
  lat: 51.52,
  lon: -0.11,
};

const current = {
  tempC: 12.3,
  feelsLikeC: 11.1,
  heatIndexC: 12.3,
  conditionText: "Partly cloudy",
  conditionCode: 1003,
  timeOfDay: "day" as const,
  windKph: 14.4,
  windDir: "WSW",
  gustKph: 22,
  humidity: 67,
  pressureMb: 1015,
  visibilityKm: 10,
  uv: 4,
  cloud: 40,
  dewpointC: 6.2,
  precipMm: 0,
};

const forecastDay = {
  date: "2026-04-07",
  minC: 8,
  maxC: 15.5,
  avgC: 11.7,
  chanceOfRain: 20,
  willItRain: false,
  chanceOfSnow: 0,
  willItSnow: false,
  totalPrecipMm: 0,
  totalSnowCm: 0,
  conditionText: "Partly cloudy",
  conditionCode: 1003,
  isDay: true,
};

const astro = {
  sunrise: "06:32 AM",
  sunset: "07:48 PM",
  moonrise: "10:00 PM",
  moonset: "08:14 AM",
  moonPhase: "Waxing Gibbous",
  moonIllumination: 72,
};

describe("WeatherLocationSchema", () => {
  it("parses a canonical fixture", () => {
    expect(WeatherLocationSchema.parse(location)).toEqual(location);
  });
  it("rejects a non-numeric lat", () => {
    expect(() => WeatherLocationSchema.parse({ ...location, lat: "51.52" })).toThrow();
  });
});

describe("CurrentConditionsSchema", () => {
  it("parses a canonical fixture", () => {
    expect(CurrentConditionsSchema.parse(current)).toEqual(current);
  });
  it("rejects a string tempC", () => {
    expect(() => CurrentConditionsSchema.parse({ ...current, tempC: "hot" })).toThrow();
  });
  it("rejects a bogus timeOfDay", () => {
    expect(() => CurrentConditionsSchema.parse({ ...current, timeOfDay: "twilight" })).toThrow();
  });
});

describe("ForecastDaySchema", () => {
  it("parses a canonical fixture", () => {
    expect(ForecastDaySchema.parse(forecastDay)).toEqual(forecastDay);
  });
  it("rejects a null minC", () => {
    expect(() => ForecastDaySchema.parse({ ...forecastDay, minC: null })).toThrow();
  });
  it("requires the precipitation fields — every day column renders them", () => {
    for (const field of [
      "chanceOfRain",
      "willItRain",
      "chanceOfSnow",
      "willItSnow",
      "totalPrecipMm",
      "totalSnowCm",
    ]) {
      expect(() => ForecastDaySchema.parse(without(forecastDay, field))).toThrow();
    }
  });
});

describe("AstroSchema", () => {
  it("parses a canonical fixture", () => {
    expect(AstroSchema.parse(astro)).toEqual(astro);
  });
  it("rejects a missing moonPhase", () => {
    const rest = { ...astro, moonPhase: undefined };
    expect(() => AstroSchema.parse(rest)).toThrow();
  });
});

describe("WeatherCurrentSchema", () => {
  it("parses a canonical fixture", () => {
    const fixture = { location, current };
    expect(WeatherCurrentSchema.parse(fixture)).toEqual(fixture);
  });
  it("rejects a missing current block", () => {
    expect(() => WeatherCurrentSchema.parse({ location })).toThrow();
  });
});

const hourlyEntry = {
  time: "2026-04-07 15:00",
  tempC: 13.2,
  feelsLikeC: 12.0,
  conditionText: "Partly cloudy",
  conditionCode: 1003,
  isDay: true,
  chanceOfRain: 10,
  chanceOfSnow: 0,
  willItRain: false,
  willItSnow: false,
  precipMm: 0,
  snowCm: 0,
  cloud: 45,
};

const today = {
  minC: 8,
  maxC: 15.5,
  chanceOfRain: 20,
  willItRain: false,
  chanceOfSnow: 0,
  willItSnow: false,
  totalPrecipMm: 0,
  totalSnowCm: 0,
};

const weatherAlert = {
  event: "Amber Wind Warning",
  headline: "Amber Wind Warning issued for Greater London",
  severity: "severe" as const,
  areas: "Greater London",
  effective: "2026-04-07T06:00:00+01:00",
  expires: "2026-04-07T21:00:00+01:00",
  desc: "Gusts of 60–70 mph are expected across exposed coasts.",
  instruction: "Secure loose objects and avoid coastal paths.",
};

function without(obj: object, field: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...obj };
  delete copy[field];
  return copy;
}

describe("HourlyForecastSchema", () => {
  it("requires the precipitation fields", () => {
    for (const field of ["chanceOfSnow", "willItRain", "willItSnow", "precipMm", "snowCm"]) {
      expect(() => HourlyForecastSchema.parse(without(hourlyEntry, field))).toThrow();
    }
  });
  it("rejects a numeric willItRain — the wire carries booleans, not upstream's 0/1", () => {
    expect(() => HourlyForecastSchema.parse({ ...hourlyEntry, willItRain: 1 })).toThrow();
  });
});

describe("WeatherAlertSchema", () => {
  it("parses a canonical fixture", () => {
    expect(WeatherAlertSchema.parse(weatherAlert)).toEqual(weatherAlert);
  });
  it.each(ALERT_SEVERITIES)("accepts the %s severity", (severity) => {
    expect(WeatherAlertSchema.parse({ ...weatherAlert, severity }).severity).toBe(severity);
  });
  it("rejects an un-normalized severity — the worker closes the union before it ships", () => {
    expect(() => WeatherAlertSchema.parse({ ...weatherAlert, severity: "Severe" })).toThrow();
    expect(() => WeatherAlertSchema.parse({ ...weatherAlert, severity: "orange" })).toThrow();
    expect(() => WeatherAlertSchema.parse({ ...weatherAlert, severity: "" })).toThrow();
  });
  it("rejects a missing instruction rather than defaulting it", () => {
    expect(() => WeatherAlertSchema.parse(without(weatherAlert, "instruction"))).toThrow();
  });
});

describe("WeatherForecastSchema", () => {
  it("parses a canonical fixture", () => {
    const fixture = {
      today,
      airQualityIndex: 2,
      forecast: [forecastDay],
      astro,
      hourly: [hourlyEntry],
      alerts: [weatherAlert],
    };
    expect(WeatherForecastSchema.parse(fixture)).toEqual(fixture);
  });
  it("accepts a null airQualityIndex", () => {
    const fixture = {
      today,
      airQualityIndex: null,
      forecast: [forecastDay],
      astro,
      hourly: [],
      alerts: [],
    };
    expect(WeatherForecastSchema.parse(fixture)).toEqual(fixture);
  });
  it("rejects a string chanceOfRain in today", () => {
    const fixture = {
      today: { ...today, chanceOfRain: "high" },
      airQualityIndex: null,
      forecast: [forecastDay],
      astro,
      hourly: [],
      alerts: [],
    };
    expect(() => WeatherForecastSchema.parse(fixture)).toThrow();
  });
  it("requires the snow and precipitation totals in today", () => {
    for (const field of [
      "willItRain",
      "chanceOfSnow",
      "willItSnow",
      "totalPrecipMm",
      "totalSnowCm",
    ]) {
      const fixture = {
        today: without(today, field),
        airQualityIndex: null,
        forecast: [forecastDay],
        astro,
        hourly: [],
        alerts: [],
      };
      expect(() => WeatherForecastSchema.parse(fixture)).toThrow();
    }
  });
  it("rejects a null alerts array — the worker always sends a list", () => {
    const fixture = {
      today,
      airQualityIndex: null,
      forecast: [forecastDay],
      astro,
      hourly: [],
      alerts: null,
    };
    expect(() => WeatherForecastSchema.parse(fixture)).toThrow();
  });
});
