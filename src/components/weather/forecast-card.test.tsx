import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ForecastDay } from "@/api/types";
import { ForecastCard } from "./forecast-card";

/** Index 0 of the payload is today, which the hero owns. The card must drop it
 *  and render whatever future days follow — 2 on a free key, 3 on a paid one. */

function day(date: string, over: Partial<ForecastDay> = {}): ForecastDay {
  return {
    date,
    minC: 8,
    maxC: 15.5,
    avgC: 11.7,
    chanceOfRain: 20,
    conditionText: "Partly cloudy",
    conditionCode: 1003,
    isDay: true,
    ...over,
  };
}

/** Mondays, so the weekday labels below are stable regardless of the run date. */
const TODAY = "2026-04-06";
const DAYS = ["2026-04-07", "2026-04-08", "2026-04-09"];

function labels(): string[] {
  return screen
    .queryAllByText(/^(tomorrow|mon|tue|wed|thu|fri|sat|sun)$/i)
    .map((el) => el.textContent!);
}

describe("ForecastCard", () => {
  it("drops today and renders the 2 future days a free key returns", () => {
    render(<ForecastCard forecast={[day(TODAY), day(DAYS[0]!), day(DAYS[1]!)]} />);

    expect(labels()).toEqual(["Tomorrow", "Wed"]);
    expect(screen.queryByText(/^today$/i)).not.toBeInTheDocument();
  });

  it("renders the third day when the payload carries one", () => {
    render(<ForecastCard forecast={[day(TODAY), day(DAYS[0]!), day(DAYS[1]!), day(DAYS[2]!)]} />);

    expect(labels()).toEqual(["Tomorrow", "Wed", "Thu"]);
  });

  it("caps at 3 future days even if upstream sends more", () => {
    const extra = ["2026-04-10", "2026-04-11"].map((d) => day(d));
    render(
      <ForecastCard
        forecast={[day(TODAY), day(DAYS[0]!), day(DAYS[1]!), day(DAYS[2]!), ...extra]}
      />,
    );

    expect(labels()).toHaveLength(3);
  });

  it("shows skeletons while the forecast tier is in flight", () => {
    const { container } = render(<ForecastCard forecast={undefined} />);

    expect(labels()).toHaveLength(0);
    // Each placeholder row is one aria-hidden wrapper of pulsing bars.
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(2);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("sets the column count from the day count, so 3 days do not overflow 2 columns", () => {
    const { container, rerender } = render(
      <ForecastCard forecast={[day(TODAY), day(DAYS[0]!), day(DAYS[1]!)]} />,
    );
    const grid = () => container.querySelector(".grid")!;

    expect(grid().className).toContain("sm:grid-cols-2");

    rerender(<ForecastCard forecast={[day(TODAY), day(DAYS[0]!), day(DAYS[1]!), day(DAYS[2]!)]} />);
    expect(grid().className).toContain("sm:grid-cols-3");
  });
});
