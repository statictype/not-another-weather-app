import { describe, expect, it } from "vitest";
import { WeatherClientError } from "@/api/weather";
import { searchErrorMessage } from "./search-error-model";

const err = (kind: ConstructorParameters<typeof WeatherClientError>[0]) =>
  new WeatherClientError(kind, "wire message");

describe("searchErrorMessage", () => {
  it("returns null when there is no error", () => {
    expect(searchErrorMessage(null, "London")).toBeNull();
  });

  it.each(["quota_exceeded", "upstream", "network"] as const)(
    "leaves %s to the result area",
    (kind) => {
      expect(searchErrorMessage(err(kind), "London")).toBeNull();
    },
  );

  it("echoes the failed query for not_found", () => {
    expect(searchErrorMessage(err("not_found"), "Londonn")).toBe(
      "No weather for “Londonn”. Try a different spelling.",
    );
  });

  it("truncates a long query so the row stays one line", () => {
    const message = searchErrorMessage(err("not_found"), "a".repeat(80));
    expect(message).toBe(`No weather for “${"a".repeat(32)}…”. Try a different spelling.`);
  });

  it("does not tell a geolocation user to check their spelling", () => {
    expect(searchErrorMessage(err("not_found"), "38.736,-9.142")).toBe(
      "No weather for those coordinates. Try searching by city name.",
    );
  });

  it("falls back when not_found arrives without a query", () => {
    expect(searchErrorMessage(err("not_found"), null)).toBe(
      "No matching location found. Try a different spelling.",
    );
  });

  it("does not leak the worker's developer-facing invalid_query text", () => {
    const message = searchErrorMessage(err("invalid_query"), "");
    expect(message).toBe("That didn't look like a place. Try a city name.");
    expect(message).not.toContain("wire message");
  });
});
