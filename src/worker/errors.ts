import type { WeatherErrorKind } from "./types";

/**
 * Internal error type thrown by the upstream client and caught by the
 * handler. Carries the typed `kind` so the handler can decide both the
 * HTTP status and the JSON body in one place.
 *
 * The `message` field is safe to surface to end users — it never contains
 * vendor details, API keys, or stack traces.
 */
export class WeatherApiError extends Error {
  constructor(
    public readonly kind: WeatherErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "WeatherApiError";
  }
}

/** Map an error kind to its HTTP status. */
export function statusForKind(kind: WeatherErrorKind): number {
  switch (kind) {
    case "not_found":
      return 404;
    case "invalid_query":
      return 400;
    case "quota_exceeded":
      return 429;
    case "upstream":
      return 502;
    case "network":
      return 504;
  }
}
