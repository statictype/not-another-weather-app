import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw-server";
import type { WeatherResponse } from "./types";
import { fetchWeather, WeatherClientError } from "./weather";

const okFixture: WeatherResponse = {
  location: {
    name: "London",
    region: "",
    country: "UK",
    localTime: "2026-04-07T14:32",
    lat: 51.52,
    lon: -0.11,
  },
  current: {
    tempC: 12.3,
    feelsLikeC: 11.1,
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
  today: { minC: 8, maxC: 15.5, chanceOfRain: 20 },
  forecast: [],
  astro: {
    sunrise: "06:32 AM",
    sunset: "07:48 PM",
    moonrise: "10:00 PM",
    moonset: "08:14 AM",
    moonPhase: "Waxing Gibbous",
    moonIllumination: 72,
  },
};

describe("fetchWeather", () => {
  it("returns the parsed DTO on 200", async () => {
    server.use(http.get("/api/weather", () => HttpResponse.json(okFixture)));
    const result = await fetchWeather("London");
    expect(result).toEqual(okFixture);
  });

  it("throws WeatherClientError with not_found kind on 404", async () => {
    server.use(
      http.get("/api/weather", () =>
        HttpResponse.json({ error: { kind: "not_found", message: "No city" } }, { status: 404 }),
      ),
    );
    await expect(fetchWeather("Xyz")).rejects.toMatchObject({
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
    await expect(fetchWeather("London")).rejects.toMatchObject({ kind: "quota_exceeded" });
  });

  it("falls back to status-derived kind when the body is not JSON", async () => {
    server.use(http.get("/api/weather", () => new HttpResponse("oops", { status: 500 })));
    await expect(fetchWeather("London")).rejects.toBeInstanceOf(WeatherClientError);
    await expect(fetchWeather("London")).rejects.toMatchObject({ kind: "upstream" });
  });

  it("maps a network failure to the network kind", async () => {
    server.use(http.get("/api/weather", () => HttpResponse.error()));
    await expect(fetchWeather("London")).rejects.toMatchObject({ kind: "network" });
  });
});
