import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DayPrecip } from "@/api/types";
import { PrecipStrip } from "./precip-strip";

/** The strip sits under a day column: the rain line is unconditional, so a
 *  day's height does not depend on whether it snows. */

function precip(over: Partial<DayPrecip> = {}): DayPrecip {
  return {
    chanceOfRain: 20,
    willItRain: true,
    chanceOfSnow: 0,
    willItSnow: false,
    totalPrecipMm: 4,
    totalSnowCm: 0,
    ...over,
  };
}

const rain = () => screen.getByRole("img", { name: /chance of rain/i });
const snow = () => screen.queryByRole("img", { name: /chance of snow/i });

describe("PrecipStrip", () => {
  it("names each line in full, with the units spoken", () => {
    render(<PrecipStrip day={precip({ willItSnow: true, chanceOfSnow: 15, totalSnowCm: 2 })} />);

    expect(rain()).toHaveAccessibleName("Chance of rain, 20 percent, 4 millimetres");
    expect(snow()).toHaveAccessibleName("Chance of snow, 15 percent, 2 centimetres");
  });

  it("hides the icons from the accessible name", () => {
    const { container } = render(<PrecipStrip day={precip()} />);
    const icons = container.querySelectorAll("svg");

    expect(icons).toHaveLength(1);
    icons.forEach((icon) => expect(icon).toHaveAttribute("aria-hidden", "true"));
  });

  it("shows the rain line at 0% — 'no rain that day' is an answer", () => {
    render(<PrecipStrip day={precip({ chanceOfRain: 0, willItRain: false, totalPrecipMm: 0 })} />);

    expect(rain()).toHaveTextContent("0%");
    expect(rain()).toHaveAccessibleName("Chance of rain, 0 percent");
  });

  it("omits the snow line when nothing snows and nothing fell", () => {
    render(<PrecipStrip day={precip({ chanceOfSnow: 80, willItSnow: false, totalSnowCm: 0 })} />);

    expect(snow()).not.toBeInTheDocument();
  });

  it("shows the snow line for an amount upstream reports with willItSnow false", () => {
    render(<PrecipStrip day={precip({ chanceOfSnow: 80, willItSnow: false, totalSnowCm: 6 })} />);

    expect(snow()).toHaveTextContent("6cm");
  });

  it("prints the amount when the vendor disagrees with itself — the total is the reading", () => {
    render(<PrecipStrip day={precip({ chanceOfRain: 70, willItRain: false, totalPrecipMm: 9 })} />);

    expect(rain()).toHaveTextContent("70%");
    expect(rain()).toHaveTextContent("9mm");
  });

  it("never prints a zero amount — that is a second way of saying 0%", () => {
    render(<PrecipStrip day={precip({ willItRain: true, totalPrecipMm: 0 })} />);

    expect(rain()).toHaveTextContent("20%");
    expect(rain()).not.toHaveTextContent("mm");
  });

  it("keeps one decimal below 10 and drops it above", () => {
    const { rerender } = render(<PrecipStrip day={precip({ totalPrecipMm: 0.42 })} />);
    expect(rain()).toHaveTextContent("0.4mm");

    rerender(<PrecipStrip day={precip({ totalPrecipMm: 31.24 })} />);
    expect(rain()).toHaveTextContent("31mm");
  });

  it("holds a line of height before the forecast tier lands", () => {
    const { container } = render(<PrecipStrip day={undefined} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")?.className).toContain("h-5");
  });

  it("measures the same line with and without an amount", () => {
    const { rerender } = render(<PrecipStrip day={precip()} />);
    const withAmount = rain().className;

    rerender(<PrecipStrip day={precip({ totalPrecipMm: 0 })} />);

    expect(rain().className).toBe(withAmount);
  });
});
