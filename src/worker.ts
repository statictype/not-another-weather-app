import { handleSearch } from "./worker/search-handler";
import { handleWeather } from "./worker/handler";
import type { Env } from "./worker/types";

/**
 * Oasis Worker entry.
 *
 *  - `/api/weather` → proxied through to WeatherAPI.com with edge caching
 *    and a shaped DTO. The upstream key never reaches the browser.
 *  - Anything else → handed to the static-asset binding, which serves the
 *    built SPA (with `not_found_handling: "single-page-application"`).
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/weather" && request.method === "GET") {
      return handleWeather(request, env);
    }

    if (url.pathname === "/api/search" && request.method === "GET") {
      return handleSearch(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { error: { kind: "not_found", message: "Unknown API route" } },
        { status: 404 },
      );
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
