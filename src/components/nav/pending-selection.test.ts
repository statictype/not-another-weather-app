import { describe, expect, it } from "vitest";
import { type PendingSelection, resolveHold, type SettleState } from "./pending-selection";

const settled: SettleState = {
  isFetching: false,
  isSuccess: true,
  isPlaceholderData: false,
  hasError: false,
};

const pending = (over: Partial<PendingSelection> = {}): PendingSelection => ({
  key: "suggestion:1",
  query: "Paris, FR",
  startQuery: "London",
  ...over,
});

describe("resolveHold", () => {
  it("is idle with nothing selected", () => {
    expect(resolveHold(null, "London", settled)).toBe("idle");
  });

  it("holds until the URL catches up with the selection", () => {
    expect(resolveHold(pending(), "London", settled)).toBe("holding");
    expect(resolveHold(pending(), "Paris, FR", settled)).toBe("settled");
  });

  it("matches the URL through the shared normalization", () => {
    expect(resolveHold(pending(), "  PARIS,   fr ", settled)).toBe("settled");
  });

  it("holds while the query is in flight", () => {
    expect(resolveHold(pending(), "Paris, FR", { ...settled, isFetching: true })).toBe("holding");
  });

  it("holds through the placeholder window, where data is still the last city", () => {
    expect(resolveHold(pending(), "Paris, FR", { ...settled, isPlaceholderData: true })).toBe(
      "holding",
    );
  });

  it("fails on any error, so the panel can render the message inline", () => {
    expect(resolveHold(pending(), "Paris, FR", { ...settled, hasError: true })).toBe("failed");
  });

  it("does not read an error that belongs to the previous city", () => {
    expect(resolveHold(pending(), "London", { ...settled, hasError: true })).toBe("holding");
  });

  it("settles at once when the selection is the city already in the URL", () => {
    expect(resolveHold(pending({ query: "London" }), "London", settled)).toBe("settled");
  });

  it("waits for any change when the row resolves its own city, as location does", () => {
    const p = pending({ query: null, startQuery: "London" });
    expect(resolveHold(p, "London", settled)).toBe("holding");
    expect(resolveHold(p, "51.523,-0.129", settled)).toBe("settled");
  });

  it("waits for the first city when there was none, as on a cold load", () => {
    const p = pending({ query: null, startQuery: null });
    expect(resolveHold(p, null, settled)).toBe("holding");
    expect(resolveHold(p, "51.523,-0.129", settled)).toBe("settled");
  });
});
