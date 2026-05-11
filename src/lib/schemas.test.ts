import { describe, expect, it } from "vitest";
import {
  AstroSchema,
  CurrentConditionsSchema,
  ForecastDaySchema,
  WeatherCurrentSchema,
  WeatherForecastSchema,
  WeatherLocationSchema,
  WeatherYesterdaySchema,
} from "./schemas";

/**
 * Drift tripwires for the shared wire DTO schemas.
 *
 * The frontend type-imports from this file so a loosened or renamed
 * field wouldn't surface until runtime. These tests assert each schema
 * accepts a canonical fixture and rejects a structurally-broken variant.
 */

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
  cloud: 45,
};

describe("WeatherForecastSchema", () => {
  it("parses a canonical fixture", () => {
    const fixture = {
      today: { minC: 8, maxC: 15.5, chanceOfRain: 20 },
      airQualityIndex: 2,
      forecast: [forecastDay],
      astro,
      hourly: [hourlyEntry],
    };
    expect(WeatherForecastSchema.parse(fixture)).toEqual(fixture);
  });
  it("accepts a null airQualityIndex", () => {
    const fixture = {
      today: { minC: 8, maxC: 15.5, chanceOfRain: 20 },
      airQualityIndex: null,
      forecast: [forecastDay],
      astro,
      hourly: [],
    };
    expect(WeatherForecastSchema.parse(fixture)).toEqual(fixture);
  });
  it("rejects a string chanceOfRain in today", () => {
    const fixture = {
      today: { minC: 8, maxC: 15.5, chanceOfRain: "high" },
      airQualityIndex: null,
      forecast: [forecastDay],
      astro,
      hourly: [],
    };
    expect(() => WeatherForecastSchema.parse(fixture)).toThrow();
  });
});

describe("WeatherYesterdaySchema", () => {
  it("parses a canonical fixture with a day", () => {
    expect(WeatherYesterdaySchema.parse({ yesterday: forecastDay })).toEqual({
      yesterday: forecastDay,
    });
  });
  it("parses null yesterday", () => {
    expect(WeatherYesterdaySchema.parse({ yesterday: null })).toEqual({ yesterday: null });
  });
  it("rejects a missing yesterday key", () => {
    expect(() => WeatherYesterdaySchema.parse({})).toThrow();
  });
});
