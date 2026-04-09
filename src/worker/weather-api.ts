import { WeatherApiError } from "./errors";
import type {
  Astro,
  CurrentConditions,
  ForecastDay,
  WeatherCurrent,
  WeatherForecast,
  WeatherLocation,
  WeatherYesterday,
} from "./types";

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

/** Subset of WeatherAPI's `location` block we actually use. */
interface UpstreamLocation {
  name: string;
  region: string;
  country: string;
  localtime: string;
  tz_id: string;
  lat: number;
  lon: number;
}

/** Subset of WeatherAPI's `current` block we actually use. */
interface UpstreamCurrent {
  temp_c: number;
  feelslike_c: number;
  is_day: 0 | 1;
  condition: { text: string; code: number };
  wind_kph: number;
  wind_dir: string;
  gust_kph: number;
  humidity: number;
  pressure_mb: number;
  vis_km: number;
  uv: number;
  cloud: number;
  dewpoint_c: number;
  precip_mm: number;
}

interface UpstreamCurrentResponse {
  location: UpstreamLocation;
  current: UpstreamCurrent;
}

interface UpstreamForecastDay {
  date: string;
  day: {
    mintemp_c: number;
    maxtemp_c: number;
    avgtemp_c: number;
    daily_chance_of_rain: number;
    condition: { text: string; code: number };
  };
  astro: {
    sunrise: string;
    sunset: string;
    moonrise: string;
    moonset: string;
    moon_phase: string;
    moon_illumination: number | string;
  };
}

interface UpstreamForecastResponse {
  location: UpstreamLocation;
  forecast: { forecastday: UpstreamForecastDay[] };
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

async function fetchUpstream<T>(url: URL, signal?: AbortSignal): Promise<T> {
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

  return body as T;
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

  const raw = await fetchUpstream<UpstreamCurrentResponse>(url, signal);
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
  url.searchParams.set("aqi", "no");
  url.searchParams.set("alerts", "no");

  const raw = await fetchUpstream<UpstreamForecastResponse>(url, signal);
  const today = raw.forecast.forecastday[0];
  if (!today) {
    throw new WeatherApiError("upstream", "Weather service returned an incomplete response.");
  }
  return {
    today: {
      minC: round1(today.day.mintemp_c),
      maxC: round1(today.day.maxtemp_c),
      chanceOfRain: today.day.daily_chance_of_rain,
    },
    forecast: raw.forecast.forecastday.map(shapeForecastDay),
    astro: shapeAstro(today.astro),
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
    const raw = await fetchUpstream<UpstreamForecastResponse>(url, signal);
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
