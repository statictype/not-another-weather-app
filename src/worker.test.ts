import { fetchMock, SELF } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

/**
 * Worker proxy tests for the three-tier weather pipeline.
 *
 * `fetchMock` from `cloudflare:test` is an undici MockAgent that
 * intercepts outgoing fetches made *inside* the Worker runtime. We stub
 * each upstream endpoint and assert the handler behavior for every
 * branch that matters:
 *
 *   - happy path → shaped DTO + MISS header
 *   - cache hit  → second request returns HIT without re-calling upstream
 *   - 1006       → not_found / 404
 *   - 2007       → quota_exceeded / 429
 *   - other code → upstream / 502 (no vendor detail leaked)
 *   - empty q    → invalid_query / 400 (no upstream call)
 *   - normalize  → casing / whitespace variants share one cache entry
 */

const upstreamLocation = {
  name: "London",
  region: "City of London, Greater London",
  country: "United Kingdom",
  localtime: "2026-04-07 14:32",
  tz_id: "Europe/London",
  lat: 51.52,
  lon: -0.11,
};

const upstreamCurrentFixture = {
  location: upstreamLocation,
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
};

const upstreamAstro = {
  sunrise: "06:32 AM",
  sunset: "07:48 PM",
  moonrise: "10:00 PM",
  moonset: "08:14 AM",
  moon_phase: "Waxing Gibbous",
  moon_illumination: 72,
};

const upstreamForecastFixture = {
  location: upstreamLocation,
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
      {
        date: "2026-04-08",
        day: {
          mintemp_c: 9.0,
          maxtemp_c: 16.0,
          avgtemp_c: 12.5,
          daily_chance_of_rain: 15,
          condition: { text: "Sunny", code: 1000 },
        },
        astro: upstreamAstro,
      },
      {
        date: "2026-04-09",
        day: {
          mintemp_c: 7.0,
          maxtemp_c: 14.0,
          avgtemp_c: 10.5,
          daily_chance_of_rain: 40,
          condition: { text: "Light rain", code: 1063 },
        },
        astro: upstreamAstro,
      },
    ],
  },
};

const upstreamYesterdayFixture = {
  location: upstreamLocation,
  forecast: {
    forecastday: [
      {
        date: "2026-04-06",
        day: {
          mintemp_c: 6.0,
          maxtemp_c: 13.0,
          avgtemp_c: 9.5,
          daily_chance_of_rain: 10,
          condition: { text: "Cloudy", code: 1006 },
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

// ─── /api/weather (current) ─────────────────────────────────────────────

describe("Worker /api/weather (current)", () => {
  it("returns a shaped current DTO and marks the response as MISS", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/current.json") })
      .reply(200, upstreamCurrentFixture);

    const res = await SELF.fetch("https://example.com/api/weather?q=London-current-success");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Oasis-Cache")).toBe("MISS");

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      location: { name: "London", country: "United Kingdom" },
      current: {
        tempC: 12.3,
        conditionText: "Partly cloudy",
        conditionCode: 1003,
        timeOfDay: "day",
        windDir: "WSW",
        humidity: 67,
      },
    });
    // The fast endpoint must not include forecast / yesterday / astro.
    expect(body.forecast).toBeUndefined();
    expect(body.yesterday).toBeUndefined();
    expect(body.astro).toBeUndefined();
    expect(body.today).toBeUndefined();
  });

  it("returns 404 with not_found kind for upstream code 1006", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/current.json") })
      .reply(400, { error: { code: 1006, message: "No matching location found." } });

    const res = await SELF.fetch("https://example.com/api/weather?q=Xyznotacity1");
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { kind: string } }).error.kind).toBe("not_found");
  });

  it("returns 429 with quota_exceeded for upstream code 2007", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/current.json") })
      .reply(403, { error: { code: 2007, message: "API key quota has been exceeded." } });

    const res = await SELF.fetch("https://example.com/api/weather?q=quotacity");
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: { kind: string } }).error.kind).toBe("quota_exceeded");
  });

  it("maps a structurally-broken upstream body to upstream / 502 without leaking field names", async () => {
    const broken = structuredClone(upstreamCurrentFixture) as unknown as {
      current: { temp_c: unknown };
    };
    broken.current.temp_c = "hot";
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/current.json") })
      .reply(200, broken);

    const res = await SELF.fetch("https://example.com/api/weather?q=CurrentSchemaReject");
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { kind: string; message: string } };
    expect(body.error.kind).toBe("upstream");
    expect(body.error.message.toLowerCase()).not.toContain("temp");
  });

  it("collapses unknown upstream errors to the generic upstream kind without leaking vendor detail", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/current.json") })
      .reply(401, { error: { code: 2006, message: "API key is invalid." } });

    const res = await SELF.fetch("https://example.com/api/weather?q=keyissuecity");
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { kind: string; message: string } };
    expect(body.error.kind).toBe("upstream");
    expect(body.error.message.toLowerCase()).not.toContain("key");
  });

  it("rejects empty queries with invalid_query without calling upstream", async () => {
    const res = await SELF.fetch("https://example.com/api/weather?q=");
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { kind: string } }).error.kind).toBe("invalid_query");
  });

  it("caches a successful response and serves the second call as HIT", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/current.json") })
      .reply(200, upstreamCurrentFixture);

    const first = await SELF.fetch("https://example.com/api/weather?q=CurrentCache1");
    expect(first.headers.get("X-Oasis-Cache")).toBe("MISS");
    await first.text();

    const second = await SELF.fetch("https://example.com/api/weather?q=CurrentCache1");
    expect(second.headers.get("X-Oasis-Cache")).toBe("HIT");
  });

  it("normalizes the query so casing / whitespace variants share one cache entry", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/current.json") })
      .reply(200, upstreamCurrentFixture);

    const first = await SELF.fetch("https://example.com/api/weather?q=CurrentNormalizeCity");
    expect(first.headers.get("X-Oasis-Cache")).toBe("MISS");
    await first.text();

    const second = await SELF.fetch(
      `https://example.com/api/weather?q=${encodeURIComponent("  currentnormalizecity  ")}`,
    );
    expect(second.headers.get("X-Oasis-Cache")).toBe("HIT");
  });
});

