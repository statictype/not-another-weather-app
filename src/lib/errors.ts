/**
 * Single source of truth for the proxy error taxonomy.
 *
 * Every error kind the Oasis proxy can return — along with its HTTP status
 * and its user-safe default message — lives in one table. The union type,
 * the kind→status mapping, and the status→kind inverse are all derived
 * from it, so adding a new kind is a one-row change and drift between the
 * worker and the frontend becomes a compile error.
 */

export const WEATHER_ERRORS = {
  invalid_query: { status: 400, message: "Invalid query." },
  not_found: { status: 404, message: "City not found." },
  quota_exceeded: { status: 429, message: "Weather service quota exceeded." },
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

/**
 * Reverse lookup used when an error response has no JSON body. Unknown
 * statuses fall back to "upstream" — the 5xx family is the sane default
 * for anything we don't explicitly recognize.
 */
export function kindForStatus(status: number): WeatherErrorKind {
  for (const [kind, def] of Object.entries(WEATHER_ERRORS) as Array<
    [WeatherErrorKind, (typeof WEATHER_ERRORS)[WeatherErrorKind]]
  >) {
    if (def.status === status) return kind;
  }
  return "upstream";
}
