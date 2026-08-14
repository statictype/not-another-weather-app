import { HttpResponse, http } from "msw";

export const handlers = [
  http.get("/api/weather", () => {
    return HttpResponse.json({
      stub: true,
      message: "msw default handler",
    });
  }),
];
