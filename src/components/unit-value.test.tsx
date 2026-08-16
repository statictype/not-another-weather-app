import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnitValue } from "@/components/unit-value";
import { __resetUnitSystemForTests, useUnitSystem } from "@/hooks/use-unit-system";

/** Renders whichever of the two readings the current system selects. */
function Reading({ metric, imperial }: { metric: string; imperial: string }) {
  const system = useUnitSystem();
  return <UnitValue text={system === "imperial" ? imperial : metric} />;
}

function stubReducedMotion(reduce: boolean): void {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

beforeEach(() => {
  __resetUnitSystemForTests("metric");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a unit change", () => {
  it("holds the old reading until this node's turn in the sweep", () => {
    stubReducedMotion(false);
    render(<Reading metric="12°" imperial="54°" />);

    act(() => __resetUnitSystemForTests("imperial"));

    expect(screen.getByText("12°")).toBeInTheDocument();
  });

  it("settles on the new reading", async () => {
    stubReducedMotion(false);
    render(<Reading metric="12°" imperial="54°" />);

    act(() => __resetUnitSystemForTests("imperial"));

    await waitFor(() => expect(screen.getByText("54°")).toBeInTheDocument());
  });

  it("swaps outright under prefers-reduced-motion", () => {
    stubReducedMotion(true);
    render(<Reading metric="12°" imperial="54°" />);

    act(() => __resetUnitSystemForTests("imperial"));

    expect(screen.getByText("54°")).toBeInTheDocument();
  });

  it("leaves a reading that is the same in both systems alone", () => {
    stubReducedMotion(false);
    render(<Reading metric="Gentle breeze" imperial="Gentle breeze" />);

    act(() => __resetUnitSystemForTests("imperial"));

    expect(screen.getByText("Gentle breeze")).toBeInTheDocument();
  });
});

describe("a text change with no unit change", () => {
  it("replaces the reading outright — a new city is not the same number restated", () => {
    stubReducedMotion(false);
    const { rerender } = render(<UnitValue text="12°" />);

    rerender(<UnitValue text="31°" />);

    expect(screen.getByText("31°")).toBeInTheDocument();
  });
});
