import { describe, expect, it } from "vitest";
import { distance, pressure, speed, temperature } from "@/worker/format";
import { precipAmountPair, precipPair } from "@/worker/precip";
import {
  ALERT_SEVERITIES,
  AstroSchema,
  CurrentConditionsSchema,
  ForecastDaySchema,
  HourlyForecastSchema,
  MeasurePairSchema,
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
  temp: temperature(12.3, 54.1),
  feelsLike: temperature(11.1, 52),
  heatIndex: temperature(12.3, 54.1),
  windchill: temperature(11.1, 52),
  dewpoint: temperature(6.2, 43.2),
  conditionText: "Partly cloudy",
  conditionCode: 1003,
  timeOfDay: "day" as const,
  wind: speed(14.4, 8.9),
  gust: speed(22, 13.7),
  windDir: "WSW",
  windDegree: 240,
  humidity: 67,
  pressureMb: 1015,
  pressure: pressure(1015, 29.97),
  visibility: distance(10, 6),
  uv: 4,
  cloud: 40,
  precip: precipAmountPair(0, "mm"),
  comfort: { thermal: "Cool" as const, air: "Slightly dry" as const, sentence: "Cool" },
  beaufort: "Gentle breeze",
};

const forecastDay = {
  date: "2026-04-07",
  min: temperature(8, 46.4),
  max: temperature(15.5, 59.9),
  chanceOfRain: 20,
  willItRain: false,
  chanceOfSnow: 0,
  willItSnow: false,
  totalPrecip: null,
  totalSnow: null,
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

function without(obj: object, field: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...obj };
  delete copy[field];
  return copy;
}

describe("MeasurePairSchema", () => {
  it("parses a pair the worker produced", () => {
    const pair = speed(14.4, 8.9);
    expect(MeasurePairSchema.parse(pair)).toEqual(pair);
  });

  it("rejects a pair missing a system — the client indexes it by the stored value", () => {
    expect(() => MeasurePairSchema.parse(without(speed(14.4, 8.9), "imperial"))).toThrow();
    expect(() => MeasurePairSchema.parse(without(speed(14.4, 8.9), "metric"))).toThrow();
  });

  it("rejects a numeric value — the wire carries formatted strings", () => {
    expect(() =>
      MeasurePairSchema.parse({
        metric: { text: "14 km/h", value: 14, suffix: "km/h", spoken: "14 kilometres per hour" },
        imperial: speed(14.4, 8.9).imperial,
      }),
    ).toThrow();
  });
});

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
  it("rejects a bare number for temp", () => {
    expect(() => CurrentConditionsSchema.parse({ ...current, temp: 12.3 })).toThrow();
  });
  it("rejects a bogus timeOfDay", () => {
    expect(() => CurrentConditionsSchema.parse({ ...current, timeOfDay: "twilight" })).toThrow();
  });
  it("rejects a comfort label outside the closed union", () => {
    expect(() =>
      CurrentConditionsSchema.parse({
        ...current,
        comfort: { ...current.comfort, thermal: "Balmy" },
      }),
    ).toThrow();
  });
  it("keeps the fields that feed a colour, a bar width or an angle as numbers", () => {
    for (const field of ["pressureMb", "uv", "windDegree", "humidity", "cloud"]) {
      expect(() => CurrentConditionsSchema.parse({ ...current, [field]: "12" })).toThrow();
    }
  });
});

describe("ForecastDaySchema", () => {
  it("parses a canonical fixture", () => {
    expect(ForecastDaySchema.parse(forecastDay)).toEqual(forecastDay);
  });
  it("parses a day carrying both amounts", () => {
    const wet = {
      ...forecastDay,
      totalPrecip: precipPair(4, "mm"),
      totalSnow: precipPair(2, "cm"),
    };
    expect(ForecastDaySchema.parse(wet)).toEqual(wet);
  });
  it("rejects a null min — every column prints a high and a low", () => {
    expect(() => ForecastDaySchema.parse({ ...forecastDay, min: null })).toThrow();
  });
  it("requires the precipitation fields — every day column renders them", () => {
    for (const field of [
      "chanceOfRain",
      "willItRain",
      "chanceOfSnow",
      "willItSnow",
      "totalPrecip",
      "totalSnow",
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
  temp: temperature(13.2, 55.8),
  feelsLike: temperature(12, 53.6),
  conditionText: "Partly cloudy",
  conditionCode: 1003,
  isDay: true,
  chanceOfRain: 10,
  chanceOfSnow: 0,
  willItRain: false,
  willItSnow: false,
  cloud: 45,
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

describe("HourlyForecastSchema", () => {
  it("requires the precipitation fields", () => {
    for (const field of ["chanceOfSnow", "willItRain", "willItSnow"]) {
      expect(() => HourlyForecastSchema.parse(without(hourlyEntry, field))).toThrow();
    }
  });
  it("rejects a numeric willItRain — the wire carries booleans, not upstream's 0/1", () => {
    expect(() => HourlyForecastSchema.parse({ ...hourlyEntry, willItRain: 1 })).toThrow();
  });
  it("carries no raw amount — the hourly row prints a chance only", () => {
    const parsed = HourlyForecastSchema.parse(hourlyEntry);
    expect(parsed).not.toHaveProperty("precipMm");
    expect(parsed).not.toHaveProperty("snowCm");
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
      airQualityIndex: null,
      forecast: [forecastDay],
      astro,
      hourly: [],
      alerts: [],
    };
    expect(WeatherForecastSchema.parse(fixture)).toEqual(fixture);
  });
  it("rejects a string chanceOfRain in a forecast day", () => {
    const fixture = {
      airQualityIndex: null,
      forecast: [{ ...forecastDay, chanceOfRain: "high" }],
      astro,
      hourly: [],
      alerts: [],
    };
    expect(() => WeatherForecastSchema.parse(fixture)).toThrow();
  });
  it("rejects a null alerts array — the worker always sends a list", () => {
    const fixture = {
      airQualityIndex: null,
      forecast: [forecastDay],
      astro,
      hourly: [],
      alerts: null,
    };
    expect(() => WeatherForecastSchema.parse(fixture)).toThrow();
  });
});
