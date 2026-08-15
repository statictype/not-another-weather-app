import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { DayPrecip } from "@/api/types";
import { __resetUnitSystemForTests } from "@/hooks/use-unit-system";
import { precipPair } from "@/worker/precip";
import { PrecipStrip } from "./precip-strip";

/** The strip sits under a day column: the rain line is unconditional, so a
 *  day's height does not depend on whether it snows. */

function precip(over: Partial<DayPrecip> = {}): DayPrecip {
  return {
    chanceOfRain: 20,
    willItRain: true,
    chanceOfSnow: 0,
    willItSnow: false,
    totalPrecip: precipPair(4, "mm"),
    totalSnow: null,
    ...over,
  };
}

const rain = () => screen.getByRole("img", { name: /chance of rain/i });
const snow = () => screen.queryByRole("img", { name: /chance of snow/i });

beforeEach(() => {
  __resetUnitSystemForTests("metric");
});

describe("PrecipStrip", () => {
  it("names each line in full, with the units spoken", () => {
    render(
      <PrecipStrip
        day={precip({ willItSnow: true, chanceOfSnow: 15, totalSnow: precipPair(2, "cm") })}
      />,
    );

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
    render(<PrecipStrip day={precip({ chanceOfRain: 0, willItRain: false, totalPrecip: null })} />);

    expect(rain()).toHaveTextContent("0%");
    expect(rain()).toHaveAccessibleName("Chance of rain, 0 percent");
  });

  it("omits the snow line when nothing snows and nothing fell", () => {
    render(<PrecipStrip day={precip({ chanceOfSnow: 80, willItSnow: false, totalSnow: null })} />);

    expect(snow()).not.toBeInTheDocument();
  });

  it("shows the snow line for an amount the worker sends with willItSnow false", () => {
    render(
      <PrecipStrip
        day={precip({ chanceOfSnow: 80, willItSnow: false, totalSnow: precipPair(6, "cm") })}
      />,
    );

    expect(snow()).toHaveTextContent("6 cm");
  });

  it("prints the amount when the vendor disagrees with itself — the total is the reading", () => {
    render(
      <PrecipStrip
        day={precip({ chanceOfRain: 70, willItRain: false, totalPrecip: precipPair(9, "mm") })}
      />,
    );

    expect(rain()).toHaveTextContent("70%");
    expect(rain()).toHaveTextContent("9 mm");
  });

  it("never prints a zero amount — that is a second way of saying 0%", () => {
    render(<PrecipStrip day={precip({ willItRain: true, totalPrecip: precipPair(0, "mm") })} />);

    expect(rain()).toHaveTextContent("20%");
    expect(rain()).not.toHaveTextContent("mm");
  });

  it("renders whatever precision the worker settled on", () => {
    const { rerender } = render(
      <PrecipStrip day={precip({ totalPrecip: precipPair(0.42, "mm") })} />,
    );
    expect(rain()).toHaveTextContent("0.42 mm");

    rerender(<PrecipStrip day={precip({ totalPrecip: precipPair(31.24, "mm") })} />);
    expect(rain()).toHaveTextContent("31 mm");
  });

  it("holds a line of height before the forecast tier lands", () => {
    const { container } = render(<PrecipStrip day={undefined} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")?.className).toContain("h-5");
  });

  it("measures the same line with and without an amount", () => {
    const { rerender } = render(<PrecipStrip day={precip()} />);
    const withAmount = rain().className;

    rerender(<PrecipStrip day={precip({ totalPrecip: null })} />);

    expect(rain().className).toBe(withAmount);
  });
});
