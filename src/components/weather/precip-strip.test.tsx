import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WeatherForecast } from "@/api/types";
import { PrecipStrip } from "./precip-strip";

/**
 * August in the demo key's cities does not produce snow on request, and the
 * shimmer state lasts about as long as one fetch, so both are proved from
 * fixtures. The height assertions are the load-bearing ones: the strip sits
 * inside the LCP element, so it must measure the same before the forecast tier
 * lands, with one chip, and with two.
 */

type Today = WeatherForecast["today"];

function today(over: Partial<Today> = {}): Today {
  return {
    minC: 8,
    maxC: 15.5,
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
  it("names each chip in full, with the units spoken", () => {
    render(<PrecipStrip today={today({ willItSnow: true, chanceOfSnow: 15, totalSnowCm: 2 })} />);

    expect(rain()).toHaveAccessibleName("Chance of rain, 20 percent, 4 millimetres");
    expect(snow()).toHaveAccessibleName("Chance of snow, 15 percent, 2 centimetres");
  });

  it("hides the icons from the accessible name", () => {
    const { container } = render(<PrecipStrip today={today()} />);
    const icons = container.querySelectorAll("svg");

    expect(icons).toHaveLength(1);
    icons.forEach((icon) => expect(icon).toHaveAttribute("aria-hidden", "true"));
  });

  it("shows the rain chip at 0% — 'no rain today' is an answer", () => {
    render(<PrecipStrip today={today({ chanceOfRain: 0, willItRain: false, totalPrecipMm: 0 })} />);

    expect(rain()).toHaveTextContent("0%");
    expect(rain()).toHaveAccessibleName("Chance of rain, 0 percent");
  });

  it("omits the snow chip whatever the snow chance, when willItSnow is false", () => {
    render(<PrecipStrip today={today({ chanceOfSnow: 80, willItSnow: false, totalSnowCm: 6 })} />);

    expect(snow()).not.toBeInTheDocument();
  });

  it("prints the chance without an amount when the vendor disagrees with itself", () => {
    render(
      <PrecipStrip today={today({ chanceOfRain: 70, willItRain: false, totalPrecipMm: 9 })} />,
    );

    expect(rain()).toHaveTextContent("70%");
    expect(rain()).not.toHaveTextContent("9mm");
  });

  it("never prints a zero amount — that is a second way of saying 0%", () => {
    render(<PrecipStrip today={today({ willItRain: true, totalPrecipMm: 0 })} />);

    expect(rain()).toHaveTextContent("20%");
    expect(rain()).not.toHaveTextContent("mm");
  });

  it("keeps one decimal below 10 and drops it above", () => {
    const { rerender } = render(<PrecipStrip today={today({ totalPrecipMm: 0.42 })} />);
    expect(rain()).toHaveTextContent("0.4mm");

    rerender(<PrecipStrip today={today({ totalPrecipMm: 31.24 })} />);
    expect(rain()).toHaveTextContent("31mm");
  });

  it("holds its height before the forecast tier lands", () => {
    const { container, rerender } = render(<PrecipStrip today={undefined} />);
    const strip = container.firstElementChild;
    const shimmering = strip?.className;

    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    rerender(<PrecipStrip today={today()} />);

    // Same element, same classes — the strip is never conditionally mounted,
    // so there is nothing for the browser to reflow inside the LCP element.
    expect(container.firstElementChild).toBe(strip);
    expect(strip?.className).toBe(shimmering);
    expect(strip?.className).toContain("h-8");
  });

  it("measures the same with one chip and with two", () => {
    const { container, rerender } = render(<PrecipStrip today={today()} />);
    const one = container.firstElementChild?.className;
    const oneChip = rain().className;

    rerender(<PrecipStrip today={today({ willItSnow: true, chanceOfSnow: 15, totalSnowCm: 2 })} />);

    // Both chips are `h-8` on a single `h-8` row, so the second one costs
    // width and nothing else.
    expect(container.firstElementChild?.className).toBe(one);
    expect(rain().className).toBe(oneChip);
    expect(snow()?.className).toBe(oneChip);
  });
});
