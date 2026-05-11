import { z, ZodError } from "zod";
import type {
  Astro,
  CurrentConditions,
  ForecastDay,
  HourlyForecast,
  WeatherCurrent,
  WeatherForecast,
  WeatherLocation,
  WeatherYesterday,
} from "./types";
import { WeatherApiError } from "./errors";

/* ───── Upstream schemas (private to this file) ──────────────────────
 *
 * These describe the subset of WeatherAPI.com's response shapes we
 * actually consume. They are intentionally kept separate from the
 * exported DTO schemas in `@/lib/schemas` — the upstream shapes are
 * an implementation detail of this file and get replaced wholesale
 * if we ever swap providers.
 */

const UpstreamLocationSchema = z.object({
  name: z.string(),
  region: z.string(),
  country: z.string(),
  localtime: z.string(),
  tz_id: z.string(),
  lat: z.number(),
  lon: z.number(),
});

const UpstreamCurrentBlockSchema = z.object({
  temp_c: z.number(),
  feelslike_c: z.number(),
  heatindex_c: z.number().nullish(),
  is_day: z.union([z.literal(0), z.literal(1)]),
  condition: z.object({ text: z.string(), code: z.number() }),
  wind_kph: z.number(),
  wind_dir: z.string(),
  gust_kph: z.number().nullish(),
  humidity: z.number(),
  pressure_mb: z.number().nullish(),
  vis_km: z.number().nullish(),
  uv: z.number().nullish(),
  cloud: z.number().nullish(),
  dewpoint_c: z.number().nullish(),
  precip_mm: z.number().nullish(),
  air_quality: z
    .object({
      "us-epa-index": z.number(),
    })
    .passthrough()
    .nullish(),
});

const UpstreamCurrentResponseSchema = z.object({
  location: UpstreamLocationSchema,
  current: UpstreamCurrentBlockSchema,
});

const UpstreamHourSchema = z.object({
  time: z.string(),
  temp_c: z.number(),
  feelslike_c: z.number(),
  is_day: z.union([z.literal(0), z.literal(1)]),
  condition: z.object({ text: z.string(), code: z.number() }),
  chance_of_rain: z.number(),
  cloud: z.number(),
});

const UpstreamForecastDaySchema = z.object({
  date: z.string(),
  day: z.object({
    mintemp_c: z.number(),
    maxtemp_c: z.number(),
    avgtemp_c: z.number(),
    daily_chance_of_rain: z.number(),
    condition: z.object({ text: z.string(), code: z.number() }),
  }),
  astro: z.object({
    sunrise: z.string(),
    sunset: z.string(),
    moonrise: z.string(),
    moonset: z.string(),
    moon_phase: z.string(),
    moon_illumination: z.union([z.number(), z.string()]),
  }),
  hour: z.array(UpstreamHourSchema).optional(),
});

const UpstreamForecastResponseSchema = z.object({
  location: UpstreamLocationSchema,
  /**
   * The forecast endpoint always echoes a `current` block, but we only
   * need it for `air_quality` (passed via `aqi=yes`). Everything else
   * comes from the dedicated current.json call on the fast path.
   */
  current: UpstreamCurrentBlockSchema.optional(),
  forecast: z.object({
    forecastday: z.array(UpstreamForecastDaySchema),
  }),
});

type UpstreamLocation = z.infer<typeof UpstreamLocationSchema>;
type UpstreamCurrent = z.infer<typeof UpstreamCurrentBlockSchema>;
type UpstreamForecastDay = z.infer<typeof UpstreamForecastDaySchema>;

/**
 * Upstream client for WeatherAPI.com.
 *
 * The pipeline is split into three independently-cacheable calls so the
 * hero can paint on `current` without waiting for forecast or history.
 * Each function takes a normalized query, returns a shaped DTO, and
 * throws a typed `WeatherApiError` for anything that goes wrong. Callers
 * never see the upstream's schema or HTTP status codes.
 */

