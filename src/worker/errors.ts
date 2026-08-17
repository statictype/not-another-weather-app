import type { WeatherErrorKind } from "@/lib/errors";

export { statusForKind } from "@/lib/errors";

export class WeatherApiError extends Error {
  constructor(
    public readonly kind: WeatherErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "WeatherApiError";
  }
}
