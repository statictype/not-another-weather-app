import { HttpResponse, http } from "msw";

/**
 * Default MSW handlers for the frontend test suite.
 *
 * These intercept calls to the local proxy (`/api/weather`) — i.e. the
 * Worker boundary. Tests exercise the real API client end-to-end against
 * these mocks, so error mapping and DTO parsing are covered for free.
 *
 * Phase 3 will replace this stub with realistic fixtures shaped like the
 * proxy DTO. For Phase 2 we just need *something* to assert against.
 */
export const handlers = [
  http.get("/api/weather", () => {
    return HttpResponse.json({
      stub: true,
      message: "msw default handler",
    });
  }),
];
