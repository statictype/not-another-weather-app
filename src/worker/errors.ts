import type { WeatherErrorKind } from "@/lib/errors";

export { statusForKind } from "@/lib/errors";

/** `message` is safe to surface: never vendor details, API keys, or stack traces. */
export class WeatherApiError extends Error {
  constructor(
    public readonly kind: WeatherErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "WeatherApiError";
  }
}
