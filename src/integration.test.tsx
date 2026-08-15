import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/App";
import type { SuggestionItem, WeatherCurrent, WeatherForecast } from "@/api/types";
import { __resetHistoryStoreForTests } from "@/hooks/use-history";
import { server } from "@/test/msw-server";

const londonCurrent: WeatherCurrent = {
  location: {
    name: "London",
    region: "Greater London",
    country: "United Kingdom",
    localTime: "",
    tz: "Europe/London",
    lat: 51.52,
    lon: -0.11,
  },
  current: {
    tempC: 12.3,
    feelsLikeC: 11.1,
    heatIndexC: 12.3,
    windchillC: 11.1,
    conditionText: "Partly cloudy",
    conditionCode: 1003,
    timeOfDay: "day",
    windKph: 14,
    windDir: "WSW",
    windDegree: 240,
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

const londonForecast: WeatherForecast = {
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
    {
      date: "2026-04-08",
      minC: 9,
      maxC: 16.5,
      avgC: 12.7,
      chanceOfRain: 30,
      willItRain: true,
      chanceOfSnow: 0,
      willItSnow: false,
      totalPrecipMm: 2.4,
      totalSnowCm: 0,
      conditionText: "Light rain",
      conditionCode: 1183,
      isDay: true,
    },
    {
      date: "2026-04-09",
      minC: 10,
      maxC: 17.5,
      avgC: 13.7,
      chanceOfRain: 10,
      willItRain: false,
      chanceOfSnow: 0,
      willItSnow: false,
      totalPrecipMm: 0,
      totalSnowCm: 0,
      conditionText: "Sunny",
      conditionCode: 1000,
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

const londonSuggestion: SuggestionItem = {
  id: 1,
  name: "London",
  region: "Greater London",
  country: "United Kingdom",
  lat: 51.52,
  lon: -0.11,
  url: "london-greater-london-united-kingdom",
};

function renderAppAt(url: string) {
  __resetHistoryStoreForTests();
  window.history.replaceState(null, "", url);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  __resetHistoryStoreForTests();
  window.history.replaceState(null, "", "/");

  // Desktop layout: the mobile overlay remounts the input on focus.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("min-width: 1024px"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  server.use(
    http.get("/api/weather", ({ request }) => {
      const q = new URL(request.url).searchParams.get("q")?.toLowerCase() ?? "";
      if (q.includes("london")) return HttpResponse.json(londonCurrent);
      return HttpResponse.json(
        { error: { kind: "not_found", message: "No matching location found." } },
        { status: 404 },
      );
    }),
    http.get("/api/weather/forecast", ({ request }) => {
      const q = new URL(request.url).searchParams.get("q")?.toLowerCase() ?? "";
      if (q.includes("london")) return HttpResponse.json(londonForecast);
      return HttpResponse.json(
        { error: { kind: "not_found", message: "No matching location found." } },
        { status: 404 },
      );
    }),
    http.get("/api/search", ({ request }) => {
      const q = new URL(request.url).searchParams.get("q")?.toLowerCase() ?? "";
      if (q.includes("london")) return HttpResponse.json([londonSuggestion]);
      return HttpResponse.json([]);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Oasis (integration)", () => {
  it("renders the weather for the city in the URL (no click-through)", async () => {
    renderAppAt("/?city=London");

    await screen.findByRole("heading", { name: /london/i });
    expect(screen.getAllByText(/12°/).length).toBeGreaterThan(0);
    expect(screen.getByText(/feels like/i)).toBeInTheDocument();
  });

  it("shows the empty state when the URL has no city", () => {
    renderAppAt("/");
    expect(screen.getByRole("heading", { name: /what's the weather/i })).toBeInTheDocument();
  });

  it("selecting a city suggestion updates the URL, fetches, and adds to history", async () => {
    const user = userEvent.setup();
    renderAppAt("/");

    const input = screen.getByLabelText(/city/i);
    await user.type(input, "London");

    const suggestion = await screen.findByRole("button", { name: /search weather for london/i });
    await user.click(suggestion);

    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("city")?.toLowerCase()).toContain(
        "london",
      );
    });

    await screen.findByRole("heading", { name: /london/i });

    await user.click(input);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /load weather for london/i })).toBeInTheDocument();
    });
  });

  it("clicking 'My location' multiple times dedupes despite GPS jitter", async () => {
    // These reads span ~15m and must collapse to one history entry.
    const readings = [
      { coords: { latitude: 51.52313, longitude: -0.12893 } },
      { coords: { latitude: 51.52319, longitude: -0.12889 } },
      { coords: { latitude: 51.52316, longitude: -0.12894 } },
    ];
    let readIdx = 0;
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success(readings[readIdx++ % readings.length] as GeolocationPosition);
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    server.use(http.get("/api/weather", () => HttpResponse.json(londonCurrent)));

    const user = userEvent.setup();
    renderAppAt("/");
    const input = screen.getByLabelText(/city/i);

    for (let i = 0; i < readings.length; i++) {
      await user.click(input);
      const myLocation = await screen.findByRole("button", { name: /my location/i });
      await user.click(myLocation);
      await waitFor(() => {
        expect(new URL(window.location.href).searchParams.get("city")).toBeTruthy();
      });
      await screen.findByRole("heading", { name: /london/i });
    }

    await user.click(input);
    const recentButtons = await screen.findAllByRole("button", {
      name: /load weather for/i,
    });
    expect(recentButtons).toHaveLength(1);
  });

  it("pressing Enter with no matching city is a silent no-op (no fetch, no alert)", async () => {
    const user = userEvent.setup();
    renderAppAt("/");

    const input = screen.getByLabelText(/city/i);
    await user.type(input, "xyzgibberish");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    await screen.findByText(/no cities found/i);

    expect(screen.getByRole("heading", { name: /what's the weather/i })).toBeInTheDocument();
  });

  it("names the failed city under the search input when the lookup 404s", async () => {
    renderAppAt("/?city=Llanfairpwllgwyngyll");

    const alert = screen.getByRole("alert");
    await waitFor(() => {
      expect(alert).toHaveTextContent(/no weather for “Llanfairpwllgwyngyll”/i);
    });
    expect(screen.getByLabelText(/city/i)).toHaveAttribute("aria-describedby", alert.id);
  });

  it("clears the input error once a real city lands", async () => {
    const user = userEvent.setup();
    renderAppAt("/?city=Nowhereville");

    const alert = screen.getByRole("alert");
    await waitFor(() => expect(alert).toHaveTextContent(/try a different spelling/i));

    const input = screen.getByLabelText(/city/i);
    await user.type(input, "London");
    await user.click(await screen.findByRole("button", { name: /search weather for london/i }));

    await screen.findByRole("heading", { name: /london/i });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    });
    expect(screen.getByLabelText(/city/i)).not.toHaveAttribute("aria-describedby");
  });

  it("paints the hero before the forecast", async () => {
    // If the hero ever blocks on forecast, this hangs below.
    server.use(
      http.get("/api/weather", () => HttpResponse.json(londonCurrent)),
      http.get("/api/weather/forecast", async () => {
        await delay(30);
        return HttpResponse.json(londonForecast);
      }),
    );

    renderAppAt("/?city=London");

    // `/partly cloudy/i` double-matches once forecast lands.
    await screen.findByRole("heading", { name: /london/i });

    expect(document.querySelector("[aria-hidden='true'].animate-pulse")).toBeInTheDocument();

    await screen.findByText(/^tomorrow$/i);
  });

  it("removes a history item, shows undo toast, and restores it", async () => {
    const user = userEvent.setup();
    renderAppAt("/?city=London");

    await screen.findByRole("heading", { name: /london/i });
    const input = screen.getByLabelText(/city/i);
    await user.click(input);
    await screen.findByRole("button", { name: /load weather for london/i });

    const removeBtn = await screen.findByRole("button", { name: /remove london/i });
    await user.click(removeBtn);

    expect(
      screen.queryByRole("button", { name: /load weather for london/i }),
    ).not.toBeInTheDocument();

    const undoBtn = await screen.findByRole("button", { name: /^undo$/i });
    await user.click(undoBtn);

    await user.click(input);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /load weather for london/i })).toBeInTheDocument();
    });
  });
});
