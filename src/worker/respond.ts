import { statusForKind, type WeatherErrorKind } from "@/lib/errors";
import type { ErrorResponse } from "./types";

/**
 * Build the uniform JSON error shape every handler returns.
 *
 * Pulled out of the handlers so all three weather endpoints render
 * errors identically without each copying the same 4 lines.
 */
export function errorResponse(kind: WeatherErrorKind, message: string): Response {
  const body: ErrorResponse = { error: { kind, message } };
  return Response.json(body, { status: statusForKind(kind) });
}
