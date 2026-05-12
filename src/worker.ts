import { handleSearch } from "./worker/search-handler";
import { createTierHandler } from "./worker/tiers";
import type { Env } from "./worker/types";

/**
 * Oasis Worker entry.
 *
 * The weather pipeline is split into three independently-cacheable
 * endpoints so the hero can paint on `current` without waiting for
 * forecast or historical data. See `docs/rfcs/001-*.md`.
 *
 *  - `GET /api/weather`           → current conditions (fast, 10 min cache)
 *  - `GET /api/weather/forecast`  → today / 3-day forecast / astro (1 h)
 *  - `GET /api/weather/yesterday` → previous-day history (24 h)
 *  - `GET /api/search`            → autocomplete (no cache)
 *
 * Anything else is handed to the static-asset binding, which serves the
 * built SPA (with `not_found_handling: "single-page-application"`).
 */

const handleCurrent = createTierHandler("current");
const handleForecast = createTierHandler("forecast");
const handleYesterday = createTierHandler("yesterday");

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET") {
      switch (url.pathname) {
        case "/api/weather":
          return handleCurrent(request, env);
        case "/api/weather/forecast":
          return handleForecast(request, env);
        case "/api/weather/yesterday":
          return handleYesterday(request, env);
        case "/api/search":
          return handleSearch(request, env);
      }
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
