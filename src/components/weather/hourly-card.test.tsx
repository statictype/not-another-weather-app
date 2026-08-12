import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HourlyForecast } from "@/api/types";
import { HourlyCard } from "./hourly-card";

/**
 * The demo key will not produce a snowy hour on request, and the strip picks
 * its 24 columns against the wall clock, so both are pinned here: a frozen
 * system time and fixtures built off it.
 *
 * Frozen at 14:30 UTC, so the strip runs 3pm today through 2pm tomorrow and
 * the date rollover lands on column 9.
 */

const TZ = "UTC";
const NOW = "2026-08-12T14:30:00Z";
const ROLLOVER_INDEX = 9;

function hour(at: Date, over: Partial<HourlyForecast> = {}): HourlyForecast {
  const iso = at.toISOString();
  return {
    time: `${iso.slice(0, 10)} ${iso.slice(11, 13)}:00`,
    tempC: 18,
    feelsLikeC: 18,
    conditionText: "Partly cloudy",
    conditionCode: 1003,
    isDay: true,
    chanceOfRain: 0,
    chanceOfSnow: 0,
    willItRain: false,
    willItSnow: false,
    precipMm: 0,
    snowCm: 0,
    cloud: 25,
    ...over,
  };
}

/** The next 24 hours from the frozen clock, keyed by column index. */
function hourly(overrides: Record<number, Partial<HourlyForecast>> = {}): HourlyForecast[] {
  const base = new Date(NOW);
  base.setUTCMinutes(0, 0, 0);
  return Array.from({ length: 24 }, (_, i) =>
    hour(new Date(base.getTime() + (i + 1) * 3_600_000), overrides[i]),
  );
}

function columns(): HTMLElement[] {
  return screen.getAllByRole("img");
}

