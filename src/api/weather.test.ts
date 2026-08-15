import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw-server";
import { distance, pressure, speed, temperature } from "@/worker/format";
import { precipAmountPair, precipPair } from "@/worker/precip";
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
    temp: temperature(12.3, 54.1),
    feelsLike: temperature(11.1, 52),
    heatIndex: temperature(12.3, 54.1),
    windchill: temperature(11.1, 52),
    dewpoint: temperature(6.2, 43.2),
    conditionText: "Partly cloudy",
    conditionCode: 1003,
    timeOfDay: "day",
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
    comfort: { thermal: "Cool", air: "Slightly dry", sentence: "Cool but slightly dry" },
    beaufort: "Gentle breeze",
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
  airQualityIndex: 2,
  forecast: [
    {
      date: "2026-04-07",
      min: temperature(8, 46.4),
      max: temperature(15.5, 59.9),
      chanceOfRain: 20,
      willItRain: false,
      chanceOfSnow: 0,
      willItSnow: false,
      totalPrecip: precipPair(0, "mm"),
      totalSnow: precipPair(0, "cm"),
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
