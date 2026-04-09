import type { WeatherErrorKind } from "@/lib/errors";

export { statusForKind } from "@/lib/errors";

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
