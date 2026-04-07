import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

/**
 * Phase 2 smoke test for the Worker pool.
 *
 * `SELF.fetch` runs the request through the real Worker runtime — the
 * same code path as a deployed edge request. We'll lean on it heavily
 * in Phase 3 once the proxy has real branches.
 */
describe("Worker (smoke)", () => {
  it("handles GET /api/weather", async () => {
    const res = await SELF.fetch("https://example.com/api/weather?q=London");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stub: boolean; query: string };
    expect(body.stub).toBe(true);
    expect(body.query).toBe("London");
  });

  it("returns 404 for unknown API routes", async () => {
    const res = await SELF.fetch("https://example.com/api/nope");
    expect(res.status).toBe(404);
  });
});
