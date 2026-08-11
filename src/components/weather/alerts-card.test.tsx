import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AlertSeverity, WeatherAlert } from "@/api/types";
import { AlertsCard } from "./alerts-card";

/**
 * The demo key will not produce a severe-weather alert on demand, so the
 * rendered result is proved from fixtures instead. These cover the shapes
 * providers actually send: one alert, several of mixed severity, empty
 * `instruction` / `areas`, and a multi-paragraph `desc`.
 */

const TZ = "Europe/London";

function alert(over: Partial<WeatherAlert> = {}): WeatherAlert {
  return {
    event: "Wind Warning",
    headline: "Wind Warning issued for Greater London",
    severity: "severe",
    areas: "Greater London",
    effective: "2026-08-11T06:00:00+01:00",
    expires: "2026-08-11T21:00:00+01:00",
    desc: "Gusts of 60 to 70 mph are expected across exposed coasts.",
    instruction: "Secure loose objects and avoid coastal paths.",
    ...over,
  };
}

const mixed: WeatherAlert[] = [
  alert({ event: "Flood Warning", severity: "extreme" }),
  alert({ event: "Thunderstorm Watch", severity: "moderate" }),
  alert({ event: "Coastal Hazard Statement", severity: "unknown" }),
];

function renderCard(alerts: WeatherAlert[] | undefined, isNight = false) {
  return render(<AlertsCard alerts={alerts} tz={TZ} isNight={isNight} />);
}

/** The plate's "Until …" line drops the date when the end falls on today in
 *  the city's zone, so today has to be fixed for those assertions. */
function nowIs(iso: string) {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse(iso));
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function openModal(alerts: WeatherAlert[]) {
  const user = userEvent.setup();
  renderCard(alerts);
  await user.click(screen.getByRole("button"));
  return { user, dialog: await screen.findByRole("dialog") };
}

