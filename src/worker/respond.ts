import { statusForKind, type WeatherErrorKind } from "@/lib/errors";
import type { ErrorResponse } from "./types";

export function errorResponse(kind: WeatherErrorKind, message: string): Response {
  const body: ErrorResponse = { error: { kind, message } };
  return Response.json(body, { status: statusForKind(kind) });
}
