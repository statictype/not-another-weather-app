import { describe, expect, it } from "vitest";
import { foldAscii, restoreFromQuery, upstreamQuery } from "./fold";

describe("foldAscii", () => {
  it.each([
    ["tromsø", "tromso"],
    ["malmö", "malmo"],
    ["münchen", "munchen"],
    ["medellín", "medellin"],
    ["łódź", "lodz"],
    ["reykjavík", "reykjavik"],
    ["kraków", "krakow"],
    ["são paulo", "sao paulo"],
    ["córdoba", "cordoba"],
    ["Ålesund", "Alesund"],
    ["Đà Nẵng", "Da Nang"],
  ])("folds %s to %s", (input, expected) => {
    expect(foldAscii(input)).toBe(expected);
  });

  it("leaves ASCII alone", () => {
    expect(foldAscii("new york, usa")).toBe("new york, usa");
  });

  it("expands the letters NFD does not decompose", () => {
    expect(foldAscii("straße")).toBe("strasse");
    expect(foldAscii("ærø")).toBe("aero");
  });
});

describe("upstreamQuery", () => {
  it.each(["tromsø, norway", "malmö sweden", "münchen, germany"])(
    "folds %s — upstream matches a multi-token query on its ASCII tail",
    (query) => {
      expect(upstreamQuery(query)).toBe(foldAscii(query));
    },
  );

  it.each(["münchen", "tromsø", "medellín"])(
    "leaves the lone token %s accented — folding it can miss the record",
    (query) => {
      expect(upstreamQuery(query)).toBe(query);
    },
  );

  it("passes ASCII through in either shape", () => {
    expect(upstreamQuery("london")).toBe("london");
    expect(upstreamQuery("new york, usa")).toBe("new york, usa");
  });
});

describe("restoreFromQuery", () => {
  it.each([
    ["Tromso", "tromsø, norway", "Tromsø"],
    ["Malmo", "malmö, sweden", "Malmö"],
    ["Munchen", "münchen, germany", "München"],
    ["Medellin", "medellin, colombia", "Medellin"],
    ["Medellin", "medellín, colombia", "Medellín"],
    ["Lodz", "łódź", "Łódź"],
    ["Sao Paulo", "são paulo, brazil", "São Paulo"],
    ["Cordoba", "córdoba, argentina", "Córdoba"],
  ])("reads %s as %s given the query %s", (name, query, expected) => {
    expect(restoreFromQuery(name, query)).toBe(expected);
  });

  it("keeps the case upstream sent, not the case the viewer typed", () => {
    expect(restoreFromQuery("Tromso", "TROMSØ")).toBe("Tromsø");
    expect(restoreFromQuery("TROMSO", "tromsø")).toBe("TROMSØ");
  });

  it("leaves a name the query does not spell", () => {
    expect(restoreFromQuery("Oslo", "tromsø, norway")).toBe("Oslo");
    expect(restoreFromQuery("Norway", "tromsø, norway")).toBe("Norway");
  });

  it("does not accent a longer name the query only prefixes", () => {
    expect(restoreFromQuery("Malmoral", "malmö")).toBe("Malmoral");
  });

  it("never strips an accent upstream already sent", () => {
    expect(restoreFromQuery("München", "munchen, germany")).toBe("München");
    expect(restoreFromQuery("Tromsø", "tromso")).toBe("Tromsø");
  });
});
