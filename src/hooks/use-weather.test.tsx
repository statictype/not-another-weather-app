import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { WeatherResponse } from "@/api/types";
import { server } from "@/test/msw-server";
import { useWeather } from "./use-weather";

const fixture: WeatherResponse = {
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

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useWeather", () => {
  it("is disabled when the query is shorter than minLength", async () => {
    const { result } = renderHook(() => useWeather({ query: "Lo", source: "user" }), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });

  it("is disabled when the query is null", async () => {
    const { result } = renderHook(() => useWeather({ query: null, source: "auto" }), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches and returns the DTO on success", async () => {
    server.use(http.get("/api/weather", () => HttpResponse.json(fixture)));

    const { result } = renderHook(() => useWeather({ query: "London", source: "user" }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(fixture);
  });

  it("surfaces typed errors with the correct kind", async () => {
    server.use(
      http.get("/api/weather", () =>
        HttpResponse.json(
          { error: { kind: "not_found", message: "No matching location found." } },
          { status: 404 },
        ),
      ),
    );

    const { result } = renderHook(() => useWeather({ query: "Xyznotacity", source: "user" }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.kind).toBe("not_found");
  });

  it("carries the source through to the result", async () => {
    server.use(http.get("/api/weather", () => HttpResponse.json(fixture)));

    const { result } = renderHook(() => useWeather({ query: "London", source: "auto" }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.source).toBe("auto");
  });
});
