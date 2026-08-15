import { z, ZodError } from "zod";
import type {
  Astro,
  CurrentConditions,
  DayPrecip,
  ForecastDay,
  HourlyForecast,
  WeatherAlert,
  WeatherCurrent,
  WeatherForecast,
  WeatherLocation,
} from "./types";
import { defaultMessage, type WeatherErrorKind } from "@/lib/errors";
import { airComfort, beaufort } from "./air-comfort";
import { normalizeSeverity, sortAndCapAlerts } from "./alerts";
import { WeatherApiError } from "./errors";
import { distance, pressure, speed, temperature } from "./format";
import { precipAmountPair, precipPair } from "./precip";

/* Upstream (WeatherAPI.com) shapes, private to this file. */

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
  temp_f: z.number(),
  feelslike_c: z.number(),
  feelslike_f: z.number(),
  heatindex_c: z.number().nullish(),
  heatindex_f: z.number().nullish(),
  windchill_c: z.number().nullish(),
  windchill_f: z.number().nullish(),
  is_day: z.union([z.literal(0), z.literal(1)]),
  condition: z.object({ text: z.string(), code: z.number() }),
  wind_kph: z.number(),
  wind_mph: z.number(),
  wind_dir: z.string(),
  wind_degree: z.number(),
  gust_kph: z.number().nullish(),
  gust_mph: z.number().nullish(),
  humidity: z.number(),
  pressure_mb: z.number().nullish(),
  pressure_in: z.number().nullish(),
  vis_km: z.number().nullish(),
  vis_miles: z.number().nullish(),
  uv: z.number().nullish(),
  cloud: z.number().nullish(),
  dewpoint_c: z.number().nullish(),
  dewpoint_f: z.number().nullish(),
  precip_mm: z.number().nullish(),
  precip_in: z.number().nullish(),
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
  temp_f: z.number(),
  feelslike_c: z.number(),
  feelslike_f: z.number(),
  is_day: z.union([z.literal(0), z.literal(1)]),
  condition: z.object({ text: z.string(), code: z.number() }),
  chance_of_rain: z.number(),
  chance_of_snow: z.number().nullish(),
  will_it_rain: z.number().nullish(),
  will_it_snow: z.number().nullish(),
  cloud: z.number(),
});