describe("AlertsCard", () => {
  it("renders nothing for an empty array", () => {
    const { container } = renderCard([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing before the forecast tier lands", () => {
    const { container } = renderCard(undefined);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the worst alert and no suffix when there is one", () => {
    renderCard([alert({ event: "Wind Warning" })]);
    const row = screen.getByRole("button");
    expect(row).toHaveTextContent("Wind Warning");
    expect(row).not.toHaveTextContent("+");
  });

  it("shows one row with a +N count, never a row per alert", () => {
    renderCard(mixed);
    const rows = screen.getAllByRole("button");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Flood Warning");
    expect(rows[0]).toHaveTextContent("+2");
    expect(rows[0]).not.toHaveTextContent("Thunderstorm Watch");
  });

  it("keeps one row at the worker's cap of five", () => {
    renderCard([...mixed, alert({ event: "A" }), alert({ event: "B" })]);
    const row = screen.getByRole("button");
    expect(row).toHaveTextContent("+4");
  });

  it("says when the worst alert ends, in the location's time", () => {
    nowIs("2026-08-11T10:00:00+01:00");
    renderCard([alert({ expires: "2026-08-11T21:00:00+01:00" })]);
    expect(screen.getByText("Until 9:00 pm")).toBeInTheDocument();
  });

  it("carries the date when the end is not today in the city", () => {
    nowIs("2026-08-11T10:00:00+01:00");
    renderCard([alert({ expires: "2026-08-12T05:00:00+01:00" })]);
    expect(screen.getByText("Until Wed, Aug 12, 5:00 am")).toBeInTheDocument();
  });

  it("omits the end line when the provider sent no expiry", () => {
    renderCard([alert({ expires: "" })]);
    expect(screen.queryByText(/^Until/)).not.toBeInTheDocument();
  });

  it("names the severity and the count for screen readers, not colour alone", () => {
    renderCard(mixed);
    expect(screen.getByRole("button")).toHaveAccessibleName(
      /Flood Warning.*Extreme severity\. 3 active alerts\. Show details\./s,
    );
  });

  it("omits the severity word when the provider did not send one", () => {
    renderCard([alert({ severity: "unknown" })]);
    expect(screen.getByRole("button")).toHaveAccessibleName(/1 active alert\. Show details\./);
    expect(screen.getByRole("button")).not.toHaveAccessibleName(/severity/);
  });

  it.each(["extreme", "severe", "moderate", "minor", "unknown"] as AlertSeverity[])(
    "renders the %s severity without throwing",
    (severity) => {
      renderCard([alert({ severity })]);
      expect(screen.getByRole("button")).toBeInTheDocument();
    },
  );

  it("renders non-Latin event text unchanged — upstream does not translate alerts", () => {
    renderCard([alert({ event: "暴雨", severity: "moderate" }), alert({ event: "大风" })]);
    expect(screen.getByText("暴雨")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveTextContent("+1");
  });
});

describe("AlertsCard modal", () => {
  it("lists every alert, worst first as the worker sorted them", async () => {
    const { dialog } = await openModal(mixed);
    const headings = within(dialog)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual(["Flood Warning", "Thunderstorm Watch", "Coastal Hazard Statement"]);
  });

  it("prints the severity as a chip beside the title", async () => {
    const { dialog } = await openModal([alert({ severity: "extreme" })]);
    expect(within(dialog).getByText("Extreme")).toBeInTheDocument();
  });

  it("omits the chip for an unknown severity rather than inventing a word", async () => {
    const { dialog } = await openModal([alert({ severity: "unknown" })]);
    expect(within(dialog).queryByText(/unknown/i)).not.toBeInTheDocument();
  });

  it("formats the window in the location's timezone, not the viewer's", async () => {
    // 06:00+01:00 is 05:00 UTC; in Anchorage that is the previous evening, so
    // a viewer-timezone bug changes both the date and the hour.
    const { dialog } = await openModal([
      alert({ effective: "2026-08-11T06:00:00+01:00", expires: "2026-08-11T21:00:00+01:00" }),
    ]);
    expect(within(dialog).getByText(/Tue, Aug 11, 6:00 am – 9:00 pm/)).toBeInTheDocument();
  });

  it("repeats the date on the far end when the window crosses midnight", async () => {
    const { dialog } = await openModal([
      alert({ effective: "2026-08-11T22:00:00+01:00", expires: "2026-08-12T05:00:00+01:00" }),
    ]);
    expect(
      within(dialog).getByText(/Tue, Aug 11, 10:00 pm – Wed, Aug 12, 5:00 am/),
    ).toBeInTheDocument();
  });

  it("omits the window entirely when neither bound parses", async () => {
    const { dialog } = await openModal([alert({ effective: "", expires: "" })]);
    expect(within(dialog).queryByText(/–/)).not.toBeInTheDocument();
  });

  it("omits empty areas and instruction rather than rendering blank rows", async () => {
    const { dialog } = await openModal([alert({ areas: "", instruction: "" })]);
    expect(within(dialog).getByText(/Gusts of 60 to 70 mph/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Secure loose objects/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Greater London")).not.toBeInTheDocument();
  });

  it("preserves the hard line breaks in a multi-paragraph desc", async () => {
    const desc = "* WHAT...Damaging winds.\n\n* WHERE...Central Kansas.\n\n* WHEN...Until 9 PM.";
    const { dialog } = await openModal([alert({ desc })]);
    const body = within(dialog).getByText(/WHAT\.\.\.Damaging winds/);
    expect(body).toHaveTextContent("WHERE...Central Kansas");
    expect(body).toHaveClass("whitespace-pre-line");
  });

  it("closes on Escape and returns focus to the row", async () => {
    const { user } = await openModal(mixed);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveFocus();
  });

  it("carries the night class so the portalled panel is not stuck in the day cascade", async () => {
    const user = userEvent.setup();
    renderCard(mixed, true);
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("dialog")).toHaveClass("night");
  });
});
