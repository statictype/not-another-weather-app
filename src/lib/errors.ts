/** The union and both mappings derive from this table; adding a kind is one row. */

export const WEATHER_ERRORS = {
  invalid_query: { status: 400, message: "Invalid query." },
  not_found: { status: 404, message: "No matching location found." },
  quota_exceeded: {
    status: 429,
    message: "Weather service quota exceeded. Please try again later.",
  },
  upstream: { status: 502, message: "Weather service is unavailable." },
  network: { status: 504, message: "Could not reach the weather service." },
} as const satisfies Record<string, { status: number; message: string }>;

export type WeatherErrorKind = keyof typeof WEATHER_ERRORS;

export function statusForKind(kind: WeatherErrorKind): number {
  return WEATHER_ERRORS[kind].status;
}

export function defaultMessage(kind: WeatherErrorKind): string {
  return WEATHER_ERRORS[kind].message;
}

export function kindForStatus(status: number): WeatherErrorKind {
  for (const [kind, def] of Object.entries(WEATHER_ERRORS) as Array<
    [WeatherErrorKind, (typeof WEATHER_ERRORS)[WeatherErrorKind]]
  >) {
    if (def.status === status) return kind;
  }
  return "upstream";
}