const UPSTREAM_CURRENT = "https://api.weatherapi.com/v1/current.json";
const UPSTREAM_FORECAST = "https://api.weatherapi.com/v1/forecast.json";
const UPSTREAM_HISTORY = "https://api.weatherapi.com/v1/history.json";
const UPSTREAM_SEARCH = "https://api.weatherapi.com/v1/search.json";

export interface SearchResult {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
}

interface UpstreamError {
  error: {
    code: number;
    message: string;
  };
}

/**
 * WeatherAPI error codes we map explicitly. Anything else collapses to
 * the generic `upstream` kind so we never leak vendor-specific failure
 * modes (especially anything involving the API key) to the client.
 *
 * Reference: https://www.weatherapi.com/docs/#intro-error-codes
 */
function mapUpstreamErrorCode(code: number): WeatherApiError {
  switch (code) {
    case 1006:
      return new WeatherApiError("not_found", "No matching location found.");
    case 2007:
      return new WeatherApiError(
        "quota_exceeded",
        "Weather service quota exceeded. Please try again later.",
      );
    default:
      // 1002, 1003, 1005, 2006, 2008, 2009, 9999, ... — collapse.
      return new WeatherApiError("upstream", "Weather service is unavailable.");
  }
}

/**
 * Fetch an upstream endpoint and validate the response body against
 * `schema`. Parse failures are mapped to `WeatherApiError("upstream", …)`
 * with the structured `ZodError` logged to worker console so operators
 * can see the exact field mismatch without it leaking to clients.
 */
async function fetchUpstream<S extends z.ZodType>(
  url: URL,
  schema: S,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      ...(signal ? { signal } : {}),
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    console.error("[oasis] upstream fetch threw", err);
    throw new WeatherApiError("network", "Could not reach weather service.");
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    console.error("[oasis] upstream returned non-JSON body", res.status, err);
    throw new WeatherApiError("upstream", "Weather service returned an invalid response.");
  }

  if (!res.ok) {
    const upstreamError = body as UpstreamError;
    const code = upstreamError?.error?.code;
    if (typeof code === "number") {
      throw mapUpstreamErrorCode(code);
    }
    console.error("[oasis] upstream non-ok with no error code", res.status);
    throw new WeatherApiError("upstream", "Weather service is unavailable.");
  }

  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      console.error("[oasis] upstream response failed schema validation", err.issues);
    } else {
      console.error("[oasis] unexpected schema parse error", err);
    }
    throw new WeatherApiError("upstream", "Weather service returned an unexpected response.");
  }
}