// ─── /api/weather/forecast ──────────────────────────────────────────────

describe("Worker /api/weather/forecast", () => {
  it("returns today + 3-day forecast + astro, and marks MISS", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/forecast.json") })
      .reply(200, upstreamForecastFixture);

    const res = await SELF.fetch("https://example.com/api/weather/forecast?q=ForecastCity1");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Oasis-Cache")).toBe("MISS");

    const body = (await res.json()) as {
      today: { minC: number; maxC: number; chanceOfRain: number };
      forecast: Array<{ date: string }>;
      astro: { sunrise: string };
    };
    expect(body.today).toEqual({ minC: 8, maxC: 15.5, chanceOfRain: 20 });
    expect(body.forecast).toHaveLength(3);
    expect(body.forecast[0]?.date).toBe("2026-04-07");
    expect(body.astro.sunrise).toBe("06:32 AM");
  });

  it("caches forecast responses independently from current", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/forecast.json") })
      .reply(200, upstreamForecastFixture);

    const first = await SELF.fetch("https://example.com/api/weather/forecast?q=ForecastCache1");
    expect(first.headers.get("X-Oasis-Cache")).toBe("MISS");
    await first.text();

    const second = await SELF.fetch("https://example.com/api/weather/forecast?q=ForecastCache1");
    expect(second.headers.get("X-Oasis-Cache")).toBe("HIT");
  });

  it("rejects empty queries with invalid_query", async () => {
    const res = await SELF.fetch("https://example.com/api/weather/forecast?q=");
    expect(res.status).toBe(400);
  });

  it("maps a structurally-broken upstream body to upstream / 502 without leaking field names", async () => {
    const broken = structuredClone(upstreamForecastFixture) as unknown as {
      forecast: { forecastday: Array<{ day: { mintemp_c: unknown } }> };
    };
    // biome-ignore lint/style/noNonNullAssertion: fixture has three days
    broken.forecast.forecastday[0]!.day.mintemp_c = null;
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/forecast.json") })
      .reply(200, broken);

    const res = await SELF.fetch("https://example.com/api/weather/forecast?q=ForecastSchemaReject");
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { kind: string; message: string } };
    expect(body.error.kind).toBe("upstream");
    expect(body.error.message.toLowerCase()).not.toContain("mintemp");
  });
});

// ─── /api/weather/yesterday ─────────────────────────────────────────────

describe("Worker /api/weather/yesterday", () => {
  it("returns yesterday's shaped day and marks MISS", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/history.json") })
      .reply(200, upstreamYesterdayFixture);

    const res = await SELF.fetch("https://example.com/api/weather/yesterday?q=YesterdayCity1");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Oasis-Cache")).toBe("MISS");

    const body = (await res.json()) as { yesterday: { date: string; minC: number } | null };
    expect(body.yesterday?.date).toBe("2026-04-06");
    expect(body.yesterday?.minC).toBe(6);
  });

  it("surfaces upstream failures as 502/upstream — UI handles non-fatality via optional chaining", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/history.json") })
      .reply(500, { error: { code: 9999, message: "boom" } });

    const res = await SELF.fetch("https://example.com/api/weather/yesterday?q=YesterdayFailCity");
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { kind: string } };
    expect(body.error.kind).toBe("upstream");
  });

  it("caches yesterday responses per (city, dt)", async () => {
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/history.json") })
      .reply(200, upstreamYesterdayFixture);

    const first = await SELF.fetch("https://example.com/api/weather/yesterday?q=YesterdayCache1");
    expect(first.headers.get("X-Oasis-Cache")).toBe("MISS");
    await first.text();

    const second = await SELF.fetch("https://example.com/api/weather/yesterday?q=YesterdayCache1");
    expect(second.headers.get("X-Oasis-Cache")).toBe("HIT");
  });

  it("rejects empty queries with invalid_query", async () => {
    const res = await SELF.fetch("https://example.com/api/weather/yesterday?q=");
    expect(res.status).toBe(400);
  });

  it("rejects a schema-broken upstream body with 502/upstream and no leaked field names", async () => {
    // Missing `forecastday` — UpstreamForecastResponseSchema rejects.
    // Previously this was swallowed into { yesterday: null }; the
    // rendering layer now handles non-fatality via optional chaining.
    fetchMock
      .get("https://api.weatherapi.com")
      .intercept({ path: (p) => p.startsWith("/v1/history.json") })
      .reply(200, { location: upstreamLocation, forecast: {} });

    const res = await SELF.fetch(
      "https://example.com/api/weather/yesterday?q=YesterdaySchemaReject",
    );
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { kind: string; message: string } };
    expect(body.error.kind).toBe("upstream");
    expect(body.error.message.toLowerCase()).not.toContain("forecastday");
  });
});