const UpstreamForecastDaySchema = z.object({
  date: z.string(),
  day: z.object({
    mintemp_c: z.number(),
    mintemp_f: z.number(),
    maxtemp_c: z.number(),
    maxtemp_f: z.number(),
    daily_chance_of_rain: z.number(),
    daily_will_it_rain: z.number().nullish(),
    daily_chance_of_snow: z.number().nullish(),
    daily_will_it_snow: z.number().nullish(),
    totalprecip_mm: z.number().nullish(),
    totalsnow_cm: z.number().nullish(),
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

const UpstreamAlertSchema = z.object({
  event: z.string().nullish(),
  headline: z.string().nullish(),
  severity: z.string().nullish(),
  areas: z.string().nullish(),
  effective: z.string().nullish(),
  expires: z.string().nullish(),
  desc: z.string().nullish(),
  instruction: z.string().nullish(),
});

const UpstreamForecastResponseSchema = z.object({
  location: UpstreamLocationSchema,
  current: UpstreamCurrentBlockSchema.optional(),
  forecast: z.object({
    forecastday: z.array(UpstreamForecastDaySchema),
  }),
  alerts: z
    .object({
      alert: z.array(UpstreamAlertSchema).nullish(),
    })
    .nullish(),
});

type UpstreamLocation = z.infer<typeof UpstreamLocationSchema>;
type UpstreamCurrent = z.infer<typeof UpstreamCurrentBlockSchema>;
type UpstreamForecastDay = z.infer<typeof UpstreamForecastDaySchema>;

const UPSTREAM_CURRENT = "https://api.weatherapi.com/v1/current.json";
const UPSTREAM_FORECAST = "https://api.weatherapi.com/v1/forecast.json";
const UPSTREAM_SEARCH = "https://api.weatherapi.com/v1/search.json";

/** Asks for today + 3. Free keys silently cap the response at 3 days total, so
 *  `forecast` carries 2 or 3 future days depending on the plan; the card renders
 *  whatever arrives. */
const FORECAST_DAYS = "4";

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

/** Unlisted codes collapse to `upstream`, so API-key errors never reach the client. */
const UPSTREAM_CODE_TO_KIND: Record<number, WeatherErrorKind> = {
  1006: "not_found",
  2007: "quota_exceeded",
};

function mapUpstreamErrorCode(code: number): WeatherApiError {
  const kind = UPSTREAM_CODE_TO_KIND[code] ?? "upstream";
  return new WeatherApiError(kind, defaultMessage(kind));
}

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

export async function fetchForecast(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<WeatherForecast> {
  const url = new URL(UPSTREAM_FORECAST);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("days", FORECAST_DAYS);
  url.searchParams.set("aqi", "yes");
  url.searchParams.set("alerts", "yes");

  const raw = await fetchUpstream(url, UpstreamForecastResponseSchema, signal);
  const today = raw.forecast.forecastday[0];
  if (!today) {
    throw new WeatherApiError("upstream", "Weather service returned an incomplete response.");
  }
  const hourly: HourlyForecast[] = raw.forecast.forecastday.flatMap((d) =>
    (d.hour ?? []).map(shapeHourly),
  );
  const epa = raw.current?.air_quality?.["us-epa-index"];
  return {
    airQualityIndex: typeof epa === "number" ? epa : null,
    forecast: raw.forecast.forecastday.map(shapeForecastDay),
    astro: shapeAstro(today.astro),
    hourly,
    alerts: sortAndCapAlerts((raw.alerts?.alert ?? []).map(shapeAlert)),
  };
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
  const tempC = raw.temp_c;
  const feelsLikeC = raw.feelslike_c;
  const dewpointC = raw.dewpoint_c ?? 0;
  const windKph = raw.wind_kph;
  const precipMm = raw.precip_mm ?? 0;

  return {
    temp: temperature(tempC, raw.temp_f),
    feelsLike: temperature(feelsLikeC, raw.feelslike_f),
    // Upstream omits heat index in cold air, and wind chill in warm air.
    heatIndex: temperature(raw.heatindex_c ?? tempC, raw.heatindex_f ?? raw.temp_f),
    windchill: temperature(raw.windchill_c ?? tempC, raw.windchill_f ?? raw.temp_f),
    dewpoint: temperature(dewpointC, raw.dewpoint_f ?? 0),
    conditionText: raw.condition.text,
    conditionCode: raw.condition.code,
    timeOfDay: raw.is_day === 1 ? "day" : "night",
    wind: speed(windKph, raw.wind_mph),
    gust: speed(raw.gust_kph ?? 0, raw.gust_mph ?? 0),
    windDir: raw.wind_dir,
    windDegree: Math.round(raw.wind_degree),
    humidity: raw.humidity,
    pressureMb: round1(raw.pressure_mb ?? 0),
    pressure: pressure(raw.pressure_mb ?? 0, raw.pressure_in ?? 0),
    visibility: distance(raw.vis_km ?? 0, raw.vis_miles ?? 0),
    uv: raw.uv ?? 0,
    cloud: raw.cloud ?? 0,
    precip: precipAmountPair(precipMm, "mm"),
    comfort: airComfort({ tempC, feelsLikeC, dewpointC, humidity: raw.humidity }),
    beaufort: beaufort(windKph),
  };
}

function shapeForecastDay(d: UpstreamForecastDay): ForecastDay {
  return {
    date: d.date,
    min: temperature(d.day.mintemp_c, d.day.mintemp_f),
    max: temperature(d.day.maxtemp_c, d.day.maxtemp_f),
    ...shapeDayPrecip(d.day),
    conditionText: d.day.condition.text,
    conditionCode: d.day.condition.code,
    isDay: true,
  };
}

function shapeDayPrecip(day: UpstreamForecastDay["day"]): DayPrecip {
  return {
    chanceOfRain: day.daily_chance_of_rain,
    willItRain: isTrue(day.daily_will_it_rain),
    chanceOfSnow: day.daily_chance_of_snow ?? 0,
    willItSnow: isTrue(day.daily_will_it_snow),
    totalPrecip: precipPair(day.totalprecip_mm ?? 0, "mm"),
    totalSnow: precipPair(day.totalsnow_cm ?? 0, "cm"),
  };
}

function shapeHourly(h: z.infer<typeof UpstreamHourSchema>): HourlyForecast {
  return {
    time: h.time,
    temp: temperature(h.temp_c, h.temp_f),
    feelsLike: temperature(h.feelslike_c, h.feelslike_f),
    conditionText: h.condition.text,
    conditionCode: h.condition.code,
    isDay: h.is_day === 1,
    chanceOfRain: h.chance_of_rain,
    chanceOfSnow: h.chance_of_snow ?? 0,
    willItRain: isTrue(h.will_it_rain),
    willItSnow: isTrue(h.will_it_snow),
    cloud: h.cloud,
  };
}

function shapeAlert(a: z.infer<typeof UpstreamAlertSchema>): WeatherAlert {
  return {
    event: a.event ?? "",
    headline: a.headline ?? "",
    severity: normalizeSeverity(a.severity ?? ""),
    areas: a.areas ?? "",
    effective: a.effective ?? "",
    expires: a.expires ?? "",
    desc: a.desc ?? "",
    instruction: a.instruction ?? "",
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

function isTrue(flag: number | null | undefined): boolean {
  return flag === 1;
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