async function showPrecip() {
  await userEvent.click(screen.getByRole("button", { name: /hourly precipitation/i }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("HourlyCard — Temp mode", () => {
  it("prints both readings, including where they agree", () => {
    render(
      <HourlyCard
        hourly={hourly({
          0: { tempC: 18, feelsLikeC: 18.4 },
          1: { tempC: 18, feelsLikeC: 19 },
        })}
        tz={TZ}
      />,
    );

    // Two readings that round to the same number is a fact about the hour,
    // not a gap in the table.
    expect(columns()[0]).toHaveAccessibleName(
      "3 pm, Partly cloudy, 18 degrees, feels like 18 degrees",
    );
    expect(columns()[0]?.textContent).toBe("3pm18°18°");

    expect(columns()[1]).toHaveAccessibleName(
      "4 pm, Partly cloudy, 18 degrees, feels like 19 degrees",
    );
  });

  it("keeps a 1° gap, which the old 2° collapse swallowed", () => {
    render(<HourlyCard hourly={hourly({ 0: { tempC: 12, feelsLikeC: 11 } })} tz={TZ} />);

    expect(columns()[0]?.textContent).toBe("3pm12°11°");
  });

  it("leads with the temperature even when the feels-like is higher", () => {
    render(<HourlyCard hourly={hourly({ 0: { tempC: 26, feelsLikeC: 33 } })} tz={TZ} />);

    // The pair is a reading and its interpretation, not a high and a low: the
    // 33 must not take the headline off the 26.
    expect(columns()[0]).toHaveAccessibleName(
      "3 pm, Partly cloudy, 26 degrees, feels like 33 degrees",
    );
    expect(columns()[0]?.textContent).toMatch(/26°.*33°/s);
  });

  it("names the new day where the date rolls over", () => {
    render(<HourlyCard hourly={hourly()} tz={TZ} />);

    const expected = new Date("2026-08-13T12:00:00").toLocaleDateString(undefined, {
      weekday: "short",
    });
    expect(columns()[ROLLOVER_INDEX]).toHaveTextContent(expected);
    expect(columns()[ROLLOVER_INDEX]).toHaveAccessibleName(/^Thursday, 12 am,/);
    expect(columns()[ROLLOVER_INDEX - 1]).toHaveTextContent("11pm");
  });
});

describe("HourlyCard — Precip mode", () => {
  it("prints a dry hour as 0%, in the same place as every other chance", async () => {
    render(<HourlyCard hourly={hourly()} tz={TZ} />);
    await showPrecip();

    expect(columns()[0]).toHaveTextContent("0%");
    expect(columns()[0]).toHaveAccessibleName("3 pm, Partly cloudy, 0 percent chance of rain");
  });

  it("prints rain as a chance and an amount", async () => {
    render(
      <HourlyCard
        hourly={hourly({ 0: { chanceOfRain: 60, willItRain: true, precipMm: 2.4 } })}
        tz={TZ}
      />,
    );
    await showPrecip();

    expect(columns()[0]).toHaveTextContent("60%");
    expect(columns()[0]).toHaveTextContent("2.4mm");
    expect(columns()[0]).toHaveAccessibleName(
      "3 pm, Partly cloudy, 60 percent chance of rain, 2.4 millimetres",
    );
  });

  it("renders a snowy hour in cm, never mm", async () => {
    render(
      <HourlyCard
        hourly={hourly({
          0: {
            tempC: -4,
            conditionText: "Light snow",
            chanceOfRain: 10,
            chanceOfSnow: 80,
            willItRain: true,
            willItSnow: true,
            precipMm: 2,
            snowCm: 3,
          },
        })}
        tz={TZ}
      />,
    );
    await showPrecip();

    expect(columns()[0]).toHaveTextContent("3cm");
    expect(columns()[0]).not.toHaveTextContent("mm");
    expect(columns()[0]).toHaveAccessibleName(
      "3 pm, Light snow, 80 percent chance of snow, 3 centimetres",
    );
  });

  it("reads the snow chance when upstream reports no chance of rain", async () => {
    // The failure the card used to have: an hour below freezing with snow
    // falling reported `chanceOfRain: 0` and rendered as a struck-out droplet.
    render(
      <HourlyCard
        hourly={hourly({
          0: {
            tempC: -4,
            conditionText: "Light snow",
            chanceOfRain: 0,
            chanceOfSnow: 70,
            willItRain: false,
            willItSnow: false,
            snowCm: 3,
          },
        })}
        tz={TZ}
      />,
    );
    await showPrecip();

    expect(columns()[0]).toHaveTextContent("70%");
    expect(columns()[0]).toHaveAccessibleName(/70 percent chance of snow$/);
  });

  it("prints the chance alone when the flag says no precipitation lands", async () => {
    render(
      <HourlyCard
        hourly={hourly({ 0: { chanceOfRain: 70, willItRain: false, precipMm: 4 } })}
        tz={TZ}
      />,
    );
    await showPrecip();

    expect(columns()[0]).toHaveAccessibleName("3 pm, Partly cloudy, 70 percent chance of rain");
    expect(columns()[0]).not.toHaveTextContent("mm");
  });
});

describe("HourlyCard — the mode switch", () => {
  it("marks the active mode and defaults to Temp", async () => {
    render(<HourlyCard hourly={hourly()} tz={TZ} />);

    const temp = screen.getByRole("button", { name: /hourly temperature/i });
    const precip = screen.getByRole("button", { name: /hourly precipitation/i });

    expect(temp).toHaveAttribute("aria-pressed", "true");
    expect(precip).toHaveAttribute("aria-pressed", "false");

    await showPrecip();

    expect(temp).toHaveAttribute("aria-pressed", "false");
    expect(precip).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the same 24 columns across a switch", async () => {
    render(<HourlyCard hourly={hourly()} tz={TZ} />);
    expect(columns()).toHaveLength(24);

    await showPrecip();
    expect(columns()).toHaveLength(24);
  });

  it("hides every icon from the accessible names", async () => {
    const { container } = render(
      <HourlyCard
        hourly={hourly({ 0: { chanceOfRain: 60, willItRain: true, precipMm: 2.4 } })}
        tz={TZ}
      />,
    );
    await showPrecip();

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(24);
    icons.forEach((icon) => expect(icon).toHaveAttribute("aria-hidden", "true"));
  });
});

describe("HourlyCard — before the forecast tier lands", () => {
  it("shimmers instead of rendering columns", () => {
    render(<HourlyCard hourly={undefined} tz={TZ} />);

    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByText("Hourly")).toBeInTheDocument();
  });
});
