import { WeatherApiError } from "./errors";
import type { WeatherResponse } from "./types";

/**
 * Upstream client for WeatherAPI.com.
 *
 * Single responsibility: take a normalized query, return a shaped DTO,
 * throw a typed `WeatherApiError` for anything that goes wrong. The
 * caller never sees the upstream's schema or HTTP status codes.
 */

const UPSTREAM_BASE = "https://api.weatherapi.com/v1/forecast.json";

/**
 * Subset of the WeatherAPI response we actually use. Anything not listed
 * here is intentionally dropped at the boundary.
 */
interface UpstreamForecast {
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
    lat: number;
    lon: number;
  };
  current: {
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
  };
  forecast: {
    forecastday: Array<{
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
    }>;
  };
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

export async function fetchForecast(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<WeatherResponse> {
  const url = new URL(UPSTREAM_BASE);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("days", "3");
  url.searchParams.set("aqi", "no");
  url.searchParams.set("alerts", "no");

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

  // Try to parse the body either way — both success and error responses
  // are JSON, and we need the body to determine the error kind.
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

  return shape(body as UpstreamForecast);
}

function shape(raw: UpstreamForecast): WeatherResponse {
  const today = raw.forecast.forecastday[0];
  if (!today) {
    // Defensive: WeatherAPI always returns at least one forecastday for /forecast.json,
    // but `noUncheckedIndexedAccess` makes us prove it.
    throw new WeatherApiError("upstream", "Weather service returned an incomplete response.");
  }

  return {
    location: {
      name: raw.location.name,
      region: raw.location.region,
      country: raw.location.country,
      localTime: raw.location.localtime,
      lat: raw.location.lat,
      lon: raw.location.lon,
    },
    current: {
      tempC: round1(raw.current.temp_c),
      feelsLikeC: round1(raw.current.feelslike_c),
      conditionText: raw.current.condition.text,
      conditionCode: raw.current.condition.code,
      timeOfDay: raw.current.is_day === 1 ? "day" : "night",
      windKph: round1(raw.current.wind_kph),
      windDir: raw.current.wind_dir,
      gustKph: round1(raw.current.gust_kph ?? 0),
      humidity: raw.current.humidity,
      pressureMb: round1(raw.current.pressure_mb ?? 0),
      visibilityKm: round1(raw.current.vis_km ?? 0),
      uv: raw.current.uv ?? 0,
      cloud: raw.current.cloud ?? 0,
      dewpointC: round1(raw.current.dewpoint_c ?? 0),
      precipMm: round1(raw.current.precip_mm ?? 0),
    },
    today: {
      minC: round1(today.day.mintemp_c),
      maxC: round1(today.day.maxtemp_c),
      chanceOfRain: today.day.daily_chance_of_rain,
    },
    forecast: raw.forecast.forecastday.map((d) => ({
      date: d.date,
      minC: round1(d.day.mintemp_c),
      maxC: round1(d.day.maxtemp_c),
      avgC: round1(d.day.avgtemp_c),
      chanceOfRain: d.day.daily_chance_of_rain,
      conditionText: d.day.condition.text,
      conditionCode: d.day.condition.code,
      isDay: true,
    })),
    astro: {
      sunrise: today.astro.sunrise,
      sunset: today.astro.sunset,
      moonrise: today.astro.moonrise,
      moonset: today.astro.moonset,
      moonPhase: today.astro.moon_phase,
      moonIllumination:
        typeof today.astro.moon_illumination === "string"
          ? Number.parseInt(today.astro.moon_illumination, 10) || 0
          : today.astro.moon_illumination,
    },
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
