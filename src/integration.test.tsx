import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import type { WeatherResponse } from "@/api/types";
import { __resetHistoryStoreForTests } from "@/hooks/use-history";
import { server } from "@/test/msw-server";

/**
 * One end-to-end-ish test for the full app, run via MSW so the real
 * API client, the real TanStack Query wiring, the real hooks, and the
 * real UI all participate. This test is the project's safety net for
 * "did anything in the search → fetch → render → history flow break".
 *
 * Per-component tests would duplicate effort here without adding signal,
 * so they're intentionally not written.
 */

const londonFixture: WeatherResponse = {
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
  today: { minC: 8, maxC: 15.5, chanceOfRain: 20 },
  forecast: [],
  yesterday: null,
  astro: {
    sunrise: "06:32 AM",
    sunset: "07:48 PM",
    moonrise: "10:00 PM",
    moonset: "08:14 AM",
    moonPhase: "Waxing Gibbous",
    moonIllumination: 72,
  },
};

const parisFixture: WeatherResponse = {
  ...londonFixture,
  location: {
    name: "Paris",
    region: "Île-de-France",
    country: "France",
    localTime: "",
    tz: "Europe/London",
    lat: 48.85,
    lon: 2.35,
  },
  current: { ...londonFixture.current, tempC: 18.0, conditionText: "Sunny", conditionCode: 1000 },
};

function renderApp() {
  __resetHistoryStoreForTests();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  __resetHistoryStoreForTests();
  // Default handler: route by query so the same setup serves multiple cities.
  server.use(
    http.get("/api/weather", ({ request }) => {
      const q = new URL(request.url).searchParams.get("q")?.toLowerCase() ?? "";
      if (q.includes("london")) return HttpResponse.json(londonFixture);
      if (q.includes("paris")) return HttpResponse.json(parisFixture);
      return HttpResponse.json(
        { error: { kind: "not_found", message: "No matching location found." } },
        { status: 404 },
      );
    }),
  );
});

describe("Oasis (integration)", () => {
  it("typing a city debounces, fetches, renders the card, and adds to history", async () => {
    const user = userEvent.setup();
    renderApp();

    // Empty state visible.
    expect(screen.getByRole("heading", { name: /pick a city/i })).toBeInTheDocument();

    const input = screen.getByLabelText(/city/i);
    await user.type(input, "London");

    // Card eventually appears with the right condition and rounded temperature.
    await screen.findByText(/partly cloudy/i);
    expect(screen.getByText("12")).toBeInTheDocument();

    // History entry for London appears in the dropdown once committed.
    await user.tab();
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /load weather for london/i })).toBeInTheDocument();
    });
  });

  it("shows an inline validation error for unknown cities and keeps the previous card", async () => {
    const user = userEvent.setup();
    renderApp();

    const input = screen.getByLabelText(/city/i);
    await user.type(input, "London");
    await screen.findByText(/partly cloudy/i);
    await user.tab(); // commit London

    // Now type an unknown city.
    await user.click(input);
    await user.clear(input);
    await user.type(input, "Xyznotacity");
    await user.tab(); // blur to defocus, error becomes visible

    // Inline error surfaces.
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/no city named/i);
    });

    // Previous London card should still be on screen.
    expect(screen.getByText(/partly cloudy/i)).toBeInTheDocument();
  });

  it("removes a history item, shows undo toast, and restores it", async () => {
    const user = userEvent.setup();
    renderApp();

    const input = screen.getByLabelText(/city/i);
    await user.type(input, "London");
    await screen.findByText(/partly cloudy/i);
    await user.tab();

    // Re-focus input to open the recent dropdown.
    await user.click(input);
    await screen.findByRole("button", { name: /load weather for london/i });

    const removeBtn = await screen.findByRole("button", {
      name: /remove london/i,
    });
    await user.click(removeBtn);

    // History entry gone.
    expect(
      screen.queryByRole("button", { name: /load weather for london/i }),
    ).not.toBeInTheDocument();

    // Toast undo button appears.
    const undoBtn = await screen.findByRole("button", { name: /^undo$/i });
    await user.click(undoBtn);

    // Re-open the dropdown to verify the entry is back.
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /load weather for london/i })).toBeInTheDocument();
    });
  });
});
