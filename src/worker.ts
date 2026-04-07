/**
 * Oasis Worker entry.
 *
 * Responsibilities:
 *  - Serve `/api/*` routes from this handler.
 *  - Fall through to the static-asset binding for everything else,
 *    which serves the built SPA (with SPA-style `not_found_handling`).
 *
 * The shaped DTO, validation, caching, and upstream error mapping
 * land in Phase 3. This is the Phase 1 stub.
 */

interface Env {
  ASSETS: Fetcher;
  WEATHER_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function handleApi(request: Request, _env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/api/weather" && request.method === "GET") {
    return Response.json({
      stub: true,
      message: "Phase 1: handler wired. Real DTO arrives in Phase 3.",
      query: url.searchParams.get("q"),
    });
  }

  return Response.json(
    { error: { kind: "not_found", message: "Unknown API route" } },
    { status: 404 },
  );
}
