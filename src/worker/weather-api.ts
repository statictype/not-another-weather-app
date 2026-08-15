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
import { normalizeSeverity, sortAndCapAlerts } from "./alerts";
import { WeatherApiError } from "./errors";

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
  feelslike_c: z.number(),
  heatindex_c: z.number().nullish(),
  windchill_c: z.number().nullish(),
  is_day: z.union([z.literal(0), z.literal(1)]),
  condition: z.object({ text: z.string(), code: z.number() }),
  wind_kph: z.number(),
  wind_dir: z.string(),
  wind_degree: z.number(),
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
  chance_of_snow: z.number().nullish(),
  will_it_rain: z.number().nullish(),
  will_it_snow: z.number().nullish(),
  precip_mm: z.number().nullish(),
  snow_cm: z.number().nullish(),
  cloud: z.number(),
});

const UpstreamForecastDaySchema = z.object({
  date: z.string(),
  day: z.object({
    mintemp_c: z.number(),
    maxtemp_c: z.number(),
    avgtemp_c: z.number(),
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
    today: {
      minC: round1(today.day.mintemp_c),
      maxC: round1(today.day.maxtemp_c),
      ...shapeDayPrecip(today.day),
    },
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
  return {
    tempC: round1(raw.temp_c),
    feelsLikeC: round1(raw.feelslike_c),
    // Upstream omits heat index in cold air; fall back so the field is always a number.
    heatIndexC: round1(raw.heatindex_c ?? raw.temp_c),
    // Same for wind chill in warm air.
    windchillC: round1(raw.windchill_c ?? raw.temp_c),
    conditionText: raw.condition.text,
    conditionCode: raw.condition.code,
    timeOfDay: raw.is_day === 1 ? "day" : "night",
    windKph: round1(raw.wind_kph),
    windDir: raw.wind_dir,
    windDegree: Math.round(raw.wind_degree),
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
    totalPrecipMm: round1(day.totalprecip_mm ?? 0),
    totalSnowCm: round1(day.totalsnow_cm ?? 0),
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
    chanceOfSnow: h.chance_of_snow ?? 0,
    willItRain: isTrue(h.will_it_rain),
    willItSnow: isTrue(h.will_it_snow),
    precipMm: round1(h.precip_mm ?? 0),
    snowCm: round1(h.snow_cm ?? 0),
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
