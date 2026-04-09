import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { WeatherCurrent } from "@/api/types";
import { server } from "@/test/msw-server";
import { useWeather } from "./use-weather";

const fixture: WeatherCurrent = {
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
    const { result } = renderHook(() => useWeather({ query: "Lo" }), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });

  it("is disabled when the query is null", async () => {
    const { result } = renderHook(() => useWeather({ query: null }), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches and returns the DTO on success", async () => {
    server.use(http.get("/api/weather", () => HttpResponse.json(fixture)));

    const { result } = renderHook(() => useWeather({ query: "London" }), {
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

    const { result } = renderHook(() => useWeather({ query: "Xyznotacity" }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.kind).toBe("not_found");
  });
});
