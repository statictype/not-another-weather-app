import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/App";
import type {
  SuggestionItem,
  WeatherCurrent,
  WeatherForecast,
  WeatherYesterday,
} from "@/api/types";
import { __resetHistoryStoreForTests } from "@/hooks/use-history";
import { server } from "@/test/msw-server";

/**
 * End-to-end-ish tests for the full app, run via MSW so the real API
 * client, TanStack Query wiring, hooks, URL state, and UI all
 * participate. This file is the safety net for "did anything in the
 * URL → fetch → render → history flow break".
 *
 * Most weather-render assertions navigate via the URL (`?city=London`)
 * rather than clicking through the suggestion flow. URL-driven tests
 * are closer to how users actually arrive at a city (link sharing,
 * bookmarks) and don't couple every test to the search-bar UI. The
 * suggestion-click path still gets one dedicated test.
 *
 * Per docs/rfcs/007-url-driven-city.md.
 */

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
    conditionText: "Partly cloudy",
    conditionCode: 1003,
    timeOfDay: "day",
    windKph: 14,
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

const londonYesterday: WeatherYesterday = { yesterday: null };

const londonYesterdayDay: WeatherYesterday = {
  yesterday: {
    date: "2026-04-06",
    minC: 6,
    maxC: 13,
    avgC: 9.5,
    chanceOfRain: 10,
    conditionText: "Cloudy",
    conditionCode: 1006,
    isDay: true,
  },
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

  // Force the desktop search layout. The mobile overlay remounts the input
  // on focus (different JSX subtree), which detaches the element `user.type`
  // is targeting and leaves the input empty; the mobile recent pills also
  // omit the "Load weather for X" aria-label these tests query by.
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
    http.get("/api/weather/yesterday", () => HttpResponse.json(londonYesterday)),
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

    // Hero paints. Its <h2> city heading is unique to the hero card.
    await screen.findByRole("heading", { name: /london/i });
    // The readings moved out of the hero into the NowCard beside it.
    expect(screen.getAllByText(/12°C/).length).toBeGreaterThan(0);
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

    // URL now carries the city.
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("city")?.toLowerCase()).toContain(
        "london",
      );
    });

    // Hero paints. Its <h2> city heading is unique to the hero card.
    await screen.findByRole("heading", { name: /london/i });

    // History entry appears when re-opening the dropdown.
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /load weather for london/i })).toBeInTheDocument();
    });
  });

  it("clicking 'My location' multiple times dedupes despite GPS jitter", async () => {
    // GPS reads at the same physical spot jitter in the trailing
    // decimals — without rounding, each click composes a unique query
    // string and history (which dedupes by exact match) keeps them
    // all. `handleLocationRequest` rounds to ~1km precision so the
    // jittered reads collapse into one entry.
    // Typical GPS jitter is 5–10m at the same spot. The readings below
    // span ~15m and stay inside one 100m bin so `.toFixed(3)` collapses
    // them to a single query.
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

    // Any /api/weather call lands as London so each location-derived
    // query commits to history.
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
      // Hero paints — that's when the history-commit effect fires.
      await screen.findByRole("heading", { name: /london/i });
    }

    await user.click(input);
    const recentButtons = await screen.findAllByRole("button", {
      name: /load weather for/i,
    });
    expect(recentButtons).toHaveLength(1);
  });

  it("pressing Enter with no matching city is a silent no-op (no fetch, no alert)", async () => {
    // The menu auto-focuses the top city row and Enter commits it.
    // When there are no rows to commit (gibberish input with no recents
    // and no suggestions), Enter does nothing — no validation prompt,
    // no fetch. The inline "No cities found" hint already covers the
    // empty-state communication. See RFC 011.
    const user = userEvent.setup();
    renderAppAt("/");

    const input = screen.getByLabelText(/city/i);
    await user.type(input, "xyzgibberish");
    await user.keyboard("{Enter}");

    // The inline "No cities found" hint is shown in the dropdown; the
    // input's alert region stays empty (nothing was ever fetched).
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    await screen.findByText(/no cities found/i);

    // No weather card loaded — empty state heading still present.
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

  it("paints the hero before forecast before yesterday", async () => {
    // Staggered delays expose the three-tier paint order. If the hero
    // ever secretly starts blocking on forecast or yesterday (the bug
    // RFC 001 was meant to fix) this test will hang on the first
    // assertion.
    server.use(
      http.get("/api/weather", () => HttpResponse.json(londonCurrent)),
      http.get("/api/weather/forecast", async () => {
        await delay(30);
        return HttpResponse.json(londonForecast);
      }),
      http.get("/api/weather/yesterday", async () => {
        await delay(60);
        return HttpResponse.json(londonYesterdayDay);
      }),
    );

    renderAppAt("/?city=London");

    // t≈0: hero paints. "Feels like 11°" is unique to HeroCard (see
    // the gotcha in RFC 006 — `/partly cloudy/i` double-matches once
    // forecast lands).
    await screen.findByRole("heading", { name: /london/i });

    // Hero stats row is still shimmering — forecast hasn't landed yet.
    expect(document.querySelector("[aria-hidden='true'].animate-pulse")).toBeInTheDocument();

    // t≈30ms: forecast lands → "Today" label appears.
    await screen.findByText(/^today$/i);

    // t≈60ms: yesterday lands → "Yesterday" label appears.
    await screen.findByText(/^yesterday$/i);
  });

  it("removes a history item, shows undo toast, and restores it", async () => {
    const user = userEvent.setup();
    renderAppAt("/?city=London");

    // Wait for fetch to land and history entry to accumulate.
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