export async function fetchCurrent(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<WeatherCurrent> {
  const url = new URL(UPSTREAM_CURRENT);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("aqi", "no");

  const raw = await fetchUpstream(url, UpstreamCurrentResponseSchema, signal);
  return {
    location: shapeLocation(raw.location),
    current: shapeCurrent(raw.current),
  };
}

export async function fetchForecast3(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<WeatherForecast> {
  const url = new URL(UPSTREAM_FORECAST);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("days", "3");
  url.searchParams.set("aqi", "yes");
  url.searchParams.set("alerts", "no");

  const raw = await fetchUpstream(url, UpstreamForecastResponseSchema, signal);
  const today = raw.forecast.forecastday[0];
  if (!today) {
    throw new WeatherApiError("upstream", "Weather service returned an incomplete response.");
  }
  const hourly: HourlyForecast[] = raw.forecast.forecastday.flatMap(
    (d) => (d.hour ?? []).map(shapeHourly),
  );
  const epa = raw.current?.air_quality?.["us-epa-index"];
  return {
    today: {
      minC: round1(today.day.mintemp_c),
      maxC: round1(today.day.maxtemp_c),
      chanceOfRain: today.day.daily_chance_of_rain,
    },
    airQualityIndex: typeof epa === "number" ? epa : null,
    forecast: raw.forecast.forecastday.map(shapeForecastDay),
    astro: shapeAstro(today.astro),
    hourly,
  };
}

export async function fetchYesterday(
  query: string,
  apiKey: string,
  dt: string,
  signal?: AbortSignal,
): Promise<WeatherYesterday> {
  const url = new URL(UPSTREAM_HISTORY);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("dt", dt);

  try {
    const raw = await fetchUpstream(url, UpstreamForecastResponseSchema, signal);
    const day = raw.forecast?.forecastday?.[0];
    if (!day) return { yesterday: null };
    return { yesterday: shapeForecastDay(day) };
  } catch (err) {
    // History failures are non-fatal — the UI just omits the column.
    console.warn("[oasis] yesterday fetch failed (non-fatal)", err);
    return { yesterday: null };
  }
}

function shapeLocation(raw: UpstreamLocation): WeatherLocation {
  return {
    name: raw.name,
    region: raw.region,
    country: raw.country,
    localTime: raw.localtime,
    tz: raw.tz_id,
    lat: raw.lat,
    lon: raw.lon,
  };
}

function shapeCurrent(raw: UpstreamCurrent): CurrentConditions {
  return {
    tempC: round1(raw.temp_c),
    feelsLikeC: round1(raw.feelslike_c),
    // Heat index is only meaningful in warm/humid weather; in cold air
    // the upstream may omit it. Fall back to the air temperature so
    // the field is always a real number for downstream consumers.
    heatIndexC: round1(raw.heatindex_c ?? raw.temp_c),
    conditionText: raw.condition.text,
    conditionCode: raw.condition.code,
    timeOfDay: raw.is_day === 1 ? "day" : "night",
    windKph: round1(raw.wind_kph),
    windDir: raw.wind_dir,
    gustKph: round1(raw.gust_kph ?? 0),
    humidity: raw.humidity,
    pressureMb: round1(raw.pressure_mb ?? 0),
    visibilityKm: round1(raw.vis_km ?? 0),
    uv: raw.uv ?? 0,
    cloud: raw.cloud ?? 0,
    dewpointC: round1(raw.dewpoint_c ?? 0),
    precipMm: round1(raw.precip_mm ?? 0),
  };
}

function shapeForecastDay(d: UpstreamForecastDay): ForecastDay {
  return {
    date: d.date,
    minC: round1(d.day.mintemp_c),
    maxC: round1(d.day.maxtemp_c),
    avgC: round1(d.day.avgtemp_c),
    chanceOfRain: d.day.daily_chance_of_rain,
    conditionText: d.day.condition.text,
    conditionCode: d.day.condition.code,
    isDay: true,
  };
}

function shapeHourly(h: z.infer<typeof UpstreamHourSchema>): HourlyForecast {
  return {
    time: h.time,
    tempC: round1(h.temp_c),
    feelsLikeC: round1(h.feelslike_c),
    conditionText: h.condition.text,
    conditionCode: h.condition.code,
    isDay: h.is_day === 1,
    chanceOfRain: h.chance_of_rain,
    cloud: h.cloud,
  };
}

function shapeAstro(raw: UpstreamForecastDay["astro"]): Astro {
  return {
    sunrise: raw.sunrise,
    sunset: raw.sunset,
    moonrise: raw.moonrise,
    moonset: raw.moonset,
    moonPhase: raw.moon_phase,
    moonIllumination:
      typeof raw.moon_illumination === "string"
        ? Number.parseInt(raw.moon_illumination, 10) || 0
        : raw.moon_illumination,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function fetchSearch(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const url = new URL(UPSTREAM_SEARCH);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      ...(signal ? { signal } : {}),
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    console.error("[oasis] search upstream fetch threw", err);
    throw new WeatherApiError("network", "Could not reach weather service.");
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    console.error("[oasis] search upstream returned non-JSON body", res.status, err);
    throw new WeatherApiError("upstream", "Weather service returned an invalid response.");
  }

  if (!res.ok) {
    const upstreamError = body as { error?: { code?: number } };
    const code = upstreamError?.error?.code;
    if (typeof code === "number") {
      throw mapUpstreamErrorCode(code);
    }
    throw new WeatherApiError("upstream", "Weather service is unavailable.");
  }

  return body as SearchResult[];
}
