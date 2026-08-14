import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw-server";
import type { WeatherCurrent, WeatherForecast } from "./types";
import { fetchCurrent, fetchForecast, WeatherClientError } from "./weather";

const okFixture: WeatherCurrent = {
  location: {
    name: "London",
    region: "",
    country: "UK",
    localTime: "2026-04-07T14:32",
    tz: "Europe/London",
    lat: 51.52,
    lon: -0.11,
  },
  current: {
    tempC: 12.3,
    feelsLikeC: 11.1,
    heatIndexC: 12.3,
    conditionText: "Partly cloudy",
    conditionCode: 1003,
    timeOfDay: "day",
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
  },
};

describe("fetchCurrent", () => {
  it("returns the parsed DTO on 200", async () => {
    server.use(http.get("/api/weather", () => HttpResponse.json(okFixture)));
    const result = await fetchCurrent("London");
    expect(result).toEqual(okFixture);
  });

  it("throws WeatherClientError with not_found kind on 404", async () => {
    server.use(
      http.get("/api/weather", () =>
        HttpResponse.json({ error: { kind: "not_found", message: "No city" } }, { status: 404 }),
      ),
    );
    await expect(fetchCurrent("Xyz")).rejects.toMatchObject({
      kind: "not_found",
      message: "No city",
    });
  });

  it("throws quota_exceeded on 429", async () => {
    server.use(
      http.get("/api/weather", () =>
        HttpResponse.json({ error: { kind: "quota_exceeded", message: "out" } }, { status: 429 }),
      ),
    );
    await expect(fetchCurrent("London")).rejects.toMatchObject({ kind: "quota_exceeded" });
  });

  it("falls back to status-derived kind when the body is not JSON", async () => {
    server.use(http.get("/api/weather", () => new HttpResponse("oops", { status: 500 })));
    await expect(fetchCurrent("London")).rejects.toBeInstanceOf(WeatherClientError);
    await expect(fetchCurrent("London")).rejects.toMatchObject({ kind: "upstream" });
  });

  it("maps a network failure to the network kind", async () => {
    server.use(http.get("/api/weather", () => HttpResponse.error()));
    await expect(fetchCurrent("London")).rejects.toMatchObject({ kind: "network" });
  });
});

const forecastFixture: WeatherForecast = {
  today: {
    minC: 8,
    maxC: 15.5,
    chanceOfRain: 20,
    willItRain: false,
    chanceOfSnow: 0,
    willItSnow: false,
    totalPrecipMm: 0,
    totalSnowCm: 0,
  },
  airQualityIndex: 2,
  forecast: [
    {
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
    },
  ],
  astro: {
    sunrise: "06:32 AM",
    sunset: "07:48 PM",
    moonrise: "10:00 PM",
    moonset: "08:14 AM",
    moonPhase: "Waxing Gibbous",
    moonIllumination: 72,
  },
  hourly: [],
  alerts: [],
};

describe("fetchForecast", () => {
  it("returns the parsed DTO on 200", async () => {
    server.use(http.get("/api/weather/forecast", () => HttpResponse.json(forecastFixture)));
    const result = await fetchForecast("London");
    expect(result).toEqual(forecastFixture);
  });

  it("throws WeatherClientError with not_found kind on 404", async () => {
    server.use(
      http.get("/api/weather/forecast", () =>
        HttpResponse.json(
          { error: { kind: "not_found", message: "No matching location found." } },
          { status: 404 },
        ),
      ),
    );
    await expect(fetchForecast("Xyz")).rejects.toBeInstanceOf(WeatherClientError);
    await expect(fetchForecast("Xyz")).rejects.toMatchObject({ kind: "not_found" });
  });
});
