import { fetchMock, SELF } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Worker proxy tests.
 *
 * `fetchMock` from `cloudflare:test` is an undici MockAgent — it intercepts
 * outgoing fetches made *inside* the Worker runtime. We use it to stub the
 * WeatherAPI upstream and assert how the proxy handles each branch:
 *
 *   - happy path → shaped DTO + MISS cache header
 *   - cache hit  → second request returns HIT without re-calling upstream
 *   - 1006       → not_found / 404
 *   - 2007       → quota_exceeded / 429
 *   - other code → upstream / 502 (no leakage of vendor specifics)
 *   - empty q    → invalid_query / 400 (no upstream call)
 *   - normalize  → "London", " london ", "LONDON" all hit one cache entry
 */

const upstreamAstro = {
  sunrise: "06:32 AM",
  sunset: "07:48 PM",
  moonrise: "10:00 PM",
  moonset: "08:14 AM",
  moon_phase: "Waxing Gibbous",
  moon_illumination: 72,
};

const upstreamFixture = {
  location: {
    name: "London",
    region: "City of London, Greater London",
    country: "United Kingdom",
    localtime: "2026-04-07 14:32",
    tz_id: "Europe/London",
    lat: 51.52,
    lon: -0.11,
  },
  current: {
    temp_c: 12.3456,
    feelslike_c: 11.1,
    is_day: 1,
    condition: { text: "Partly cloudy", code: 1003 },
    wind_kph: 14.4,
    wind_dir: "WSW",
    gust_kph: 22,
    humidity: 67,
    pressure_mb: 1015,
    vis_km: 10,
    uv: 4,
    cloud: 40,
    dewpoint_c: 6.2,
    precip_mm: 0,
  },
  forecast: {
    forecastday: [
      {
        date: "2026-04-07",
        day: {
          mintemp_c: 8.0,
          maxtemp_c: 15.5,
          avgtemp_c: 11.7,
          daily_chance_of_rain: 20,
          condition: { text: "Partly cloudy", code: 1003 },
        },
        astro: upstreamAstro,
      },
    ],
  },
};

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

describe("Worker /api/weather", () => {
  beforeEach(async () => {
    // Each test starts with a clean cache so cache-hit assertions are deterministic.
    // The Cache API exposed under `caches.default` is per-runtime; we create a
    // fresh cache key per test instead by varying the q param.
  });

  it("returns a shaped DTO on success and marks the response as a MISS", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/forecast.json") })
      .reply(200, upstreamFixture);

    const res = await SELF.fetch("https://example.com/api/weather?q=London-success");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Oasis-Cache")).toBe("MISS");

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      location: {
        name: "London",
        country: "United Kingdom",
      },
      current: {
        tempC: 12.3,
        feelsLikeC: 11.1,
        conditionText: "Partly cloudy",
        conditionCode: 1003,
        timeOfDay: "day",
        windKph: 14.4,
        windDir: "WSW",
        humidity: 67,
      },
      today: {
        minC: 8,
        maxC: 15.5,
        chanceOfRain: 20,
      },
    });
  });

  it("returns 404 with not_found kind for upstream code 1006", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/forecast.json") })
      .reply(400, { error: { code: 1006, message: "No matching location found." } });

    const res = await SELF.fetch("https://example.com/api/weather?q=Xyznotacity1");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { kind: string } };
    expect(body.error.kind).toBe("not_found");
  });

  it("returns 429 with quota_exceeded kind for upstream code 2007", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/forecast.json") })
      .reply(403, { error: { code: 2007, message: "API key quota has been exceeded." } });

    const res = await SELF.fetch("https://example.com/api/weather?q=quotacity");
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: { kind: string } };
    expect(body.error.kind).toBe("quota_exceeded");
  });

  it("collapses unknown upstream errors to the generic upstream kind", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/forecast.json") })
      .reply(401, { error: { code: 2006, message: "API key is invalid." } });

    const res = await SELF.fetch("https://example.com/api/weather?q=keyissuecity");
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { kind: string; message: string } };
    expect(body.error.kind).toBe("upstream");
    // Crucially: the message must NOT mention "key" or vendor specifics.
    expect(body.error.message.toLowerCase()).not.toContain("key");
  });

  it("rejects empty queries with invalid_query without calling upstream", async () => {
    // No interceptor registered — if upstream is called, fetchMock will throw.
    const res = await SELF.fetch("https://example.com/api/weather?q=");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { kind: string } };
    expect(body.error.kind).toBe("invalid_query");
  });

  it("caches a successful response and serves the second call as HIT", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/forecast.json") })
      .reply(200, upstreamFixture);

    const first = await SELF.fetch("https://example.com/api/weather?q=Cachetest1");
    expect(first.status).toBe(200);
    expect(first.headers.get("X-Oasis-Cache")).toBe("MISS");
    await first.text(); // drain

    // No new interceptor — if the handler hits upstream again, fetchMock throws.
    const second = await SELF.fetch("https://example.com/api/weather?q=Cachetest1");
    expect(second.status).toBe(200);
    expect(second.headers.get("X-Oasis-Cache")).toBe("HIT");
  });

  it("normalizes the query so casing/whitespace variants share one cache entry", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/forecast.json") })
      .reply(200, upstreamFixture);

    const first = await SELF.fetch("https://example.com/api/weather?q=NormalizedCity");
    expect(first.headers.get("X-Oasis-Cache")).toBe("MISS");
    await first.text();

    // Different casing + whitespace, should hit cache without a second upstream call.
    const second = await SELF.fetch(
      `https://example.com/api/weather?q=${encodeURIComponent("  normalizedcity  ")}`,
    );
    expect(second.headers.get("X-Oasis-Cache")).toBe("HIT");
  });
});
